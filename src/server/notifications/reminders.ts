import { and, count, desc, eq } from 'drizzle-orm'

import { db } from '../../db/index'
import {
  dailyWords,
  pushDeliveries,
  pushSubscriptions,
  users,
} from '../../db/schema'
import { sendPush } from './sender'
import type { PushSubscriptionRow } from './sender'

export const REMINDER_TITLE = 'Vocab Deck'
export const REMINDER_BODY = "You haven't done today's Word of the Day yet."
export const REMINDER_URL = '/'
export const MAX_SUBSCRIPTIONS_PER_USER = 5

export interface TimeParts {
  date: string
  hour: number
  minute: number
}

/** "Today" key + clock time in the given IANA timezone (YYYY-MM-DD). */
export function timePartsInTz(now: Date, tz: string): TimeParts {
  const date = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
  const time = new Intl.DateTimeFormat('en-GB', {
    timeZone: tz,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(now)
  const hour = Number(time.find((p) => p.type === 'hour')?.value ?? '0')
  const minute = Number(time.find((p) => p.type === 'minute')?.value ?? '0')
  return { date, hour, minute }
}

/** True once the local clock reaches the reminder hour/minute. */
export function isDueForReminder(
  parts: TimeParts,
  hour: number,
  minute: number,
): boolean {
  return parts.hour > hour || (parts.hour === hour && parts.minute >= minute)
}

/** Subscription rows for a user, newest first. */
export async function listSubscriptions(
  userId: number,
): Promise<PushSubscriptionRow[]> {
  return db
    .select()
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.userId, userId))
    .orderBy(desc(pushSubscriptions.createdAt))
    .all()
}

export async function countSubscriptions(userId: number): Promise<number> {
  const row = await db
    .select({ count: count() })
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.userId, userId))
    .get()
  return Number(row?.count ?? 0)
}

/** Whether the user has already received a reminder for this date. */
export async function hasDelivery(
  userId: number,
  date: string,
): Promise<boolean> {
  const row = await db
    .select({ id: pushDeliveries.id })
    .from(pushDeliveries)
    .where(
      and(eq(pushDeliveries.userId, userId), eq(pushDeliveries.date, date)),
    )
    .get()
  return Boolean(row)
}

/** Set of user ids that have memorized today's daily word. */
export async function findUsersWhoCompletedDaily(
  date: string,
): Promise<Set<number>> {
  const rows = await db
    .select({ userId: dailyWords.userId })
    .from(dailyWords)
    .where(
      and(
        eq(dailyWords.date, date),
        eq(dailyWords.kind, 'daily'),
        eq(dailyWords.status, 'memorized'),
      ),
    )
  return new Set(rows.map((r) => r.userId))
}

/** All users that have at least one stored push subscription. */
export async function findSubscribedUserIds(): Promise<number[]> {
  const rows = db
    .select({ userId: pushSubscriptions.userId })
    .from(pushSubscriptions)
    .groupBy(pushSubscriptions.userId)
    .all()
  return rows.map((r) => r.userId)
}

/** Persist a delivery record so a user gets at most one reminder per day. */
export async function recordDelivery(userId: number, date: string) {
  await db
    .insert(pushDeliveries)
    .values({ userId, date, sentAt: Date.now() })
    .onConflictDoNothing()
    .run()
}

export interface UpsertSubscriptionInput {
  endpoint: string
  p256dh: string
  auth: string
}

/**
 * Store (or refresh) a user's push subscription. A user is capped at a few
 * devices; the oldest subscription is evicted when the cap is exceeded.
 * Returns true when a new row was created.
 */
export async function upsertSubscription(
  userId: number,
  input: UpsertSubscriptionInput,
): Promise<boolean> {
  const existing = await db
    .select({ id: pushSubscriptions.id })
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.endpoint, input.endpoint))
    .get()

  if (existing) {
    await db
      .update(pushSubscriptions)
      .set({ p256dh: input.p256dh, auth: input.auth })
      .where(eq(pushSubscriptions.id, existing.id))
      .run()
    return false
  }

  await db.insert(pushSubscriptions).values({
    userId,
    endpoint: input.endpoint,
    p256dh: input.p256dh,
    auth: input.auth,
    createdAt: Date.now(),
  })

  const subCount = await countSubscriptions(userId)
  if (subCount > MAX_SUBSCRIPTIONS_PER_USER) {
    const oldest = await db
      .select({ id: pushSubscriptions.id })
      .from(pushSubscriptions)
      .where(eq(pushSubscriptions.userId, userId))
      .orderBy(desc(pushSubscriptions.createdAt))
      .all()
    const toRemove = oldest.slice(MAX_SUBSCRIPTIONS_PER_USER)
    for (const row of toRemove) {
      await db
        .delete(pushSubscriptions)
        .where(eq(pushSubscriptions.id, row.id))
        .run()
    }
  }
  return true
}

export async function deleteSubscription(endpoint: string) {
  await db
    .delete(pushSubscriptions)
    .where(eq(pushSubscriptions.endpoint, endpoint))
    .run()
}

export interface DispatchResult {
  usersEligible: number
  deliveriesSent: number
  deadSubscriptionsRemoved: number
}

/**
 * Sends the daily reminder to every subscribed user who has not completed
 * today's daily word and has not already been reminded. One delivery per
 * user per day; returns a summary.
 */
export async function dispatchReminder(date: string): Promise<DispatchResult> {
  const completed = await findUsersWhoCompletedDaily(date)
  const userIds = await findSubscribedUserIds()

  const tz = process.env.APP_TIMEZONE ?? 'Asia/Jakarta'
  let deliveriesSent = 0
  let deadSubscriptionsRemoved = 0

  for (const userId of userIds) {
    if (completed.has(userId)) continue
    if (await hasDelivery(userId, date)) continue

    const subs = await listSubscriptions(userId)
    if (subs.length === 0) continue

    let deliveredAny = false
    for (const sub of subs) {
      const result = await sendPush({
        sub,
        title: REMINDER_TITLE,
        body: REMINDER_BODY,
        url: REMINDER_URL,
        tz,
      })
      if (result === 'sent') deliveredAny = true
      else if (result === 'gone') {
        deadSubscriptionsRemoved++
        await db
          .delete(pushSubscriptions)
          .where(eq(pushSubscriptions.id, sub.id))
          .run()
      }
    }

    if (deliveredAny) {
      await recordDelivery(userId, date)
      deliveriesSent++
    }
  }

  return {
    usersEligible: userIds.length,
    deliveriesSent,
    deadSubscriptionsRemoved,
  }
}

export { db, users }
