import { definePlugin } from 'nitro'

import { timePartsInTz, isDueForReminder, dispatchReminder } from './reminders'

const TICK_MS = 60 * 1000

let dispatchedForDay: string | null = null
let timer: ReturnType<typeof setInterval> | null = null

async function runOnce() {
  try {
    if (process.env.REMINDER_ENABLED !== 'true') return
    const tz = process.env.APP_TIMEZONE ?? 'Asia/Jakarta'
    const hour = Number(process.env.REMINDER_HOUR ?? 18)
    const minute = Number(process.env.REMINDER_MINUTE ?? 0)
    const parts = timePartsInTz(new Date(), tz)
    if (!isDueForReminder(parts, hour, minute)) return
    if (dispatchedForDay === parts.date) return

    dispatchedForDay = parts.date
    const result = await dispatchReminder(parts.date)
    console.log(
      `[reminder] ${parts.date}: eligible=${result.usersEligible} sent=${result.deliveriesSent} removedDead=${result.deadSubscriptionsRemoved}`,
    )
  } catch (err) {
    // Never let a scheduler failure crash or block the request loop.
    console.error('[reminder] dispatch failed', err)
  }
}

/** Nitro runtime plugin: runs the reminder once a day in the app process. */
export default definePlugin(() => {
  if (timer) return
  timer = setInterval(runOnce, TICK_MS)
})
