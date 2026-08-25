import { and, asc, count, eq, sql } from 'drizzle-orm'

import { db } from '../../db/index'
import { userWords, words } from '../../db/schema'
import type {
  Level,
  VocabularyFilterLevel,
  VocabularyItem,
  VocabularyPage,
} from '../../lib/types'
import { toWord } from '../words/words'

export const VOCABULARY_PAGE_SIZE = 6

export function matchesVocabularyQuery(word: string, query: string): boolean {
  return word.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())
}

export function getVocabularyPageWindow(
  total: number,
  requestedPage: number,
  pageSize = VOCABULARY_PAGE_SIZE,
) {
  const totalPages = Math.ceil(total / pageSize)
  const page = totalPages === 0 ? 1 : Math.min(requestedPage, totalPages)

  return {
    page,
    pageSize,
    totalPages,
    offset: (page - 1) * pageSize,
  }
}

export async function getVocabularyPage(
  userId: number,
  input: {
    query: string
    level: VocabularyFilterLevel
    page: number
  },
): Promise<VocabularyPage> {
  const filters = []
  const query = input.query.trim().toLocaleLowerCase()

  if (query.length > 0) {
    // instr() gives us a literal substring search without LIKE wildcards.
    filters.push(sql`instr(lower(${words.word}), ${query}) > 0`)
  }
  if (input.level !== 'all') {
    filters.push(eq(words.level, input.level))
  }

  const where = filters.length > 0 ? and(...filters) : undefined
  const totalRow = await db
    .select({ count: count() })
    .from(words)
    .where(where)
    .get()
  const total = Number(totalRow?.count ?? 0)
  const window = getVocabularyPageWindow(total, input.page)

  const rows = await db
    .select({
      id: words.id,
      word: words.word,
      level: words.level,
      kind: words.kind,
      definition: words.definition,
      indonesia: words.indonesia,
      sentenceExample: words.sentenceExample,
      memorizedAt: userWords.memorizedAt,
    })
    .from(words)
    .leftJoin(
      userWords,
      and(eq(userWords.wordId, words.id), eq(userWords.userId, userId)),
    )
    .where(where)
    .orderBy(asc(sql`lower(${words.word})`), asc(words.level), asc(words.id))
    .limit(window.pageSize)
    .offset(window.offset)
    .all()

  const items: VocabularyItem[] = rows.map((row) => {
    const word = toWord({
      id: row.id,
      word: row.word,
      level: row.level,
      kind: row.kind,
      definition: row.definition,
      indonesia: row.indonesia,
      sentenceExample: row.sentenceExample,
    })
    const memorized = row.memorizedAt !== null

    return {
      ...word,
      memorized,
      ...(memorized ? { memorizedAt: row.memorizedAt! } : {}),
    }
  })

  return {
    items,
    total,
    page: window.page,
    pageSize: window.pageSize,
    totalPages: window.totalPages,
  }
}

export function isVocabularyLevel(value: unknown): value is Level {
  return (
    value === 'A1' ||
    value === 'A2' ||
    value === 'B1' ||
    value === 'B2' ||
    value === 'C1'
  )
}
