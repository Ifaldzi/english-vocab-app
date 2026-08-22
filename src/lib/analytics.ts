/**
 * GA4 analytics helper. Events are sent to the server-side GA4 endpoint
 * (Measurement Protocol) by default so they survive ad-blockers. If a
 * `gtag` is present on the page we use gtag instead.
 */

export interface AnalyticsEvent {
  name: string
  params?: Record<string, string | number | boolean | undefined>
}

async function sendViaFetch(event: AnalyticsEvent) {
  try {
    await fetch('/api/ga', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
      keepalive: true,
    })
  } catch {
    // Analytics failure should never break the app.
  }
}

export function trackEvent(name: string, params?: AnalyticsEvent['params']) {
  if (typeof window === 'undefined') return
  const event = { name, params }
  const gtag = (
    window as unknown as { gtag?: (c: string, n: string, p?: object) => void }
  ).gtag
  if (gtag) {
    void gtag('event', event.name, event.params ?? {})
  } else {
    void sendViaFetch(event)
  }
}
