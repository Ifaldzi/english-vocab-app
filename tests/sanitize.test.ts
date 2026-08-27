import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import { sanitizeStoredText } from '../src/lib/sanitize'

describe('sanitizeStoredText', () => {
  it('trims surrounding whitespace', () => {
    assert.equal(sanitizeStoredText('  hello world  '), 'hello world')
  })

  it('collapses internal whitespace runs', () => {
    assert.equal(
      sanitizeStoredText('hello\n\t  world'),
      'hello world',
    )
  })

  it('strips control characters', () => {
    assert.equal(
      sanitizeStoredText('a\u0000b\u0007c\u001Fd\u007Fe'),
      'abcde',
    )
  })

  it('keeps normal punctuation intact', () => {
    assert.equal(sanitizeStoredText('Hello, world!'), 'Hello, world!')
  })

  it('handles empty/blank input', () => {
    assert.equal(sanitizeStoredText(''), '')
    assert.equal(sanitizeStoredText('   '), '')
  })
})