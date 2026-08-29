import { afterEach, describe, it } from 'node:test'
import assert from 'node:assert/strict'

import {
  isRateLimited,
  recordAttempt,
  LOGIN_MAX_ATTEMPTS,
  LOGIN_IP_MAX_ATTEMPTS,
  RATE_LIMIT_WINDOW_MS,
} from '../src/server/rate-limit'

const realNow = Date.now

afterEach(() => {
  Date.now = realNow
})

function setNow(value: number) {
  Date.now = () => value
}

describe('rate limiter', () => {
  it('allows attempts up to the limit', () => {
    for (let i = 0; i < LOGIN_MAX_ATTEMPTS; i++) {
      recordAttempt('login:alice', '1.1.1.1')
    }
    assert.equal(
      isRateLimited('login:alice', LOGIN_MAX_ATTEMPTS, '1.1.1.1'),
      false,
    )
  })

  it('blocks once the limit is exceeded', () => {
    for (let i = 0; i <= LOGIN_MAX_ATTEMPTS; i++) {
      recordAttempt('login:bob', '1.1.1.1')
    }
    assert.equal(
      isRateLimited('login:bob', LOGIN_MAX_ATTEMPTS, '1.1.1.1'),
      true,
    )
  })

  it('is scoped per IP', () => {
    for (let i = 0; i <= LOGIN_MAX_ATTEMPTS; i++) {
      recordAttempt('login:carol', '2.2.2.2')
    }
    assert.equal(
      isRateLimited('login:carol', LOGIN_MAX_ATTEMPTS, '2.2.2.2'),
      true,
    )
    assert.equal(
      isRateLimited('login:carol', LOGIN_MAX_ATTEMPTS, '3.3.3.3'),
      false,
    )
  })

  it('is scoped per key', () => {
    for (let i = 0; i <= LOGIN_MAX_ATTEMPTS; i++) {
      recordAttempt('login:dave', '4.4.4.4')
    }
    assert.equal(
      isRateLimited('login:dave', LOGIN_MAX_ATTEMPTS, '4.4.4.4'),
      true,
    )
    assert.equal(
      isRateLimited('login-ip', LOGIN_IP_MAX_ATTEMPTS, '4.4.4.4'),
      false,
    )
  })

  it('expires after the window elapses', () => {
    setNow(0)
    for (let i = 0; i <= LOGIN_MAX_ATTEMPTS; i++) {
      recordAttempt('login:eve', '5.5.5.5')
    }
    assert.equal(
      isRateLimited('login:eve', LOGIN_MAX_ATTEMPTS, '5.5.5.5'),
      true,
    )

    setNow(RATE_LIMIT_WINDOW_MS + 1)
    assert.equal(
      isRateLimited('login:eve', LOGIN_MAX_ATTEMPTS, '5.5.5.5'),
      false,
    )
  })
})
