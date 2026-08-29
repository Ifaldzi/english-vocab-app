/**
 * Free-text sanitization for user-supplied sentences.
 * Strips control characters and collapses whitespace before storage so the
 * stored value is safe to display anywhere (React already escapes on render).
 */
export function sanitizeStoredText(value: string): string {
  return value
    .replace(/[\p{Cc}]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
}
