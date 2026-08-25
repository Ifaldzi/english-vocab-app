import { createServerFn } from '@tanstack/react-start'
import bcrypt from 'bcryptjs'
import { eq } from 'drizzle-orm'
import { z } from 'zod'

import { db } from '../../db/index'
import { users } from '../../db/schema'
import { authMiddleware } from './auth-middleware'
import {
  createSession,
  getCurrentSession,
  setSessionCookie,
  revokeAllSessions,
  revokeSession,
  readSessionToken,
  clearSessionCookie,
} from './session'

const usernameSchema = z
  .string()
  .min(3)
  .max(20)
  .regex(
    /^[a-zA-Z0-9_]+$/,
    'Username can only contain letters, numbers, and underscores',
  )

const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')

const signupSchema = z.object({
  username: usernameSchema,
  password: passwordSchema,
})

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
})

export type AuthResult = { ok: true; username: string } | { error: string }

export const signupFn = createServerFn({ method: 'POST' })
  .validator(signupSchema)
  .handler(async ({ data }): Promise<AuthResult> => {
    const usernameKey = data.username.toLowerCase()
    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.usernameKey, usernameKey))
      .get()
    if (existing) {
      return { error: 'Username already taken.' } satisfies { error: string }
    }

    const passwordHash = await bcrypt.hash(data.password, 10)
    const now = Date.now()
    const result = await db
      .insert(users)
      .values({
        username: data.username,
        usernameKey,
        passwordHash,
        createdAt: now,
      })
      .returning({ id: users.id })
      .get()

    await revokeAllSessions(result.id)
    const token = await createSession(result.id)
    setSessionCookie(token)

    return { ok: true, username: data.username } satisfies {
      ok: true
      username: string
    }
  })

export const loginFn = createServerFn({ method: 'POST' })
  .validator(loginSchema)
  .handler(async ({ data }): Promise<AuthResult> => {
    const usernameKey = data.username.toLowerCase()
    const user = await db
      .select()
      .from(users)
      .where(eq(users.usernameKey, usernameKey))
      .get()

    // Always run a comparison to avoid timing-based enumeration.
    const hash =
      user?.passwordHash ??
      '$2b$10$CwTycUXWue0Thq.stStbqu0mg6Cx3R6aXv.Jc2v5KOa0Fy2YBHMsS'
    const ok = user ? await bcrypt.compare(data.password, hash) : false

    if (!user || !ok) {
      return { error: 'Invalid username or password.' } satisfies {
        error: string
      }
    }

    await revokeAllSessions(user.id)
    const token = await createSession(user.id)
    setSessionCookie(token)

    return { ok: true, username: user.username }
  })

export const logoutFn = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .handler(async () => {
    const token = readSessionToken()
    if (token) await revokeSession(token)
    clearSessionCookie()
    return { ok: true }
  })

/** Returns the currently authenticated user, or null. Safe to call unauthenticated. */
export const getUserFn = createServerFn({ method: 'GET' }).handler(async () => {
  const session = await getCurrentSession()
  if (!session) return null

  const user = await db
    .select({ id: users.id, username: users.username })
    .from(users)
    .where(eq(users.id, session.id))
    .get()
  return user ? { id: user.id, username: user.username } : null
})
