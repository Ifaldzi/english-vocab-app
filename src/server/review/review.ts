import { and, asc, eq, notInArray } from 'drizzle-orm'

import { db } from '../../db/index'
import { dailyWords, userWords, words } from '../../db/schema'
import {
  awardXp,
  getOrCreateStats,
  todayKey,
  unlockEligibleBadges,
  XP_REVIEW,
} from '../gamification/gamification'

export interface ReviewQuestionPayload {
  wordId: number
  word: string
  level: string
  kind: string
  options: string[]
  correctDefinition: string
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/**
 * Builds the 4 MCQ options for a word (FR-6.2): the correct definition plus
 * 3 distractors, preferring the word's own CEFR level and falling back to any
 * level when the same-level pool is small. Options are deduplicated/shuffled.
 */
export function buildOptions(
  correctDefinition: string,
  sameLevelDefinitions: string[],
  anyLevelDefinitions: string[],
): string[] {
  const distractors = new Set<string>()
  for (const d of shuffle(sameLevelDefinitions)) {
    if (d !== correctDefinition) distractors.add(d)
    if (distractors.size >= 3) break
  }
  if (distractors.size < 3) {
    for (const d of shuffle(anyLevelDefinitions)) {
      if (d !== correctDefinition) distractors.add(d)
      if (distractors.size >= 3) break
    }
  }

  return shuffle([correctDefinition, ...distractors])
}

/**
 * Selects the next review question (FR-6).
 * Words are served longest-since-last-review first (NULLs first via `asc`);
 * already-answered words of the current session are excluded via
 * `excludedWordIds`.
 */
export async function getNextReviewQuestion(
  userId: number,
  excludedWordIds: number[],
): Promise<ReviewQuestionPayload | null> {
  const candidate = await db
    .select({ wordId: userWords.wordId })
    .from(userWords)
    .where(
      and(
        eq(userWords.userId, userId),
        excludedWordIds.length > 0
          ? notInArray(userWords.wordId, excludedWordIds)
          : undefined,
      ),
    )
    .orderBy(asc(userWords.lastReviewedAt))
    .limit(1)
    .get()

  if (!candidate) return null

  const word = await db
    .select()
    .from(words)
    .where(eq(words.id, candidate.wordId))
    .get()
  if (!word) return null

  // Distractors: prefer same CEFR level, fall back to any level.
  const sameLevel = await db
    .select({ definition: words.definition })
    .from(words)
    .where(and(eq(words.level, word.level), notInArray(words.id, [word.id])))
    .limit(200)
    .all()

  const anyLevel = await db
    .select({ definition: words.definition })
    .from(words)
    .where(notInArray(words.id, [word.id]))
    .limit(400)
    .all()

  const options = buildOptions(
    word.definition,
    sameLevel.map((d) => d.definition),
    anyLevel.map((d) => d.definition),
  )

  return {
    wordId: word.id,
    word: word.word,
    level: word.level,
    kind: word.kind,
    options,
    correctDefinition: word.definition,
  }
}

/**
 * Records a review attempt (FR-6.3/FR-6.5). Correct answers award +5 XP,
 * increment review_count and last_reviewed_at. Every attempt is recorded in
 * daily_words with kind='review'.
 */
export async function submitReviewAnswer(input: {
  userId: number
  wordId: number
  chosenDefinition: string
}) {
  const { userId, wordId, chosenDefinition } = input
  const date = todayKey()
  const now = Date.now()

  const word = await db.select().from(words).where(eq(words.id, wordId)).get()
  if (!word) throw new Error('Word not found')

  const uw = await db
    .select()
    .from(userWords)
    .where(and(eq(userWords.userId, userId), eq(userWords.wordId, wordId)))
    .get()

  const correct = chosenDefinition.trim() === word.definition.trim()

  // Record the attempt in daily_words.
  await db
    .insert(dailyWords)
    .values({
      userId,
      wordId,
      date,
      kind: 'review',
      status: correct ? 'memorized' : 'failed',
      createdAt: now,
    })
    .onConflictDoUpdate({
      target: [dailyWords.userId, dailyWords.date, dailyWords.wordId],
      set: { status: correct ? 'memorized' : 'failed' },
    })
    .run()

  let xpEarned = 0
  let reviewCount = uw?.reviewCount ?? 0

  if (correct && uw) {
    reviewCount += 1
    await db
      .update(userWords)
      .set({ reviewCount, lastReviewedAt: now })
      .where(eq(userWords.id, uw.id))
      .run()
    xpEarned += XP_REVIEW
    await awardXp(userId, xpEarned)
  }

  const newlyBadges = await unlockEligibleBadges(userId)
  const stats = await getOrCreateStats(userId)

  return {
    correct,
    xpEarned,
    correctDefinition: word.definition,
    reviewCount,
    totalXp: stats.xp,
    level: stats.level,
    newlyBadges,
  }
}
