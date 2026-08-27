import { createFileRoute } from '@tanstack/react-router'
import { getCookie, getRequest } from '@tanstack/react-start/server'
import { getCurrentSession } from '../../server/auth/session'

export const Route = createFileRoute('/api/debugcookie')({
  server: {
    handlers: {
      GET: async () => {
        // Debug helper only — never serve it in production (it echoes the
        // session token, defeating the HttpOnly cookie flag).
        if (process.env.NODE_ENV === 'production') {
          return new Response('Not found', { status: 404 })
        }
        const req = getRequest()
        const cookies = req.headers.get('cookie') ?? '(none)'
        const wd = getCookie('wd_session') ?? '(null)'
        const session = await getCurrentSession()
        return Response.json({ cookieHeader: cookies, wd, session })
      },
    },
  },
})
