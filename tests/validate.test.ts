import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import {
  keywordValidator,
  wordVariants,
  stripHomographSuffix,
} from '../src/server/validate'
import { createSentenceValidator } from '../src/server/sentence-validator.server'

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

describe('sentence validator selection', () => {
  const input = {
    word: 'journey',
    definition: 'an act of travelling from one place to another',
    sentence: 'My journey to school is long.',
  }

  it('uses the AI adapter and returns a correction', async () => {
    let prompt = ''
    const validator = createSentenceValidator({
      mode: 'ai',
      geminiApiKey: 'test-key',
      generateGeminiContent: async (value) => {
        prompt = value
        return JSON.stringify({
          pass: true,
          reason: 'The word is used in the correct meaning.',
          correction: 'My journey to school is long.',
        })
      },
    })

    const result = await validator(input)

    assert.equal(result.pass, true)
    assert.equal(result.correction, 'My journey to school is long.')
    assert.match(prompt, /journey/)
    assert.match(prompt, /My journey to school is long\./)
  })

  it('falls back to keyword validation for malformed AI output', async () => {
    const validator = createSentenceValidator({
      mode: 'ai',
      geminiApiKey: 'test-key',
      generateGeminiContent: async () => '{not-json',
    })

    const result = await validator(input)

    assert.equal(result.pass, true)
    assert.equal(result.correction, undefined)
  })

  it('falls back to keyword validation when the AI request fails', async () => {
    const validator = createSentenceValidator({
      mode: 'ai',
      geminiApiKey: 'test-key',
      generateGeminiContent: async () => {
        throw new Error('provider unavailable')
      },
    })

    const result = await validator(input)

    assert.equal(result.pass, true)
  })

  it('uses keyword validation when AI is not configured', async () => {
    const validator = createSentenceValidator({ mode: 'ai' })

    const result = await validator(input)

    assert.equal(result.pass, true)
  })

  it('allows explicitly selecting keyword validation', async () => {
    let called = false
    const validator = createSentenceValidator({
      mode: 'keyword',
      geminiApiKey: 'test-key',
      generateGeminiContent: async () => {
        called = true
        return JSON.stringify({ pass: false })
      },
    })

    const result = await validator(input)

    assert.equal(result.pass, true)
    assert.equal(called, false)
  })
})
