/**
 * Server-side validation for the GA4 Measurement Protocol forwarder
 * (`/api/ga`). Kept pure so it can be unit-tested without a request context.
 */

export const ALLOWED_GA_EVENT_NAMES = [
  'login',
  'sign_up',
  'extra_word',
  'word_memorized',
  'review_answer',
] as const

export const MAX_GA_PARAMS = 16

export type GaEventParamValue = string | number | boolean

/** Accepts only known event names (bounds name length by construction). */
export function isAllowedGaEventName(name: unknown): name is string {
  return (
    typeof name === 'string' &&
    (ALLOWED_GA_EVENT_NAMES as readonly string[]).includes(name)
  )
}

/**
 * Reduces arbitrary request params to a flat record of primitive values.
 * Nested objects/arrays and unknown types are dropped; keys are capped.
 */
export function sanitizeGaParams(
  value: unknown,
): Record<string, GaEventParamValue> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}

  const out: Record<string, GaEventParamValue> = {}
  for (const [key, item] of Object.entries(value)) {
    if (Object.keys(out).length >= MAX_GA_PARAMS) break
    if (
      typeof item === 'string' ||
      typeof item === 'number' ||
      typeof item === 'boolean'
    ) {
      out[key] = item
    }
  }
  return out
}
