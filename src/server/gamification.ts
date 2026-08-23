import { and, count, eq } from 'drizzle-orm'

import { db } from '../db/index'
import { userBadges, userStats, userWords, words } from '../db/schema'

export const XP_NEW_WORD = 10
export const XP_REVIEW = 5
export const XP_DAILY_COMPLETE = 20
export const TOTAL_WORDS = 3306

/** Level N requires total XP of 50 × N × (N−1) / 2 (cumulative threshold). */
export function levelFromXp(xp: number): number {
  // Solve 50*N*(N-1)/2 <= xp  →  N(N-1) <= xp/25
  // N ≈ (1 + sqrt(1 + 4*xp/25)) / 2
  const n = Math.floor((1 + Math.sqrt(1 + (4 * xp) / 25)) / 2)
  return Math.max(1, n)
}

/** Total XP required to reach level N. */
export function xpForLevel(level: number): number {
  return (50 * level * (level - 1)) / 2
}

export function xpForNextLevel(level: number): number {
  return xpForLevel(level + 1)
}

export function levelTitle(level: number): string {
  if (level >= 35) return 'Lexicon Master'
  if (level >= 20) return 'Wordwright'
  if (level >= 10) return 'Scholar'
  if (level >= 5) return 'Apprentice'
  return 'Novice'
}

/** "Today" key in the app timezone (YYYY-MM-DD), default Asia/Jakarta. */
export function todayKey(now = new Date()): string {
  const tz = process.env.APP_TIMEZONE ?? 'Asia/Jakarta'
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
}

export function yesterdayKey(): string {
  const tz = process.env.APP_TIMEZONE ?? 'Asia/Jakarta'
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  // Compute "now" minus one day using the app timezone offset, then format.
  const now = new Date()
  const offset =
    new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      timeZoneName: 'shortOffset',
    })
      .formatToParts(now)
      .find((p) => p.type === 'timeZoneName')?.value ?? 'GMT+7'
  const sign = offset.startsWith('GMT+')
    ? 1
    : offset.startsWith('GMT-')
      ? -1
      : 0
  const hours = sign === 0 ? 7 : Number(offset.replace(/GMT[+-]/, '')) || 0
  const tzMs = now.getTime() + hours * 60 * 60 * 1000
  const shifted = new Date(tzMs - 24 * 60 * 60 * 1000)
  return formatter.format(shifted)
}

export interface StatsSnapshot {
  xp: number
  level: number
  streak: number
  longestStreak: number
}

/** Returns the user_stats row, creating it if needed. */
export async function getOrCreateStats(userId: number) {
  let stats = await db
    .select()
    .from(userStats)
    .where(eq(userStats.userId, userId))
    .get()

  if (!stats) {
    await db.insert(userStats).values({ userId }).run()
    stats = await db
      .select()
      .from(userStats)
      .where(eq(userStats.userId, userId))
      .get()
  }
  return stats!
}

export async function getMemorizedCount(userId: number): Promise<number> {
  const row = await db
    .select({ count: count() })
    .from(userWords)
    .where(eq(userWords.userId, userId))
    .get()
  return Number(row?.count ?? 0)
}

export async function getReviewTotal(userId: number): Promise<number> {
  const row = await db
    .select({ total: count() })
    .from(userWords)
    .where(eq(userWords.userId, userId))
    .get()
  return Number(row?.total ?? 0)
}

/**
 * Award XP, recompute level, update streak + longest streak.
 * Returns updated snapshot. Call after a word is memorized or reviewed.
 */
export async function awardXp(userId: number, amount: number) {
  const stats = await getOrCreateStats(userId)
  const newXp = stats.xp + amount
  const level = levelFromXp(newXp)
  await db
    .update(userStats)
    .set({ xp: newXp, level })
    .where(eq(userStats.userId, userId))
    .run()
  return { ...stats, xp: newXp, level }
}

/** Increment the daily streak if today hasn't been counted yet. */
export async function bumpStreak(userId: number, date: string) {
  const stats = await getOrCreateStats(userId)
  let streak = stats.streak
  let longest = stats.longestStreak

  if (stats.lastActiveDate === date) {
    // Already counted today; nothing to do.
  } else if (stats.lastActiveDate === yesterdayKey()) {
    streak += 1
  } else {
    streak = 1
  }

  if (streak > longest) longest = streak

  await db
    .update(userStats)
    .set({ streak, longestStreak: longest, lastActiveDate: date })
    .where(eq(userStats.userId, userId))
    .run()

  return { streak, longestStreak: longest }
}

/**
 * Evaluates badge eligibility from current stats and unlocks any newly
 * earned badges. Returns the codes of newly unlocked badges.
 */
export async function unlockEligibleBadges(userId: number) {
  const memorized = await getMemorizedCount(userId)
  const reviewCorrect = await getReviewCorrectCount(userId)
  const stats = await getOrCreateStats(userId)
  const totalWords = await getTotalWords()

  const unlocked = new Set(
    (
      await db
        .select({ code: userBadges.badgeCode })
        .from(userBadges)
        .where(eq(userBadges.userId, userId))
    ).map((r) => r.code),
  )

  const check: Record<string, boolean> = {
    first_steps: memorized >= 1,
    building_blocks: memorized >= 25,
    half_century: memorized >= 50,
    century: memorized >= 100,
    climbing: memorized >= 250,
    half_the_deck: memorized >= 500,
    one_thousand: memorized >= 1000,
    full_deck: memorized >= totalWords,
    streak_3: stats.streak >= 3,
    week_warrior: stats.streak >= 7,
    monthly_devotion: stats.streak >= 30,
    review_master: reviewCorrect >= 50,
    level_5: stats.level >= 5,
    level_10: stats.level >= 10,
    level_20: stats.level >= 20,
  }

  const newly: string[] = []
  const now = Date.now()
  for (const [code, earned] of Object.entries(check)) {
    if (earned && !unlocked.has(code)) {
      await db
        .insert(userBadges)
        .values({ userId, badgeCode: code, unlockedAt: now })
        .run()
      newly.push(code)
    }
  }
  return newly
}

async function getReviewCorrectCount(userId: number): Promise<number> {
  const rows = await db
    .select({ count: userWords.reviewCount })
    .from(userWords)
    .where(eq(userWords.userId, userId))
  return rows.reduce((sum, r) => sum + r.count, 0)
}

async function getTotalWords(): Promise<number> {
  const row = await db
    .select({ count: count() })
    .from(words)
    .get()
  return Number(row?.count ?? TOTAL_WORDS)
}

export { and, eq, words, userStats, userWords, userBadges, db }
