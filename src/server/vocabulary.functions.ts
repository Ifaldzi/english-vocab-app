import { createServerFn } from '@tanstack/react-start'

import type { VocabularyFilterLevel } from '../lib/types'
import { authMiddleware } from './auth-middleware'
import { getVocabularyPage, isVocabularyLevel } from './vocabulary'

export const getVocabularyFn = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .validator((input: unknown) => {
    const { query, level, page } = input as {
      query?: unknown
      level?: unknown
      page?: unknown
    }
    const normalizedLevel: VocabularyFilterLevel | null =
      level === 'all' ? 'all' : isVocabularyLevel(level) ? level : null

    if (
      typeof query !== 'string' ||
      query.length > 100 ||
      typeof page !== 'number' ||
      !Number.isInteger(page) ||
      page < 1 ||
      normalizedLevel === null
    ) {
      throw new Error('Invalid vocabulary query')
    }

    return {
      query: query.trim(),
      level: normalizedLevel,
      page,
    }
  })
  .handler(async ({ context, data }) => {
    return getVocabularyPage(context.user.id, data)
  })
