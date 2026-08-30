import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import {
  getVocabularyPageWindow,
  isVocabularyKind,
  isVocabularyLevel,
  matchesVocabularyKind,
  matchesVocabularyQuery,
} from '../src/server/vocabulary/vocabulary'

describe('vocabulary search', () => {
  it('matches case-insensitive English substrings', () => {
    assert.equal(matchesVocabularyQuery('Journey', 'jour'), true)
    assert.equal(matchesVocabularyQuery('Journey', 'NEY'), true)
    assert.equal(matchesVocabularyQuery('Journey', 'travel'), false)
  })

  it('treats search characters as literal substrings', () => {
    assert.equal(matchesVocabularyQuery('100% ready', '%'), true)
    assert.equal(matchesVocabularyQuery('100 percent ready', '%'), false)
  })
})

describe('vocabulary levels', () => {
  it('accepts the supported levels, excluding C1', () => {
    assert.equal(isVocabularyLevel('all'), false)
    assert.equal(isVocabularyLevel('A1'), true)
    assert.equal(isVocabularyLevel('C1'), false)
    assert.equal(isVocabularyLevel('C2'), false)
  })
})

describe('vocabulary kinds', () => {
  it('accepts supported primary kinds and rejects unknown ones', () => {
    assert.equal(isVocabularyKind('n.'), true)
    assert.equal(isVocabularyKind('modal v.'), true)
    assert.equal(isVocabularyKind('all'), false)
    assert.equal(isVocabularyKind('article'), false)
    assert.equal(isVocabularyKind('garbage'), false)
  })

  it('matches a single primary kind exactly', () => {
    assert.equal(matchesVocabularyKind('n.', 'n.'), true)
    assert.equal(matchesVocabularyKind('v.', 'n.'), false)
  })

  it('matches a kind stored before a comma or slash separator', () => {
    assert.equal(matchesVocabularyKind('n., v.', 'n.'), true)
    assert.equal(matchesVocabularyKind('det./pron.', 'det.'), true)
    assert.equal(matchesVocabularyKind('v., n.', 'v.'), true)
  })

  it('does not match a secondary kind or a different primary', () => {
    assert.equal(matchesVocabularyKind('n., v.', 'v.'), false)
    assert.equal(matchesVocabularyKind('adj./n.', 'n.'), false)
    assert.equal(matchesVocabularyKind('modal v.', 'v.'), false)
  })
})

describe('vocabulary pagination', () => {
  it('calculates the first page and total pages', () => {
    assert.deepEqual(getVocabularyPageWindow(3306, 1), {
      page: 1,
      pageSize: 6,
      totalPages: 551,
      offset: 0,
    })
  })

  it('clamps pages past the end of the result set', () => {
    assert.deepEqual(getVocabularyPageWindow(7, 10), {
      page: 2,
      pageSize: 6,
      totalPages: 2,
      offset: 6,
    })
  })

  it('uses page one as the empty-set page', () => {
    assert.deepEqual(getVocabularyPageWindow(0, 4), {
      page: 1,
      pageSize: 6,
      totalPages: 0,
      offset: 0,
    })
  })
})
