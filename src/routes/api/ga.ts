import { createFileRoute } from '@tanstack/react-router'

import {
  isAllowedGaEventName,
  sanitizeGaParams,
} from '../../server/ga-validation'

interface GaBody {
  name?: unknown
  params?: unknown
}

const MEASUREMENT_ID = process.env.GA4_MEASUREMENT_ID
const API_SECRET = process.env.GA4_API_SECRET
const CLIENT_ID = 'worddaily-anonymous'
const MAX_BODY_BYTES = 4096

export const Route = createFileRoute('/api/ga')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!MEASUREMENT_ID || !API_SECRET) {
          // No GA4 configured — swallow silently. Analytics must never break the app.
          return new Response('ok', { status: 200 })
        }

        const contentLength = Number(request.headers.get('content-length') ?? 0)
        if (contentLength > MAX_BODY_BYTES) {
          return new Response('payload too large', { status: 413 })
        }

        let body: GaBody
        try {
          body = await request.json()
        } catch {
          return new Response('bad json', { status: 400 })
        }

        if (!isAllowedGaEventName(body.name)) {
          return new Response('unknown event', { status: 400 })
        }

        const payload = {
          client_id: CLIENT_ID,
          user_id: undefined as string | undefined,
          events: [
            {
              name: body.name,
              params: sanitizeGaParams(body.params),
            },
          ],
        }

        const url = `https://www.google-analytics.com/mp/collect?measurement_id=${MEASUREMENT_ID}&api_secret=${API_SECRET}`
        try {
          const resp = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
          return new Response(resp.ok ? 'ok' : 'forward-failed', {
            status: resp.ok ? 200 : 500,
          })
        } catch {
          return new Response('forward-failed', { status: 500 })
        }
      },
    },
  },
})
