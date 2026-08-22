import { createFileRoute } from '@tanstack/react-router'
import { getCookie, getRequest } from '@tanstack/react-start/server'
import { getCurrentSession } from '../../server/session'

export const Route = createFileRoute('/api/debugcookie')({
  server: {
    handlers: {
      GET: async () => {
        const req = getRequest()
        const cookies = req.headers.get('cookie') ?? '(none)'
        const wd = getCookie('wd_session') ?? '(null)'
        const session = await getCurrentSession()
        return Response.json({ cookieHeader: cookies, wd, session })
      },
    },
  },
})
