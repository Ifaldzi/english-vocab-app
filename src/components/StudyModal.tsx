import { useEffect, useState } from 'react'
import { Check, X } from 'lucide-react'

import { submitSentenceFn } from '../server/study/study.functions'
import { displayWord } from '../lib/word'
import type { Word } from '../lib/types'
import { trackEvent } from '../lib/analytics'
import { WordBack, WordFront } from './WordCard'

export interface StudyModalProps {
  study: {
    open: boolean
    word: Word | null
    kind: 'daily' | 'extra'
    alreadyMemorized: boolean
  }
  onClose: () => void
  onBackToToday?: () => void
  onSaved: () => void
  title?: string
  primaryActionLabel?: string
}

export function StudyModal({
  study,
  onClose,
  onBackToToday,
  onSaved,
  title,
  primaryActionLabel,
}: StudyModalProps) {
  const [flipped, setFlipped] = useState(false)
  const [sentence, setSentence] = useState('')
  const [checking, setChecking] = useState(false)
  const [feedback, setFeedback] = useState<null | {
    pass: boolean
    reason?: string
    correction?: string
  }>(null)
  const [saved, setSaved] = useState<null | {
    xpEarned: number
    streak: number
    isDaily: boolean
    correction?: string
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
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = previousOverflow
    }
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
        setFeedback(res)
        return
      }
      trackEvent('word_memorized', {
        level: word.level,
        kind: study.kind,
        xp: res.xpEarned,
      })
      setFeedback(res)
      setSaved({
        xpEarned: res.xpEarned,
        streak: res.streak,
        isDaily: res.isDaily,
        correction: res.correction,
      })
      onSaved()
    } finally {
      setChecking(false)
    }
  }

  const modalTitle =
    title ??
    (word
      ? study.kind === 'extra'
        ? 'Extra Word'
        : 'Word of the Day'
      : 'WordDeck')

  return (
    <div
      className="modal-overlay open"
      onClick={(event) => event.target === event.currentTarget && onClose()}
    >
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={modalTitle}
      >
        <div className="modal-head">
          <span className="modal-title">{modalTitle}</span>
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
                onClick={() => setFlipped((current) => !current)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    setFlipped((current) => !current)
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
                  Nice work - come back tomorrow for a new word.
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
                onClick={() => setFlipped((current) => !current)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    setFlipped((current) => !current)
                  }
                }}
              >
                <div className="face front">
                  <WordFront word={word} hint="Tap to study" />
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
                onChange={(event) => setSentence(event.target.value)}
                placeholder={`Type your own sentence with the word ${displayWord(word.word)}...`}
              />
              <p className="helper">
                Use the word naturally in a sentence of at least 4 words. AI
                checks the meaning and may suggest a grammar improvement.
              </p>

              <button
                className="btn btn-primary mt"
                onClick={handleCheck}
                disabled={checking || sentence.trim().length === 0}
              >
                {checking ? 'Checking...' : 'Check my sentence'}
              </button>

              {saved ? (
                <>
                  <div className="banner success mt-6">
                    <span className="icon">
                      <Check size={20} />
                    </span>
                    <div>
                      Correct - <b>"{displayWord(word.word)}"</b> is now locked
                      in. Nice work.
                      <div className="reason">
                        +{saved.xpEarned} XP
                        {saved.isDaily ? ' (daily word)' : ''}
                        {saved.streak > 1 ? ` - streak -> ${saved.streak}` : ''}
                      </div>
                      {saved.correction && (
                        <div className="reason">
                          Suggested correction: "{saved.correction}"
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="actions-row mt">
                    <button className="btn btn-primary" onClick={onClose}>
                      {primaryActionLabel ?? '+ Another word'}
                    </button>
                    {onBackToToday && (
                      <button className="btn btn-ghost" onClick={onBackToToday}>
                        Back to today
                      </button>
                    )}
                  </div>
                </>
              ) : feedback && !feedback.pass ? (
                <div className="banner failure inline show mt-6">
                  <span className="icon">
                    <X size={20} />
                  </span>
                  <div>
                    Not quite.
                    {feedback.reason && (
                      <div className="reason">{feedback.reason}</div>
                    )}
                    {feedback.correction && (
                      <div className="reason">Try: "{feedback.correction}"</div>
                    )}
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
