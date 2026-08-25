import { and, eq } from 'drizzle-orm'

import { db } from '../db/index'
import { dailyWords, userWords, words } from '../db/schema'
import type { Level } from '../lib/types'
import { todayKey } from './gamification'

export type WordRow = typeof words.$inferSelect

export function toWord(row: WordRow) {
  return {
    id: row.id,
    word: row.word,
    level: row.level as Level,
    kind: row.kind,
    definition: row.definition,
    indonesia: row.indonesia,
    sentenceExample: row.sentenceExample,
  }
}

/** FR-2.2 selection algorithm. */
export async function pickWordForUser(userId: number, date: string) {
  const shownToday = (
    await db
      .select({ wordId: dailyWords.wordId })
      .from(dailyWords)
      .where(and(eq(dailyWords.userId, userId), eq(dailyWords.date, date)))
  ).map((r) => r.wordId)

  const memorizedIds = (
    await db
      .select({ wordId: userWords.wordId })
      .from(userWords)
      .where(eq(userWords.userId, userId))
  ).map((r) => r.wordId)

  const allWords = await db.select().from(words)
  const newPool = allWords.filter(
    (w) => !memorizedIds.includes(w.id) && !shownToday.includes(w.id),
  )
  const recallPool = allWords.filter(
    (w) => memorizedIds.includes(w.id) && !shownToday.includes(w.id),
  )

  // Soft-avoid yesterday's daily word.
  const prevDate = yesterday(date)
  const yesterdayWord = await db
    .select({ wordId: dailyWords.wordId })
    .from(dailyWords)
    .where(
      and(
        eq(dailyWords.userId, userId),
        eq(dailyWords.date, prevDate),
        eq(dailyWords.kind, 'daily'),
      ),
    )
    .get()

  const recallRatio = Number(process.env.RECALL_PROBABILITY ?? 0.1)

  const pool = chooseFromPools(newPool, recallPool, recallRatio)

  if (pool.length === 0) return null

  // Soft-avoid repeating yesterday's daily word.
  let candidates = pool
  if (pool.length > 1 && yesterdayWord) {
    const filtered = pool.filter((w) => w.id !== yesterdayWord.wordId)
    if (filtered.length > 0) candidates = filtered
  }

  const pick = candidates[Math.floor(Math.random() * candidates.length)]
  return toWord(pick)
}

/**
 * Picks which pool to draw from (FR-2.2): with `recallRatio` probability the
 * recall pool, otherwise the new pool; recall-only when the new pool is empty.
 * Returns the chosen pool (or an empty array when nothing remains).
 */
export function chooseFromPools<T>(
  newPool: T[],
  recallPool: T[],
  recallRatio: number,
): T[] {
  if (newPool.length === 0) return recallPool
  if (recallPool.length > 0 && Math.random() < recallRatio) return recallPool
  return newPool
}

function yesterday(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d) - 24 * 60 * 60 * 1000)
  return dt.toISOString().slice(0, 10)
}

export async function recordShown(
  userId: number,
  wordId: number,
  date: string,
  kind: 'daily' | 'extra',
) {
  await db
    .insert(dailyWords)
    .values({
      userId,
      wordId,
      date,
      kind,
      status: 'shown',
      createdAt: Date.now(),
    })
    .onConflictDoNothing()
    .run()
}

export async function getDailyWordForUser(userId: number, date: string) {
  const existing = await db
    .select()
    .from(dailyWords)
    .innerJoin(words, eq(words.id, dailyWords.wordId))
    .where(
      and(
        eq(dailyWords.userId, userId),
        eq(dailyWords.date, date),
        eq(dailyWords.kind, 'daily'),
      ),
    )
    .get()

  if (existing) {
    return {
      word: toWord(existing.words),
      status: existing.daily_words.status as 'shown' | 'memorized' | 'failed',
    }
  }

  const picked = await pickWordForUser(userId, date)
  if (!picked) return null

  await recordShown(userId, picked.id, date, 'daily')
  return { word: picked, status: 'shown' as const }
}

export async function getExtraWordForUser(userId: number, date: string) {
  const picked = await pickWordForUser(userId, date)
  if (!picked) return null
  await recordShown(userId, picked.id, date, 'extra')
  return picked
}

export { todayKey }
