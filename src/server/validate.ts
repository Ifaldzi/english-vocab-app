export interface ValidationResult {
  pass: boolean
  reason?: string
  correction?: string
}

export interface SentenceValidationInput {
  word: string
  sentence: string
  definition?: string
  level?: string
  kind?: string
}

export type SentenceValidator = (
  input: SentenceValidationInput,
) => Promise<ValidationResult>

const MIN_TOKENS = 4

/** Strip trailing homograph digits for matching, e.g. `can1` → `can`. */
export function stripHomographSuffix(word: string): string {
  return word.replace(/\d+$/, '').trim()
}

/**
 * Split a word string into its matchable variants.
 * `"a, an"` → `["a", "an"]`; `"can1"` → `["can"]`.
 */
export function wordVariants(word: string): string[] {
  return word
    .split(',')
    .map((v) => stripHomographSuffix(v.trim().toLowerCase()))
    .filter((v) => v.length > 0)
}

/**
 * Normalize a sentence into lowercase tokens.
 * Punctuation is stripped into spaces, whitespace is collapsed.
 */
export function normalizeTokens(sentence: string): string[] {
  return sentence
    .toLowerCase()
    .replace(/[^a-z0-9'\s-]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 0)
}

/**
 * Deterministic keyword-matching validator (FR-4 fallback).
 */
export function keywordValidator(
  word: string,
  sentence: string,
): ValidationResult {
  const trimmed = sentence.trim()
  const tokens = normalizeTokens(trimmed)
  const variants = wordVariants(word)

  if (trimmed.length === 0) {
    return { pass: false, reason: 'Write a sentence to continue.' }
  }

  if (tokens.length < MIN_TOKENS) {
    return {
      pass: false,
      reason: `Your sentence has only ${tokens.length} word${
        tokens.length === 1 ? '' : 's'
      } — write at least ${MIN_TOKENS}.`,
    }
  }

  const present = variants.some((v) => tokens.includes(v))
  if (!present) {
    const shown =
      variants.length > 1 ? `"${variants.join('" or "')}"` : `"${variants[0]}"`
    return {
      pass: false,
      reason: `Your sentence needs to include the word ${shown}.`,
    }
  }

  return { pass: true }
}

export const keywordSentenceValidator: SentenceValidator = async ({
  word,
  sentence,
}) => keywordValidator(word, sentence)
