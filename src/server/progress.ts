import { count, desc, eq } from 'drizzle-orm'

import { db } from '../db/index'
import { badges, dailyWords, userBadges, userWords, words } from '../db/schema'
import { displayWord } from '../lib/word'
import type { ActivityItem, BadgeView, Level } from '../lib/types'
import {
  getOrCreateStats,
  levelFromXp,
  levelTitle,
  xpForNextLevel,
} from './gamification'

export const LEVELS: Level[] = ['A1', 'A2', 'B1', 'B2']

export async function getCefrBreakdown(userId: number) {
  const rows = await db
    .select({ level: words.level })
    .from(userWords)
    .innerJoin(words, eq(words.id, userWords.wordId))
    .where(eq(userWords.userId, userId))
    .all()

  const counts: Record<string, number> = { A1: 0, A2: 0, B1: 0, B2: 0 }
  for (const r of rows) {
    if (r.level in counts) counts[r.level]++
  }
  return LEVELS.map((level) => ({ level, count: counts[level] }))
}

export async function getTotalWords(): Promise<number> {
  const row = await db
    .select({ count: count() })
    .from(words)
    .get()
  return Number(row?.count ?? 0)
}

/** Total word count per CEFR level (for the vocabulary breakdown bars). */
export async function getCefrTotals(): Promise<
  { level: Level; total: number }[]
> {
  const rows = await db.select({ level: words.level }).from(words).all()
  const totals: Record<string, number> = { A1: 0, A2: 0, B1: 0, B2: 0 }
  for (const r of rows) {
    if (r.level in totals) totals[r.level]++
  }
  return LEVELS.map((level) => ({ level, total: totals[level] ?? 0 }))
}

export async function getRecentActivity(
  userId: number,
  limit = 10,
): Promise<ActivityItem[]> {
  const daily = await db
    .select({
      id: dailyWords.id,
      kind: dailyWords.kind,
      status: dailyWords.status,
      createdAt: dailyWords.createdAt,
      word: words.word,
    })
    .from(dailyWords)
    .innerJoin(words, eq(words.id, dailyWords.wordId))
    .where(eq(dailyWords.userId, userId))
    .orderBy(desc(dailyWords.createdAt))
    .limit(Math.floor(limit * 1.5))

  const badgeEarned = await db
    .select({
      id: userBadges.id,
      badgeCode: userBadges.badgeCode,
      unlockedAt: userBadges.unlockedAt,
      name: badges.name,
    })
    .from(userBadges)
    .innerJoin(badges, eq(badges.code, userBadges.badgeCode))
    .where(eq(userBadges.userId, userId))
    .orderBy(desc(userBadges.unlockedAt))
    .limit(Math.floor(limit * 0.5))

  // Only surface words the user actually completed: daily/extra rows count
  // only when the sentence passed (status='memorized'); review attempts are
  // real events regardless of correct/incorrect.
  const items: ActivityItem[] = [
    ...daily
      .filter((r) => r.kind === 'review' || r.status === 'memorized')
      .map((r): ActivityItem => ({
        id: `d${r.id}`,
        kind: r.kind === 'review' ? 'reviewed' : 'memorized',
        word: displayWord(r.word),
        at: r.createdAt,
        status: r.status as 'memorized' | 'failed',
      })),
    ...badgeEarned.map((b): ActivityItem => ({
      id: `b${b.id}`,
      kind: 'badge',
      badgeName: b.name,
      at: b.unlockedAt,
    })),
  ]

  // Merge, sort desc by time, keep the newest `limit`.
  return items.sort((a, b) => b.at - a.at).slice(0, limit)
}

export async function getBadges(userId: number): Promise<BadgeView[]> {
  const all = await db.select().from(badges).all()
  const unlocked = await db
    .select({
      badgeCode: userBadges.badgeCode,
      unlockedAt: userBadges.unlockedAt,
    })
    .from(userBadges)
    .where(eq(userBadges.userId, userId))
    .all()

  const map = new Map(unlocked.map((u) => [u.badgeCode, u.unlockedAt]))
  return all.map((b) => ({
    code: b.code,
    name: b.name,
    description: b.description,
    unlocked: map.has(b.code),
    unlockedAt: map.get(b.code),
  }))
}

export async function getMemorizedTotal(userId: number): Promise<number> {
  const row = await db
    .select({ count: count() })
    .from(userWords)
    .where(eq(userWords.userId, userId))
    .get()
  return Number(row?.count ?? 0)
}

export async function getStatsView(userId: number) {
  const stats = await getOrCreateStats(userId)
  const xpToNext = Math.max(0, xpForNextLevel(stats.level) - stats.xp)
  return {
    xp: stats.xp,
    level: stats.level,
    streak: stats.streak,
    longestStreak: stats.longestStreak,
    levelTitle: levelTitle(stats.level),
    xpToNext,
  }
}

export { levelFromXp, levelTitle, xpForNextLevel }
