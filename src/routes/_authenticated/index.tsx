import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Check, RotateCcw, Star } from 'lucide-react'

import {
  getDailyWordFn,
  getExtraWordFn,
} from '../../server/words/words.functions'
import { getProgressFn } from '../../server/progress/progress.functions'
import { trackEvent } from '../../lib/analytics'
import type { Word } from '../../lib/types'
import { StudyModal } from '../../components/StudyModal'
import { WordFront } from '../../components/WordCard'

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
