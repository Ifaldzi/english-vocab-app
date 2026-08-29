import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import {
  isAllowedGaEventName,
  sanitizeGaParams,
  MAX_GA_PARAMS,
} from '../src/server/ga-validation'

describe('isAllowedGaEventName', () => {
  it('accepts known event names', () => {
    for (const name of [
      'login',
      'sign_up',
      'extra_word',
      'word_memorized',
      'review_answer',
    ]) {
      assert.equal(isAllowedGaEventName(name), true)
    }
  })

  it('rejects unknown names', () => {
    assert.equal(isAllowedGaEventName('admin_delete'), false)
  })

  it('rejects non-strings', () => {
    assert.equal(isAllowedGaEventName(42), false)
    assert.equal(isAllowedGaEventName(undefined), false)
    assert.equal(isAllowedGaEventName(null), false)
  })
})

describe('sanitizeGaParams', () => {
  it('keeps primitive values', () => {
    assert.deepEqual(
      sanitizeGaParams({ method: 'password', xp: 10, correct: true }),
      { method: 'password', xp: 10, correct: true },
    )
  })

  it('drops nested objects and arrays', () => {
    assert.deepEqual(
      sanitizeGaParams({ method: 'password', nested: { a: 1 }, list: [1] }),
      { method: 'password' },
    )
  })

  it('drops non-object input', () => {
    assert.deepEqual(sanitizeGaParams('login'), {})
    assert.deepEqual(sanitizeGaParams(undefined), {})
    assert.deepEqual(sanitizeGaParams(null), {})
    assert.deepEqual(sanitizeGaParams([1, 2]), {})
  })

  it('caps the number of params', () => {
    const many: Record<string, number> = {}
    for (let i = 0; i < MAX_GA_PARAMS + 10; i++) many[`k${i}`] = i
    const out = sanitizeGaParams(many)
    assert.equal(Object.keys(out).length, MAX_GA_PARAMS)
  })
})
