import { getCookie, setResponseHeader } from '@tanstack/react-start/server'
import crypto from 'node:crypto'
import { eq } from 'drizzle-orm'

import { db } from '../../db/index'
import { sessions, users } from '../../db/schema'
import type { SessionUser } from '../../lib/types'

export const SESSION_COOKIE = 'wd_session'
const SESSION_DAYS = 30

export function readSessionToken(): string | null {
  return getCookie(SESSION_COOKIE) ?? null
}

export function setSessionCookie(token: string) {
  setResponseHeader(
    'Set-Cookie',
    [
      `${SESSION_COOKIE}=${token}`,
      'HttpOnly',
      'SameSite=Lax',
      'Path=/',
      `Max-Age=${SESSION_DAYS * 24 * 60 * 60}`,
    ].join('; '),
  )
}

export function clearSessionCookie() {
  setResponseHeader(
    'Set-Cookie',
    `${SESSION_COOKIE}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`,
  )
}

export function issueSessionToken(): string {
  return crypto.randomBytes(32).toString('base64url')
}

export async function createSession(userId: number): Promise<string> {
  const token = issueSessionToken()
  const now = Date.now()
  await db.insert(sessions).values({
    userId,
    token,
    expiresAt: now + SESSION_DAYS * 24 * 60 * 60 * 1000,
    createdAt: now,
  })
  return token
}

export async function revokeSession(token: string) {
  await db.delete(sessions).where(eq(sessions.token, token)).run()
}

export async function revokeAllSessions(userId: number) {
  await db.delete(sessions).where(eq(sessions.userId, userId)).run()
}

export async function getSessionUserFromToken(
  token: string,
): Promise<SessionUser | null> {
  const row = await db
    .select({
      id: sessions.id,
      userId: sessions.userId,
      expiresAt: sessions.expiresAt,
      username: users.username,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(eq(sessions.token, token))
    .get()

  if (!row) return null
  if (row.expiresAt < Date.now()) return null

  return { id: row.userId, username: row.username }
}

/** Reads the session from the current request's cookie. */
export async function getCurrentSession(): Promise<SessionUser | null> {
  const token = readSessionToken()
  if (!token) return null
  return getSessionUserFromToken(token)
}
