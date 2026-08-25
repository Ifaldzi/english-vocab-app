import { createServerFn } from '@tanstack/react-start'

import { authMiddleware } from '../auth/auth-middleware'
import {
  getBadges,
  getCefrBreakdown,
  getCefrTotals,
  getMemorizedTotal,
  getRecentActivity,
  getStatsView,
  getTotalWords,
} from './progress'

/** Full progress payload for the Progress route (FR-7). */
export const getProgressFn = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const [stats, cefr, cefrTotals, badges, activity, memorized, totalWords] =
      await Promise.all([
        getStatsView(context.user.id),
        getCefrBreakdown(context.user.id),
        getCefrTotals(),
        getBadges(context.user.id),
        getRecentActivity(context.user.id, 10),
        getMemorizedTotal(context.user.id),
        getTotalWords(),
      ])

    return { stats, cefr, cefrTotals, badges, activity, memorized, totalWords }
  })
