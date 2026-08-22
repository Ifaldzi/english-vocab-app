import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import {
  keywordValidator,
  wordVariants,
  stripHomographSuffix,
} from '../src/server/validate'

describe('stripHomographSuffix', () => {
  it('strips trailing digits', () => {
    assert.equal(stripHomographSuffix('can1'), 'can')
  })
  it('leaves plain words untouched', () => {
    assert.equal(stripHomographSuffix('run'), 'run')
  })
})

describe('wordVariants', () => {
  it('splits comma-separated variants', () => {
    assert.deepEqual(wordVariants('a, an'), ['a', 'an'])
  })
  it('strips homograph digits per variant', () => {
    assert.deepEqual(wordVariants('can1, could'), ['can', 'could'])
  })
  it('dedupes nothing and drops empties', () => {
    assert.deepEqual(wordVariants(' , '), [])
  })
})

describe('keywordValidator', () => {
  it('passes a valid sentence with the word present', () => {
    const res = keywordValidator(
      'journey',
      'My journey to school every morning is long.',
    )
    assert.equal(res.pass, true)
  })

  it('matches a homograph-stripped variant', () => {
    const res = keywordValidator('can1', 'I can swim very well.')
    assert.equal(res.pass, true)
  })

  it('matches any comma-separated variant', () => {
    const res = keywordValidator('a, an', 'She bought an apple yesterday.')
    assert.equal(res.pass, true)
  })

  it('fails when the word is missing', () => {
    const res = keywordValidator('journey', 'The weather is nice today.')
    assert.equal(res.pass, false)
    assert.match(res.reason ?? '', /include the word/)
  })

  it('fails when below the 4-token minimum', () => {
    const res = keywordValidator('run', 'Run fast.')
    assert.equal(res.pass, false)
    assert.match(res.reason ?? '', /at least 4/)
  })

  it('ignores punctuation and case', () => {
    const res = keywordValidator('run', 'They RUN, quickly, everyday!')
    assert.equal(res.pass, true)
  })

  it('fails on an empty sentence', () => {
    const res = keywordValidator('run', '   ')
    assert.equal(res.pass, false)
  })
})
