import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

import { authMiddleware } from '../auth/auth-middleware'
import {
  countSubscriptions,
  deleteSubscription,
  upsertSubscription,
} from './reminders'
import { getVapidPublicKey } from './sender'

const subscriptionSchema = z.object({
  endpoint: z.string().url().max(2000),
  p256dh: z.string().min(1).max(512),
  auth: z.string().min(1).max(512),
})

/** Public VAPID key the browser needs to subscribe. Never the private key. */
export const getPushConfigFn = createServerFn({ method: 'GET' }).handler(
  async () => {
    return { vapidPublicKey: getVapidPublicKey() }
  },
)

/** Registers (or refreshes) the caller's push subscription for reminders. */
export const savePushSubscriptionFn = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .validator(subscriptionSchema)
  .handler(async ({ context, data }) => {
    await upsertSubscription(context.user.id, data)
    return { ok: true }
  })

/** Removes a subscription (used when a device unsubscribes locally). */
export const deletePushSubscriptionFn = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .validator(z.object({ endpoint: z.string().url().max(2000) }))
  .handler(async ({ data }) => {
    await deleteSubscription(data.endpoint)
    return { ok: true }
  })

/** How many devices the caller has subscribed (for bookkeeping/debugging). */
export const getPushStatusFn = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const count = await countSubscriptions(context.user.id)
    return { count, vapidPublicKey: getVapidPublicKey() }
  })
