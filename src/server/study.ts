import { and, eq } from 'drizzle-orm'

import { db } from '../db/index'
import { dailyWords, userWords, words } from '../db/schema'
import { displayWord } from '../lib/word'
import { validateSentence } from './sentence-validator.server'
import {
  awardXp,
  bumpStreak,
  getOrCreateStats,
  todayKey,
  unlockEligibleBadges,
  XP_DAILY_COMPLETE,
  XP_NEW_WORD,
} from './gamification'

/**
 * Validates a user's sentence and — on success — closes the card:
 * marks the word memorized, awards XP, updates the streak and badges.
 */
export type StudyResult =
  | { pass: false; reason?: string; correction?: string }
  | {
      pass: true
      reason?: string
      correction?: string
      xpEarned: number
      totalXp: number
      level: number
      streak: number
      isDaily: boolean
      displayWord: string
      newlyBadges: string[]
    }

export async function studyValidateSentence(input: {
  userId: number
  wordId: number
  sentence: string
  kind: 'daily' | 'extra'
}): Promise<StudyResult> {
  const { userId, wordId, sentence, kind } = input

  const word = await db.select().from(words).where(eq(words.id, wordId)).get()
  if (!word) return { pass: false, reason: 'Word not found.' }

  const result = await validateSentence({
    word: word.word,
    sentence,
    definition: word.definition,
    level: word.level,
    kind: word.kind,
  })
  if (!result.pass) {
    return {
      pass: false,
      reason: result.reason,
      correction: result.correction,
    }
  }

  const date = todayKey()
  const now = Date.now()
  const existing = await db
    .select()
    .from(userWords)
    .where(and(eq(userWords.userId, userId), eq(userWords.wordId, wordId)))
    .get()

  let freshlyMemorized = false
  if (!existing) {
    await db
      .insert(userWords)
      .values({
        userId,
        wordId,
        memorizedAt: now,
        userSentence: sentence.trim(),
        xpEarned: XP_NEW_WORD,
        reviewCount: 0,
      })
      .run()
    freshlyMemorized = true
  } else {
    // Re-confirming an already-memorized word: keep the original sentence/XP.
    freshlyMemorized = false
  }

  // Mark the daily/extra record as memorized.
  await db
    .insert(dailyWords)
    .values({
      userId,
      wordId,
      date,
      kind: kind === 'daily' ? 'daily' : 'extra',
      status: 'memorized',
      createdAt: now,
    })
    .onConflictDoUpdate({
      target: [dailyWords.userId, dailyWords.date, dailyWords.wordId],
      set: { status: 'memorized' },
    })
    .run()

  // XP: +10 new word (+20 daily completion when this is today's daily word).
  let xpEarned = 0
  let isDaily = false
  if (freshlyMemorized) xpEarned += XP_NEW_WORD
  if (kind === 'daily') {
    isDaily = true
    xpEarned += XP_DAILY_COMPLETE
  }

  if (xpEarned > 0) {
    await awardXp(userId, xpEarned)
  }
  await bumpStreak(userId, date)
  const newlyBadges = await unlockEligibleBadges(userId)

  const stats = await getOrCreateStats(userId)

  return {
    pass: true,
    reason: result.reason,
    correction: result.correction,
    xpEarned,
    totalXp: stats.xp,
    level: stats.level,
    streak: stats.streak,
    isDaily,
    displayWord: displayWord(word.word),
    newlyBadges,
  }
}
