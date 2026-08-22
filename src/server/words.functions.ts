import { createServerFn } from '@tanstack/react-start'
import { eq } from 'drizzle-orm'

import { db } from '../db/index'
import { words } from '../db/schema'
import { authMiddleware } from './auth-middleware'
import { getDailyWordForUser, getExtraWordForUser } from './words'
import { validateSentence } from './validate'
import { todayKey } from './gamification'
import type { Word } from '../lib/types'

/** Returns today's selected word (or null if the pool is exhausted). */
export const getDailyWordFn = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const result = await getDailyWordForUser(context.user.id, todayKey())
    if (!result) return null
    return result
  })

export type ExtraWordResult =
  { word: Word; status: 'shown' } | { error: string }

/** Requests an additional word for today (FR-4/FR-5). Unlimited per day. */
export const getExtraWordFn = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<ExtraWordResult> => {
    const today = todayKey()

    const picked = await getExtraWordForUser(context.user.id, today)
    if (!picked) {
      return { error: 'No more words available.' }
    }

    return { word: picked, status: 'shown' as const }
  })

/** Validates a user sentence against the daily word (FR-3/FR-5). */
export const validateSentenceFn = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .validator((input: unknown) => {
    const { sentence, wordId } = input as {
      sentence?: unknown
      wordId?: unknown
    }
    if (typeof sentence !== 'string' || typeof wordId !== 'number') {
      throw new Error('Invalid input')
    }
    return { sentence: sentence.slice(0, 500), wordId }
  })
  .handler(async ({ data }) => {
    const word = await db
      .select()
      .from(words)
      .where(eq(words.id, data.wordId))
      .get()
    if (!word) throw new Error('Word not found')

    const result = validateSentence(word.word, data.sentence)
    return { ...result, wordId: data.wordId }
  })
