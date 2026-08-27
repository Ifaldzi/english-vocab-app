import { getRequest } from '@tanstack/react-start/server'

/** Best-effort client IP from proxy headers, falling back to a placeholder. */
export function clientIp(): string {
  const req = getRequest()
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim()
    if (first) return first
  }
  return req.headers.get('x-real-ip') ?? 'unknown'
}