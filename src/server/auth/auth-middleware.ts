import { createMiddleware } from '@tanstack/react-start'

import { getCurrentSession } from './session'

/** Validates the session cookie and injects `context.user`. */
export const authMiddleware = createMiddleware({ type: 'function' }).server(
  async ({ next }) => {
    const user = await getCurrentSession()
    if (!user) {
      throw new Error('Unauthorized')
    }
    return next({ context: { user } })
  },
)
