import { createServerFn } from '@tanstack/react-start'

import { authMiddleware } from '../auth/auth-middleware'
import { studyValidateSentence } from './study'

/**
 * Validates the user's sentence and closes the card on success:
 * marks the word memorized, awards XP, updates streak/badges (FR-3/FR-5).
 */
export const submitSentenceFn = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .validator((input: unknown) => {
    const { wordId, sentence, kind } = input as {
      wordId?: unknown
      sentence?: unknown
      kind?: unknown
    }
    if (
      typeof wordId !== 'number' ||
      typeof sentence !== 'string' ||
      (kind !== 'daily' && kind !== 'extra')
    ) {
      throw new Error('Invalid input')
    }
    const kindValue: 'daily' | 'extra' = kind
    return {
      wordId,
      sentence: sentence.slice(0, 500),
      kind: kindValue,
    }
  })
  .handler(async ({ context, data }) => {
    return studyValidateSentence({
      userId: context.user.id,
      wordId: data.wordId,
      sentence: data.sentence,
      kind: data.kind,
    })
  })
