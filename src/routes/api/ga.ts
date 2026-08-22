import { createFileRoute } from '@tanstack/react-router'

interface GaBody {
  name?: unknown
  params?: unknown
}

const MEASUREMENT_ID = process.env.GA4_MEASUREMENT_ID
const API_SECRET = process.env.GA4_API_SECRET
const CLIENT_ID = 'worddaily-anonymous'

export const Route = createFileRoute('/api/ga')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!MEASUREMENT_ID || !API_SECRET) {
          // No GA4 configured — swallow silently. Analytics must never break the app.
          return new Response('ok', { status: 200 })
        }

        let body: GaBody
        try {
          body = await request.json()
        } catch {
          return new Response('bad json', { status: 400 })
        }

        if (typeof body.name !== 'string') {
          return new Response('missing name', { status: 400 })
        }

        const payload = {
          client_id: CLIENT_ID,
          user_id: undefined as string | undefined,
          events: [
            {
              name: body.name,
              params:
                body.params && typeof body.params === 'object'
                  ? body.params
                  : {},
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
