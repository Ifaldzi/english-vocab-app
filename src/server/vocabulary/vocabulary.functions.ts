import { createServerFn } from '@tanstack/react-start'

import type {
  VocabularyFilterKind,
  VocabularyFilterLevel,
} from '../../lib/types'
import { authMiddleware } from '../auth/auth-middleware'
import {
  getVocabularyPage,
  isVocabularyKind,
  isVocabularyLevel,
} from './vocabulary'

export const getVocabularyFn = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .validator((input: unknown) => {
    const { query, level, kind, page } = input as {
      query?: unknown
      level?: unknown
      kind?: unknown
      page?: unknown
    }
    const normalizedLevel: VocabularyFilterLevel | null =
      level === 'all' ? 'all' : isVocabularyLevel(level) ? level : null
    const normalizedKind: VocabularyFilterKind | null =
      kind === 'all' ? 'all' : isVocabularyKind(kind) ? kind : null

    if (
      typeof query !== 'string' ||
      query.length > 100 ||
      typeof page !== 'number' ||
      !Number.isInteger(page) ||
      page < 1 ||
      normalizedLevel === null ||
      normalizedKind === null
    ) {
      throw new Error('Invalid vocabulary query')
    }

    return {
      query: query.trim(),
      level: normalizedLevel,
      kind: normalizedKind,
      page,
    }
  })
  .handler(async ({ context, data }) => {
    return getVocabularyPage(context.user.id, data)
  })
