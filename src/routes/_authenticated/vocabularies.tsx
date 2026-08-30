import { useEffect, useState } from 'react'
import { ArrowLeft, ArrowRight, Search, X } from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'

import { StudyModal } from '../../components/StudyModal'
import { displayWord } from '../../lib/word'
import type {
  VocabularyFilterKind,
  VocabularyFilterLevel,
  VocabularyItem,
  Word,
} from '../../lib/types'
import { getVocabularyFn } from '../../server/vocabulary/vocabulary.functions'

const FILTER_LEVELS: VocabularyFilterLevel[] = ['all', 'A1', 'A2', 'B1', 'B2']
const FILTER_KINDS: { value: VocabularyFilterKind; label: string }[] = [
  { value: 'n.', label: 'Noun' },
  { value: 'v.', label: 'Verb' },
  { value: 'adj.', label: 'Adjective' },
  { value: 'adv.', label: 'Adverb' },
  { value: 'pron.', label: 'Pronoun' },
  { value: 'prep.', label: 'Preposition' },
  { value: 'conj.', label: 'Conjunction' },
  { value: 'det.', label: 'Determiner' },
  { value: 'exclam.', label: 'Exclamation' },
  { value: 'number', label: 'Number' },
  { value: 'modal v.', label: 'Modal verb' },
]
const SEARCH_DEBOUNCE_MS = 300

export const Route = createFileRoute('/_authenticated/vocabularies')({
  validateSearch: (search: Record<string, unknown>) => ({
    q: typeof search.q === 'string' ? search.q.slice(0, 100) : '',
    level: isVocabularyFilterLevel(search.level) ? search.level : 'all',
    kind: isVocabularyFilterKind(search.kind) ? search.kind : 'all',
    page: parsePage(search.page),
  }),
  component: VocabulariesPage,
})

function VocabulariesPage() {
  const navigate = useNavigate({ from: Route.fullPath })
  const queryClient = useQueryClient()
  const search = Route.useSearch()
  const [selectedItem, setSelectedItem] = useState<VocabularyItem | null>(null)
  const [studyWord, setStudyWord] = useState<Word | null>(null)
  const [queryInput, setQueryInput] = useState(search.q)

  const { data, isFetching, isLoading } = useQuery({
    queryKey: ['vocabulary', search.q, search.level, search.kind, search.page],
    queryFn: () =>
      getVocabularyFn({
        data: {
          query: search.q,
          level: search.level,
          kind: search.kind,
          page: search.page,
        },
      }),
  })

  useEffect(() => {
    if (!selectedItem) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSelectedItem(null)
    }
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', onKey)
    }
  }, [selectedItem])

  useEffect(() => {
    if (!data || data.page === search.page) return
    navigate({
      search: (previous) => ({ ...previous, page: data.page }),
      replace: true,
    })
  }, [data, navigate, search.page])

  useEffect(() => {
    setQueryInput(search.q)
  }, [search.q])

  useEffect(() => {
    if (queryInput === search.q) return
    const timeout = window.setTimeout(() => {
      navigate({
        search: (previous) => ({ ...previous, q: queryInput, page: 1 }),
      })
    }, SEARCH_DEBOUNCE_MS)

    return () => window.clearTimeout(timeout)
  }, [navigate, queryInput, search.q])

  const items = data?.items ?? []
  const total = data?.total ?? 0
  const currentPage = data?.page ?? search.page
  const totalPages = data?.totalPages ?? 0

  const updateLevel = (level: VocabularyFilterLevel) => {
    navigate({
      search: (previous) => ({
        ...previous,
        level,
        page: 1,
      }),
    })
  }

  const updateKind = (kind: VocabularyFilterKind) => {
    navigate({
      search: (previous) => ({
        ...previous,
        kind,
        page: 1,
      }),
    })
  }

  const goToPage = (page: number) => {
    navigate({ search: (previous) => ({ ...previous, page }) })
  }

  const openLearnFlow = () => {
    if (!selectedItem || selectedItem.memorized) return
    setSelectedItem(null)
    setStudyWord(selectedItem)
  }

  return (
    <div className="library-main">
      <Link className="library-back" to="/progress">
        <ArrowLeft size={14} /> Back to Progress
      </Link>

      <section className="card library-section">
        <div className="section-header">
          <div>
            <h1 className="section library-heading">All vocabularies</h1>
            <p className="muted library-intro">
              Browse the full Oxford 3000 list. Memorized words are highlighted;
              words still waiting to be learned are grayed out.
            </p>
          </div>
          <span className="chip kind">{total} words</span>
        </div>

        <div className="library-controls">
          <label className="search-field">
            <span className="sr-only">Search English words</span>
            <Search className="search-icon" size={17} aria-hidden="true" />
            <input
              type="search"
              value={queryInput}
              placeholder="Search English words..."
              autoComplete="off"
              onChange={(event) => setQueryInput(event.target.value)}
            />
          </label>
          <label>
            <span className="sr-only">Filter by level</span>
            <select
              value={search.level}
              onChange={(event) =>
                updateLevel(event.target.value as VocabularyFilterLevel)
              }
            >
              {FILTER_LEVELS.map((level) => (
                <option value={level} key={level}>
                  {level === 'all' ? 'All levels' : level}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="sr-only">Filter by part of speech</span>
            <select
              value={search.kind}
              onChange={(event) =>
                updateKind(event.target.value as VocabularyFilterKind)
              }
            >
              <option value="all">All kinds</option>
              {FILTER_KINDS.map((kind) => (
                <option value={kind.value} key={kind.value}>
                  {kind.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="library-meta">
          <span>
            {isLoading
              ? 'Loading vocabulary...'
              : total === 0
                ? '0 matching words'
                : `Showing ${(currentPage - 1) * (data?.pageSize ?? 6) + 1}-${Math.min(currentPage * (data?.pageSize ?? 6), total)} of ${total} words`}
          </span>
          <div className="legend">
            <span className="status-badge memorized">Memorized</span>
            <span className="status-badge to-learn">To learn</span>
          </div>
        </div>

        {isLoading ? (
          <div className="library-empty show">
            <strong>Loading vocabulary</strong>
            <p className="muted mt">Preparing your word library.</p>
          </div>
        ) : items.length === 0 ? (
          <div className="library-empty show">
            <strong>No words found</strong>
            <p className="muted mt">Try another search or level filter.</p>
          </div>
        ) : (
          <div className="vocab-grid">
            {items.map((item) => (
              <button
                className={`vocab-card ${item.memorized ? 'memorized' : 'not-memorized'}`}
                type="button"
                key={item.id}
                onClick={() => setSelectedItem(item)}
              >
                <span className="vocab-card-top">
                  <span className="vocab-level-kind">
                    <span className={`chip ${item.level.toLowerCase()}`}>
                      {item.level}
                    </span>
                    <span className="chip kind">{item.kind}</span>
                  </span>
                  <span
                    className={`status-badge ${item.memorized ? 'memorized' : 'to-learn'}`}
                  >
                    {item.memorized ? 'Memorized' : 'To learn'}
                  </span>
                </span>
                <span className="vocab-word">{displayWord(item.word)}</span>
                <span className="vocab-translation">{item.indonesia}</span>
                <span className="vocab-card-foot">
                  {item.memorized && item.memorizedAt
                    ? memorizedRelativeTime(item.memorizedAt)
                    : 'Not memorized'}
                  <ArrowRight size={14} aria-hidden="true" />
                </span>
              </button>
            ))}
          </div>
        )}

        {totalPages > 0 && (
          <nav className="pagination" aria-label="Vocabulary pages">
            <button
              className="page-button"
              type="button"
              disabled={currentPage <= 1 || isFetching}
              aria-label="Previous page"
              onClick={() => goToPage(currentPage - 1)}
            >
              <ArrowLeft size={14} />
            </button>
            {pageNumbers(currentPage, totalPages).map((page, index) =>
              page === 'ellipsis' ? (
                <span className="page-gap" key={`gap-${index}`}>
                  ...
                </span>
              ) : (
                <button
                  className={`page-button ${page === currentPage ? 'active' : ''}`}
                  type="button"
                  key={page}
                  aria-current={page === currentPage ? 'page' : undefined}
                  disabled={isFetching}
                  onClick={() => goToPage(page)}
                >
                  {page}
                </button>
              ),
            )}
            <button
              className="page-button"
              type="button"
              disabled={currentPage >= totalPages || isFetching}
              aria-label="Next page"
              onClick={() => goToPage(currentPage + 1)}
            >
              <ArrowRight size={14} />
            </button>
          </nav>
        )}
      </section>

      {selectedItem && (
        <VocabularyDetailModal
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          onLearn={openLearnFlow}
        />
      )}

      <StudyModal
        study={{
          open: studyWord !== null,
          word: studyWord,
          kind: 'extra',
          alreadyMemorized: false,
        }}
        title="Learn this word"
        primaryActionLabel="Close"
        onClose={() => setStudyWord(null)}
        onSaved={() => {
          queryClient.invalidateQueries({ queryKey: ['vocabulary'] })
          queryClient.invalidateQueries({ queryKey: ['progress'] })
        }}
      />
    </div>
  )
}

function VocabularyDetailModal({
  item,
  onClose,
  onLearn,
}: {
  item: VocabularyItem
  onClose: () => void
  onLearn: () => void
}) {
  return (
    <div
      className="modal-overlay open"
      onClick={(event) => event.target === event.currentTarget && onClose()}
    >
      <div
        className="modal vocab-detail"
        role="dialog"
        aria-modal="true"
        aria-labelledby="vocabulary-detail-word"
      >
        <div className="modal-head">
          <span className="modal-title">Vocabulary detail</span>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>
        <div className="vocab-detail-head">
          <div>
            <div className="vocab-detail-word" id="vocabulary-detail-word">
              {displayWord(item.word)}
            </div>
            <div className="vocab-detail-translation">{item.indonesia}</div>
          </div>
          <div className="vocab-level-kind">
            <span className={`chip ${item.level.toLowerCase()}`}>
              {item.level}
            </span>
            <span className="chip kind">{item.kind}</span>
            <span
              className={`status-badge ${item.memorized ? 'memorized' : 'to-learn'}`}
            >
              {item.memorized ? 'Memorized' : 'To learn'}
            </span>
          </div>
        </div>
        <div className="label">Definition</div>
        <div className="detail-definition">{item.definition}</div>
        <div className="label">Example</div>
        <div className="detail-example">{item.sentenceExample}</div>
        {!item.memorized ? (
          <button className="btn btn-primary" onClick={onLearn}>
            Learn this word
          </button>
        ) : (
          <p className="learn-note show">
            This word is already memorized. Open Review to practice it again.
          </p>
        )}
      </div>
    </div>
  )
}

function isVocabularyFilterLevel(
  value: unknown,
): value is VocabularyFilterLevel {
  return FILTER_LEVELS.includes(value as VocabularyFilterLevel)
}

function isVocabularyFilterKind(value: unknown): value is VocabularyFilterKind {
  return FILTER_KINDS.some((kind) => kind.value === value)
}

function parsePage(value: unknown): number {
  const page = typeof value === 'number' ? value : Number(value)
  return Number.isInteger(page) && page > 0 ? page : 1
}

function pageNumbers(
  currentPage: number,
  totalPages: number,
): Array<number | 'ellipsis'> {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1)
  }

  const pages: Array<number | 'ellipsis'> = [1]
  if (currentPage > 4) pages.push('ellipsis')

  const start = Math.max(2, currentPage - 1)
  const end = Math.min(totalPages - 1, currentPage + 1)
  for (let page = start; page <= end; page++) pages.push(page)

  if (currentPage < totalPages - 3) pages.push('ellipsis')
  pages.push(totalPages)
  return pages
}

function memorizedRelativeTime(at: number): string {
  const minutes = Math.floor(Math.max(0, Date.now() - at) / 60000)
  if (minutes < 1) return 'Memorized just now'
  if (minutes < 60) return `Memorized ${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `Memorized ${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'Memorized yesterday'
  return `Memorized ${days} days ago`
}
