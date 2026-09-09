import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import {
  timePartsInTz,
  isDueForReminder,
} from '../src/server/notifications/reminders'

describe('timePartsInTz', () => {
  it('returns the YYYY-MM-DD date and local clock in the given timezone', () => {
    // 2026-08-16T16:00:00Z = 23:00 in Asia/Jakarta (UTC+7)
    const parts = timePartsInTz(
      new Date('2026-08-16T16:00:00Z'),
      'Asia/Jakarta',
    )
    assert.equal(parts.date, '2026-08-16')
    assert.equal(parts.hour, 23)
    assert.equal(parts.minute, 0)
  })

  it('rolls the date across midnight relative to the timezone', () => {
    // 2026-08-16T22:00:00Z = 2026-08-17 05:00 in Asia/Jakarta
    const parts = timePartsInTz(
      new Date('2026-08-16T22:00:00Z'),
      'Asia/Jakarta',
    )
    assert.equal(parts.date, '2026-08-17')
    assert.equal(parts.hour, 5)
  })

  it('handles a UTC-based timezone', () => {
    const parts = timePartsInTz(new Date('2026-08-16T12:34:00Z'), 'UTC')
    assert.equal(parts.date, '2026-08-16')
    assert.equal(parts.hour, 12)
    assert.equal(parts.minute, 34)
  })

  it('handles a timezone west of UTC', () => {
    // 2026-08-16T12:00:00Z = 08:00 in America/New_York (UTC-4 in Aug)
    const parts = timePartsInTz(
      new Date('2026-08-16T12:00:00Z'),
      'America/New_York',
    )
    assert.equal(parts.date, '2026-08-16')
    assert.equal(parts.hour, 8)
  })
})

describe('isDueForReminder', () => {
  const at = (hour: number, minute: number) => ({
    date: '2026-08-16',
    hour,
    minute,
  })

  it('is false before the reminder hour', () => {
    assert.equal(isDueForReminder(at(17, 59), 18, 0), false)
  })

  it('is true at the exact reminder time', () => {
    assert.equal(isDueForReminder(at(18, 0), 18, 0), true)
  })

  it('is true after the reminder time', () => {
    assert.equal(isDueForReminder(at(18, 1), 18, 0), true)
    assert.equal(isDueForReminder(at(23, 59), 18, 0), true)
  })

  it('respects a custom minute offset', () => {
    assert.equal(isDueForReminder(at(18, 0), 18, 15), false)
    assert.equal(isDueForReminder(at(18, 15), 18, 15), true)
  })
})
