import { displayWord, kindLabel } from '../lib/word'
import type { Word } from '../lib/types'

interface WordFrontProps {
  word: Word
  isExtra?: boolean
  memorized?: boolean
  hint?: string
}

export function WordFront({ word, isExtra, memorized, hint }: WordFrontProps) {
  const level = word.level.toLowerCase()
  return (
    <>
      <div className="part">{isExtra ? 'Extra Word' : 'Word of the Day'}</div>
      <div className="chips" style={{ marginBottom: 14 }}>
        <span className={`chip ${level}`}>{word.level}</span>
        <span className="chip kind">{word.kind}</span>
        {memorized && (
          <span
            className="chip kind"
            style={{ borderColor: '#4ade80', color: '#4ade80' }}
          >
            ✓ done
          </span>
        )}
      </div>
      <div className="word">{displayWord(word.word)}</div>
      <div className="type">{kindLabel(word.kind)}</div>
      {hint && <div className="hint">{hint}</div>}
    </>
  )
}

export function WordBack({ word }: { word: Word }) {
  return (
    <>
      <div className="back-top">
        <span className="back-word">{displayWord(word.word)}</span>
        <span className="back-type">{word.kind}</span>
      </div>
      <div className="label">Definition</div>
      <div className="definition">{word.definition}</div>
      <div className="label">Translation</div>
      <div className="translation">{word.indonesia}</div>
      <div className="label">Example</div>
      <div className="example">"{word.sentenceExample}"</div>
    </>
  )
}
