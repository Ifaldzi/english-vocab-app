import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useMutation } from '@tanstack/react-query'
import { useRef, useState } from 'react'
import { Check, X } from 'lucide-react'

import {
  getReviewQuestionFn,
  answerReviewFn,
} from '../../server/review.functions'
import { displayWord } from '../../lib/word'
import { trackEvent } from '../../lib/analytics'
import type { ReviewQuestionPayload } from '../../server/review'

export const Route = createFileRoute('/_authenticated/review')({
  component: ReviewPage,
})

interface QuestionUI {
  payload: ReviewQuestionPayload
  chosen?: string | null
}

function ReviewPage() {
  const navigate = useNavigate()
  const [reviewing, setReviewing] = useState(false)
  const [emptyPool, setEmptyPool] = useState(false)
  const [question, setQuestion] = useState<QuestionUI | null>(null)
  const [stats, setStats] = useState({ correct: 0, total: 0, xp: 0 })
  const [done, setDone] = useState(false)
  const answeredRef = useRef<number[]>([])

  const start = async () => {
    setReviewing(true)
    setDone(false)
    setEmptyPool(false)
    setStats({ correct: 0, total: 0, xp: 0 })
    answeredRef.current = []
    const next = await getReviewQuestionFn({ data: { excludedWordIds: [] } })
    if (!next) {
      setEmptyPool(true)
      setReviewing(false)
      return
    }
    setQuestion({ payload: next })
  }

  const loadNext = async () => {
    const next = await getReviewQuestionFn({
      data: { excludedWordIds: answeredRef.current },
    })
    if (!next) {
      setQuestion(null)
      setDone(true)
      setReviewing(false)
    } else {
      setQuestion({ payload: next })
    }
  }

  const answerMutation = useMutation({
    mutationFn: async (definition: string) => {
      if (!question) throw new Error('no question')
      const { wordId } = question.payload

      const res = await answerReviewFn({
        data: { wordId, chosenDefinition: definition },
      })

      trackEvent('review_answer', {
        correct: res.correct ? 'true' : 'false',
        level: question.payload.level,
      })

      setQuestion((q) => (q ? { ...q, chosen: definition } : q))
      setStats((s) => ({
        correct: s.correct + (res.correct ? 1 : 0),
        total: s.total + 1,
        xp: s.xp + res.xpEarned,
      }))

      answeredRef.current = [...answeredRef.current, wordId]
      return res
    },
  })

  const handlePick = (option: string) => {
    if (answerMutation.isPending) return
    answerMutation.mutate(option)
  }

  if (emptyPool) {
    return (
      <div className="card center">
        <div style={{ fontWeight: 800, fontSize: 18 }}>
          Nothing to review yet
        </div>
        <p className="muted mt">
          Memorize your first word of the day to unlock review mode. Come back
          after a day or two — review keeps your memorized words sharp.
        </p>
        <button
          className="btn btn-ghost mt"
          onClick={() => navigate({ to: '/' })}
        >
          Back to today
        </button>
      </div>
    )
  }

  if (!reviewing) {
    return (
      <div className="card">
        <p className="muted">Review mode</p>
        <h1 style={{ fontSize: 28, fontWeight: 800, margin: '6px 0' }}>
          Sharpen your memory
        </h1>
        <p className="muted">
          We'll show words you've memorized and test you on their meaning. Each
          correct answer earns <b>+5 XP</b>.
        </p>
        <button className="btn btn-primary mt" onClick={start}>
          Start review
        </button>
        <button
          className="btn btn-ghost mt"
          onClick={() => navigate({ to: '/' })}
        >
          Back to today
        </button>
      </div>
    )
  }

  if (done) {
    const perfect = stats.total > 0 && stats.correct === stats.total
    return (
      <div className="card center">
        <div className="banner success">
          <span className="icon">
            {perfect ? <Check size={20} /> : <Check size={20} />}
          </span>
          <div>
            Review complete
            <div className="reason">
              {stats.correct} / {stats.total} correct · +{stats.xp} XP
            </div>
          </div>
        </div>
        <div className="stats" style={{ marginTop: 8 }}>
          <div className="stat">
            <div className="num">{stats.correct}</div>
            <div className="lab">Correct</div>
          </div>
          <div className="stat">
            <div className="num">{stats.total}</div>
            <div className="lab">Answered</div>
          </div>
          <div className="stat">
            <div className="num">+{stats.xp}</div>
            <div className="lab">XP earned</div>
          </div>
        </div>
        <button className="btn btn-primary mt" onClick={start}>
          Review again
        </button>
        <button
          className="btn btn-ghost mt"
          onClick={() => navigate({ to: '/' })}
        >
          Back to today
        </button>
      </div>
    )
  }

  if (!question) return null

  const { payload } = question
  const pickedAt = question.chosen
  const hasAnswered = pickedAt !== undefined && pickedAt !== null

  return (
    <div className="card" id="quiz">
      <p className="muted" id="progressLabel">
        Review {stats.total + 1} · words memorized longest ago first
      </p>
      <div style={{ marginTop: 18 }}>
        <div className="chips">
          <span className={`chip ${payload.level.toLowerCase()}`} id="lvlChip">
            {payload.level}
          </span>
          <span className="chip kind" id="kindChip">
            {payload.kind}
          </span>
        </div>
        <div
          className="word"
          style={{ fontSize: 48, fontWeight: 800, marginTop: 12 }}
          id="qWord"
        >
          {displayWord(payload.word)}
        </div>
      </div>

      <div className="sentence-box" style={{ marginTop: 8 }}>
        <label id="qPrompt">
          Which is the correct definition of "{displayWord(payload.word)}"?
        </label>
        <div className="mcq" id="mcq">
          {payload.options.map((option) => {
            const isCorrect = option === payload.correctDefinition
            const isPicked = option === pickedAt
            let extra = ''
            if (hasAnswered) {
              if (isPicked && isCorrect) extra = ' correct'
              else if (isPicked) extra = ' wrong'
              else if (isCorrect) extra = ' correct'
            }
            return (
              <button
                key={option}
                type="button"
                className={`btn opt${extra}`}
                onClick={() => handlePick(option)}
                disabled={answerMutation.isPending || hasAnswered}
              >
                {option}
              </button>
            )
          })}
        </div>

        {hasAnswered && answerMutation.data?.correct ? (
          <div className="banner inline success" id="okBanner">
            <span className="icon">
              <Check size={18} />
            </span>
            <div>
              Correct! <b>+{answerMutation.data.xpEarned} XP</b>
              <span className="reason">"{payload.correctDefinition}".</span>
            </div>
          </div>
        ) : hasAnswered && answerMutation.data ? (
          <div className="banner inline failure" id="noBanner">
            <span className="icon">
              <X size={18} />
            </span>
            <div>
              Not quite.
              <span className="reason">
                The correct answer was highlighted above. No XP earned.
              </span>
            </div>
          </div>
        ) : null}

        {hasAnswered && (
          <button
            className="btn btn-primary mt"
            id="nextBtn"
            onClick={loadNext}
          >
            Next word
          </button>
        )}
      </div>
    </div>
  )
}
