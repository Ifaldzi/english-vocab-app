import { createCsrfMiddleware, createStart } from '@tanstack/react-start'

/**
 * Blocks cross-site requests to server functions (CSRF). Only browser
 * requests from the same origin pass: validated via Sec-Fetch-Site, then
 * Origin, then Referer.
 */
const csrfMiddleware = createCsrfMiddleware({
  filter: (ctx) => ctx.handlerType === 'serverFn',
})

export const startInstance = createStart(() => ({
  requestMiddleware: [csrfMiddleware],
}))
