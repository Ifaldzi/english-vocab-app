import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import { chooseFromPools } from '../src/server/words/words'
import { buildOptions } from '../src/server/review/review'

describe('chooseFromPools (FR-2.2)', () => {
  it('picks the recall pool when the new pool is empty', () => {
    const pool = chooseFromPools([], ['r1', 'r2'], 0.1)
    assert.deepEqual(pool, ['r1', 'r2'])
  })

  it('picks the new pool when both exist (recall miss)', () => {
    // Force the random to miss the recall ratio: seed Math.random high.
    const original = Math.random
    Math.random = () => 0.99
    try {
      const pool = chooseFromPools(['n1', 'n2'], ['r1', 'r2'], 0.1)
      assert.deepEqual(pool, ['n1', 'n2'])
    } finally {
      Math.random = original
    }
  })

  it('picks the recall pool on a recall hit', () => {
    const original = Math.random
    Math.random = () => 0.01
    try {
      const pool = chooseFromPools(['n1', 'n2'], ['r1', 'r2'], 0.1)
      assert.deepEqual(pool, ['r1', 'r2'])
    } finally {
      Math.random = original
    }
  })

  it('returns an empty array when nothing remains', () => {
    assert.deepEqual(chooseFromPools([], [], 0.1), [])
  })

  it('picks the recall pool when the ratio is 1', () => {
    const original = Math.random
    Math.random = () => 0.5
    try {
      const pool = chooseFromPools(['n1'], ['r1'], 1)
      assert.deepEqual(pool, ['r1'])
    } finally {
      Math.random = original
    }
  })
})

describe('buildOptions (FR-6.2)', () => {
  const correct = 'Def A'

  it('returns exactly 4 options including the correct one', () => {
    const options = buildOptions(correct, ['D1', 'D2', 'D3', 'D4'], [])
    assert.equal(options.length, 4)
    assert.ok(options.includes(correct))
  })

  it('uses same-level distractors first', () => {
    const options = buildOptions(correct, ['D1', 'D2', 'D3'], [])
    for (const d of ['D1', 'D2', 'D3']) assert.ok(options.includes(d))
    assert.equal(new Set(options).size, 4)
  })

  it('falls back to any level when the same-level pool is small', () => {
    const options = buildOptions(correct, ['D1'], ['A1', 'A2', 'A3'])
    assert.equal(options.length, 4)
    assert.ok(options.includes(correct))
    assert.ok(options.includes('D1'))
  })

  it('dedupes identical definitions and tops up to 3 distractors', () => {
    const options = buildOptions(correct, ['D1', 'D1', 'D2'], ['D3', 'D4'])
    assert.equal(options.length, 4)
    assert.equal(new Set(options).size, 4)
  })

  it('does not include the correct definition as a distractor', () => {
    const options = buildOptions(correct, [correct, 'D1'], ['D2', 'D3', 'D4'])
    assert.equal(options.filter((o) => o === correct).length, 1)
    assert.equal(options.length, 4)
  })

  it('keeps 4 options even with many same-level distractors', () => {
    const options = buildOptions(correct, ['D1', 'D2', 'D3', 'D4', 'D5'], [])
    assert.equal(options.length, 4)
  })
})
