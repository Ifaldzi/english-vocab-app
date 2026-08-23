import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { Check, RotateCcw, Star, X } from 'lucide-react'

import { getDailyWordFn, getExtraWordFn } from '../../server/words.functions'
import { submitSentenceFn } from '../../server/study.functions'
import { getProgressFn } from '../../server/progress.functions'
import { displayWord } from '../../lib/word'
import { trackEvent } from '../../lib/analytics'
import type { Word } from '../../lib/types'
import { WordFront, WordBack } from '../../components/WordCard'

export const Route = createFileRoute('/_authenticated/')({
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData({
      queryKey: ['daily-word'],
      queryFn: getDailyWordFn,
    })
  },
  component: TodayPage,
})

function TodayPage() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const { data, isLoading } = useQuery({
    queryKey: ['daily-word'],
    queryFn: getDailyWordFn,
  })

  const { data: progress } = useQuery({
    queryKey: ['progress'],
    queryFn: getProgressFn,
  })

  const [study, setStudy] = useState<{
    open: boolean
    word: Word | null
    kind: 'daily' | 'extra'
    alreadyMemorized: boolean
  }>({ open: false, word: null, kind: 'daily', alreadyMemorized: false })

  const openDaily = () => {
    if (!data) return
    setStudy({
      open: true,
      word: data.word,
      kind: 'daily',
      alreadyMemorized: data.status === 'memorized',
    })
  }

  const openExtra = async () => {
    const res = await getExtraWordFn()
    if ('error' in res) {
      setStudy({
        open: true,
        word: null,
        kind: 'extra',
        alreadyMemorized: false,
      })
      return
    }
    trackEvent('extra_word', { level: res.word.level })
    setStudy({
      open: true,
      word: res.word,
      kind: 'extra',
      alreadyMemorized: false,
    })
  }

  if (isLoading) {
    return <p className="muted">Loading your word…</p>
  }

  const stats = progress?.stats
  const memorized = progress?.memorized ?? 0
  const totalWords = progress?.totalWords ?? 0
  const pct = totalWords > 0 ? Math.round((memorized / totalWords) * 100) : 0

  return (
    <>
      <div className="layout dash">
        <div className="dash-word">
          {data ? (
            <button
              className="wordcard"
              role="button"
              aria-label="Open word of the day"
              onClick={openDaily}
            >
              <div className="face front">
                <WordFront
                  word={data.word}
                  memorized={data.status === 'memorized'}
                  hint="Tap to study ↻"
                />
              </div>
            </button>
          ) : (
            <div className="card center">
              <div style={{ fontWeight: 800, fontSize: 18 }}>
                You've mastered every word
              </div>
              <p className="muted mt">
                Check back tomorrow — or head to Review to stay sharp.
              </p>
            </div>
          )}
        </div>

        <div className="dash-actions">
          <div className="card">
            <div className="actions-row">
              <button className="btn btn-primary" onClick={openExtra}>
                + Add more words
              </button>
              <button
                className="btn btn-ghost"
                onClick={() => navigate({ to: '/review' })}
              >
                <RotateCcw size={16} /> Review memorized words
              </button>
            </div>
          </div>
        </div>

        <div className="dash-progress">
          <div className="card">
            <div className="row" style={{ alignItems: 'baseline' }}>
              <div style={{ fontWeight: 800, fontSize: 17 }} className="grow">
                {memorized} / {totalWords} memorized
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#a3a3a3' }}>
                {pct}%
              </div>
            </div>
            <div className="bar mt">
              <div style={{ width: `${pct}%` }} />
            </div>
            <p className="muted mt">
              One word a day — you're building a habit.
            </p>
          </div>
        </div>

        <div className="dash-score">
          <div className="stats">
            <div className="stat">
              <div className="num">{stats?.streak ?? 0}</div>
              <div className="lab">Streak</div>
            </div>
            <div className="stat">
              <div className="num">Lv {stats?.level ?? 1}</div>
              <div className="lab">{stats?.levelTitle ?? 'Novice'}</div>
            </div>
            <div className="stat">
              <div className="num">{stats?.xp ?? 0} XP</div>
              <div className="lab">Total</div>
            </div>
          </div>
        </div>

        <div className="span-full dash-activity">
          <h2 className="section">Recent activity</h2>
          <div className="card">
            {(progress?.activity ?? []).length === 0 ? (
              <p className="muted">
                No activity yet. Memorize your first word!
              </p>
            ) : (
              progress!.activity.map((item) => (
                <div className="feed-item" key={item.id}>
                  <span className="feed-emoji">
                    {item.kind === 'memorized' ? (
                      <Check size={18} />
                    ) : item.kind === 'reviewed' ? (
                      <RotateCcw size={18} />
                    ) : (
                      <Star size={18} />
                    )}
                  </span>
                  {item.kind === 'memorized' && (
                    <>
                      Memorized <b>&nbsp;"{item.word}"</b>
                    </>
                  )}
                  {item.kind === 'reviewed' && (
                    <>
                      Reviewed <b>&nbsp;"{item.word}"</b>
                    </>
                  )}
                  {item.kind === 'badge' && (
                    <>
                      Badge: <b>&nbsp;{item.badgeName}</b>
                    </>
                  )}
                  <span className="feed-meta">{relTime(item.at)}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <StudyModal
        study={study}
        onClose={() => setStudy((s) => ({ ...s, open: false }))}
        onBackToToday={() => setStudy((s) => ({ ...s, open: false }))}
        onSaved={() => {
          queryClient.invalidateQueries({ queryKey: ['daily-word'] })
          queryClient.invalidateQueries({ queryKey: ['progress'] })
        }}
      />
    </>
  )
}

function StudyModal({
  study,
  onClose,
  onBackToToday,
  onSaved,
}: {
  study: {
    open: boolean
    word: Word | null
    kind: 'daily' | 'extra'
    alreadyMemorized: boolean
  }
  onClose: () => void
  onBackToToday: () => void
  onSaved: () => void
}) {
  const [flipped, setFlipped] = useState(false)
  const [sentence, setSentence] = useState('')
  const [checking, setChecking] = useState(false)
  const [feedback, setFeedback] = useState<null | {
    pass: boolean
    reason?: string
  }>(null)
  const [saved, setSaved] = useState<null | {
    xpEarned: number
    streak: number
    isDaily: boolean
  }>(null)

  useEffect(() => {
    if (study.open) {
      setFlipped(false)
      setSentence('')
      setChecking(false)
      setFeedback(null)
      setSaved(null)
    }
  }, [study.open, study.word?.id])

  useEffect(() => {
    if (!study.open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [study.open, onClose])

  if (!study.open) return null

  const word = study.word

  const handleCheck = async () => {
    if (!word || checking) return
    setChecking(true)
    try {
      const res = await submitSentenceFn({
        data: { wordId: word.id, sentence, kind: study.kind },
      })
      if (!res.pass) {
        setFeedback({ pass: false, reason: res.reason })
        return
      }
      trackEvent('word_memorized', {
        level: word.level,
        kind: study.kind,
        xp: res.xpEarned,
      })
      setFeedback({ pass: true })
      setSaved({
        xpEarned: res.xpEarned,
        streak: res.streak,
        isDaily: res.isDaily,
      })
      onSaved()
    } finally {
      setChecking(false)
    }
  }

  return (
    <div
      className="modal-overlay open"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label="Word of the Day"
      >
        <div className="modal-head">
          <span className="modal-title">
            {word
              ? study.kind === 'extra'
                ? 'Extra Word'
                : 'Word of the Day'
              : 'WordDeck'}
          </span>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        {!word ? (
          <div className="banner failure">
            <span className="icon">
              <X size={20} />
            </span>
            <div>
              No more words available right now.
              <div className="reason">
                You've already studied every word today.
              </div>
            </div>
          </div>
        ) : study.alreadyMemorized ? (
          <div>
            <div className="stage">
              <div
                className={`card-wrap ${flipped ? 'flipped' : ''}`}
                role="button"
                aria-label="Flip card"
                tabIndex={0}
                onClick={() => setFlipped((f) => !f)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    setFlipped((f) => !f)
                  }
                }}
              >
                <div className="face front">
                  <WordFront word={word} memorized hint="Tap card to reveal" />
                </div>
                <div className="face back">
                  <WordBack word={word} />
                </div>
              </div>
            </div>
            <div className="banner success mt">
              <span className="icon">
                <Check size={20} />
              </span>
              <div>
                Great sentence! <b>"{displayWord(word.word)}"</b> is memorized.
                <div className="reason">
                  Nice work — come back tomorrow for a new word.
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div>
            <div className="stage">
              <div
                className={`card-wrap ${flipped ? 'flipped' : ''}`}
                role="button"
                aria-label="Flip card"
                tabIndex={0}
                onClick={() => setFlipped((f) => !f)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    setFlipped((f) => !f)
                  }
                }}
              >
                <div className="face front">
                  <WordFront word={word} hint="Tap card to reveal" />
                </div>
                <div className="face back">
                  <WordBack word={word} />
                </div>
              </div>
            </div>

            <div className="prove">
              <div className="prove-title">Prove you know it</div>
              <div className="prove-sub">
                Write a sentence using <b>"{displayWord(word.word)}"</b> to lock
                this card in.
              </div>
              <textarea
                value={sentence}
                onChange={(e) => setSentence(e.target.value)}
                placeholder={`Type your own sentence with the word ${displayWord(word.word)}…`}
              />
              <p className="helper">
                The word must appear in your sentence (min. 4 words).
                Punctuation and capitals are ignored.
              </p>

              <button
                className="btn btn-primary mt"
                onClick={handleCheck}
                disabled={checking || sentence.trim().length === 0}
              >
                {checking ? 'Checking…' : 'Check my sentence'}
              </button>

              {saved ? (
                <>
                  <div className="banner success mt-6">
                    <span className="icon">
                      <Check size={20} />
                    </span>
                    <div>
                      ✓ Correct — <b>"{displayWord(word.word)}"</b> is now
                      locked in. Nice work.
                      <div className="reason">
                        +{saved.xpEarned} XP
                        {saved.isDaily ? ' (daily word)' : ''}
                        {saved.streak > 1 ? ` · streak → ${saved.streak}` : ''}
                      </div>
                    </div>
                  </div>
                  <div className="actions-row mt">
                    <button className="btn btn-primary" onClick={onClose}>
                      + Another word
                    </button>
                    <button className="btn btn-ghost" onClick={onBackToToday}>
                      → Back to today
                    </button>
                  </div>
                </>
              ) : feedback && !feedback.pass ? (
                <div className="banner failure inline show mt-6">
                  <span className="icon">
                    <X size={20} />
                  </span>
                  <div>
                    ✗ Not quite.
                    <div className="reason">{feedback.reason}</div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function relTime(at: number): string {
  const diff = Math.max(0, Date.now() - at)
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'now'
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  const d = Math.floor(h / 24)
  if (d === 1) return 'yesterday'
  return `${d}d`
}
