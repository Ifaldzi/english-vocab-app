import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import {
  getVocabularyPageWindow,
  isVocabularyLevel,
  matchesVocabularyQuery,
} from '../src/server/vocabulary'

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
  it('accepts the supported levels, including C1', () => {
    assert.equal(isVocabularyLevel('all'), false)
    assert.equal(isVocabularyLevel('A1'), true)
    assert.equal(isVocabularyLevel('C1'), true)
    assert.equal(isVocabularyLevel('C2'), false)
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
