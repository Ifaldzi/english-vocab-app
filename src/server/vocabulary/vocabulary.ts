import { and, asc, count, eq, sql } from 'drizzle-orm'

import { db } from '../../db/index'
import { userWords, words } from '../../db/schema'
import type {
  Level,
  VocabularyFilterKind,
  VocabularyFilterLevel,
  VocabularyItem,
  VocabularyPage,
} from '../../lib/types'
import { toWord } from '../words/words'

export const VOCABULARY_PAGE_SIZE = 6

const VOCABULARY_KINDS: VocabularyFilterKind[] = [
  'n.',
  'v.',
  'adj.',
  'adv.',
  'pron.',
  'prep.',
  'conj.',
  'det.',
  'exclam.',
  'number',
  'modal v.',
]

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
    kind: VocabularyFilterKind
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
  if (input.kind !== 'all') {
    // Match the primary part of speech: the kind stored at the start of the
    // value, before any ',' or '/' combination separator (e.g. "n., v." or
    // "det./pron."). "modal v." must not match the plain "v." filter.
    const kind = input.kind.toLocaleLowerCase()
    filters.push(
      sql`(lower(${words.kind}) = ${kind} or instr(lower(${words.kind}), ${kind} || ',') = 1 or instr(lower(${words.kind}), ${kind} || '/') = 1)`,
    )
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
  return value === 'A1' || value === 'A2' || value === 'B1' || value === 'B2'
}

export function isVocabularyKind(value: unknown): value is VocabularyFilterKind {
  return VOCABULARY_KINDS.includes(value as VocabularyFilterKind)
}

/**
 * Mirrors the SQL kind predicate so the filter contract is unit-testable:
 * a word matches a kind filter when its stored kind starts with that exact
 * primary part of speech, optionally followed by ',' or '/' combinations.
 */
export function matchesVocabularyKind(kind: string, filter: string): boolean {
  const normalized = filter.trim().toLocaleLowerCase()
  const lower = kind.trim().toLocaleLowerCase()
  if (lower === normalized) return true
  return (
    lower.startsWith(`${normalized},`) || lower.startsWith(`${normalized}/`)
  )
}
