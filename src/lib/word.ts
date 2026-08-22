/**
 * Display formatting for words (FR-3.1).
 * Homograph suffixes are stripped for display (`can1` → `can`);
 * variants with commas display as-is (`a, an`).
 */
export function displayWord(word: string): string {
  const trimmed = word.trim()
  if (trimmed.includes(',')) return trimmed
  return trimmed.replace(/\d+$/, '')
}

/** Lower-cased variants used for sentence matching. */
export function matchVariants(word: string): string[] {
  return word
    .split(',')
    .map((v) => v.trim().toLowerCase().replace(/\d+$/, ''))
    .filter((v) => v.length > 0)
}

const KIND_LABELS: Record<string, string> = {
  'n.': 'noun',
  'v.': 'verb',
  'adj.': 'adjective',
  'adv.': 'adverb',
  'prep.': 'preposition',
  'pron.': 'pronoun',
  'det.': 'determiner',
  'conj.': 'conjunction',
  'exclam.': 'exclamation',
  number: 'number',
  'modal v.': 'modal verb',
  'auxiliary v.': 'auxiliary verb',
  'indefinite article': 'indefinite article',
  'definite article': 'definite article',
  'prep., infinitive marker': 'preposition, infinitive marker',
}

/**
 * Full part-of-speech label for the card's `.type` line.
 * `"n."` → `"noun"`; multi-part and unrecognized kinds fall back to the
 * raw abbreviation (mockup shows `noun` while the chip shows `n.`).
 */
export function kindLabel(kind: string): string {
  const trimmed = kind.trim()
  if (KIND_LABELS[trimmed]) return KIND_LABELS[trimmed]
  if (trimmed.includes(',')) {
    return trimmed
      .split(',')
      .map((k) => KIND_LABELS[k.trim()] ?? k.trim())
      .join(', ')
  }
  return trimmed
}
