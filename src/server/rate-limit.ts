/**
 * In-memory fixed-window rate limiter for auth endpoints.
 * Keyed by `ip:key`; buckets expire after RATE_LIMIT_WINDOW_MS.
 * Single-process app (better-sqlite3); for multi-instance deployments
 * this should be replaced with a shared store (e.g. Redis).
 */

export const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000
export const LOGIN_MAX_ATTEMPTS = 10
export const LOGIN_IP_MAX_ATTEMPTS = 30
export const SIGNUP_MAX_ATTEMPTS = 5

interface Bucket {
  count: number
  resetAt: number
}

const buckets = new Map<string, Bucket>()

function pruneExpired(now: number) {
  if (buckets.size < 1000) return
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key)
  }
}

/** Returns true when the caller is currently over the limit for `key`. */
export function isRateLimited(
  key: string,
  maxAttempts: number,
  ip: string,
): boolean {
  const now = Date.now()
  pruneExpired(now)
  const bucket = buckets.get(`${ip}:${key}`)
  return !!bucket && bucket.resetAt > now && bucket.count > maxAttempts
}

/** Records one attempt/failure for `key`. */
export function recordAttempt(key: string, ip: string): void {
  const now = Date.now()
  pruneExpired(now)
  const fullKey = `${ip}:${key}`
  const bucket = buckets.get(fullKey)
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(fullKey, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return
  }
  bucket.count += 1
}