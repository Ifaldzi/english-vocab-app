import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import {
  levelFromXp,
  xpForLevel,
  xpForNextLevel,
  levelTitle,
  todayKey,
} from '../src/server/gamification'

describe('level curve (FR-8.2)', () => {
  it('maps cumulative XP thresholds to levels', () => {
    assert.equal(levelFromXp(0), 1)
    assert.equal(levelFromXp(49), 1)
    assert.equal(levelFromXp(50), 2) // L2 = 50
    assert.equal(levelFromXp(149), 2)
    assert.equal(levelFromXp(150), 3) // L3 = 150
    assert.equal(levelFromXp(299), 3)
    assert.equal(levelFromXp(300), 4) // L4 = 300
    assert.equal(levelFromXp(499), 4)
    assert.equal(levelFromXp(500), 5) // L5 = 500
  })

  it('computes thresholds from the formula 50·N·(N−1)/2', () => {
    assert.equal(xpForLevel(1), 0)
    assert.equal(xpForLevel(2), 50)
    assert.equal(xpForLevel(3), 150)
    assert.equal(xpForLevel(4), 300)
    assert.equal(xpForLevel(5), 500)
    assert.equal(xpForNextLevel(4), 500)
  })

  it('is monotonic for large XP', () => {
    let prev = 0
    for (let xp = 0; xp <= 100000; xp += 1111) {
      const lvl = levelFromXp(xp)
      assert.ok(lvl >= prev, `level ${lvl} < previous ${prev}`)
      prev = lvl
    }
  })
})

describe('level titles (FR-8.2)', () => {
  it('uses the canonical titles', () => {
    assert.equal(levelTitle(1), 'Novice')
    assert.equal(levelTitle(4), 'Novice')
    assert.equal(levelTitle(5), 'Apprentice')
    assert.equal(levelTitle(9), 'Apprentice')
    assert.equal(levelTitle(10), 'Scholar')
    assert.equal(levelTitle(19), 'Scholar')
    assert.equal(levelTitle(20), 'Wordwright')
    assert.equal(levelTitle(34), 'Wordwright')
    assert.equal(levelTitle(35), 'Lexicon Master')
    assert.equal(levelTitle(100), 'Lexicon Master')
  })
})

describe('todayKey (FR-2.1)', () => {
  it('returns a YYYY-MM-DD key', () => {
    const key = todayKey(new Date('2026-08-16T12:00:00Z'))
    assert.match(key, /^\d{4}-\d{2}-\d{2}$/)
  })
})
