import webpush from 'web-push'

import type { pushSubscriptions } from '../../db/schema'

export type PushSubscriptionRow = typeof pushSubscriptions.$inferSelect

/**
 * Returns the configured VAPID public key, or null when push is not
 * configured (no private key). Server-only: the private key never leaves the
 * process and is never exposed to the client.
 */
export function getVapidPublicKey(): string | null {
  const configured =
    process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY
  return configured ? (process.env.VAPID_PUBLIC_KEY as string) : null
}

export interface SendPushInput {
  sub: PushSubscriptionRow
  title: string
  body: string
  url: string
  tz: string
}

export type SendPushResult = 'sent' | 'gone' | 'throttled' | 'failed'

/**
 * Sends one push notification to a single subscription. A `404`/`410`
 * response means the subscription is dead (device unsubscribed or expired)
 * and the caller should drop it. Returns a coarse status for the caller.
 */
export async function sendPush(input: SendPushInput): Promise<SendPushResult> {
  const { VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY } = process.env
  if (!VAPID_SUBJECT || !VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return 'failed'

  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)

  const payload = JSON.stringify({
    title: input.title,
    body: input.body,
    data: { url: input.url },
  })

  try {
    await webpush.sendNotification(
      {
        endpoint: input.sub.endpoint,
        keys: { p256dh: input.sub.p256dh, auth: input.sub.auth },
      },
      payload,
      { TTL: 60 * 60, urgency: 'high' },
    )
    return 'sent'
  } catch (err) {
    if (err instanceof webpush.WebPushError) {
      if (err.statusCode === 404 || err.statusCode === 410) return 'gone'
      if (err.statusCode === 429) return 'throttled'
      return 'failed'
    }
    return 'failed'
  }
}
