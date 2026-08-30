import {
  createFileRoute,
  Link,
  redirect as routerRedirect,
  useNavigate,
  useRouter,
} from '@tanstack/react-router'
import { useState } from 'react'
import type { FormEvent } from 'react'
import { loginFn } from '../server/auth/auth.functions'
import { trackEvent } from '../lib/analytics'
import { ThemeToggle } from '../components/ThemeToggle'

// Validate redirect target to prevent open redirect attacks.
function sanitizeRedirect(url: unknown): string {
  if (typeof url !== 'string' || !url.startsWith('/') || url.startsWith('//')) {
    return '/'
  }
  return url
}

export const Route = createFileRoute('/login')({
  validateSearch: (search: Record<string, unknown>) => {
    const redirect = sanitizeRedirect(search.redirect)
    return redirect === '/' ? {} : { redirect }
  },
  beforeLoad: ({ context, search }) => {
    if (context.user) {
      throw routerRedirect({ to: search.redirect ?? '/' })
    }
  },
  component: LoginPage,
})

function LoginPage() {
  const router = useRouter()
  const navigate = useNavigate()
  const search = Route.useSearch()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const res = await loginFn({ data: { username, password } })
      if ('error' in res) {
        setError(res.error)
        return
      }
      trackEvent('login', { method: 'password' })
      await router.invalidate()
      navigate({ to: search.redirect ?? '/' })
    } catch (err) {
      console.error(err)
      setError('Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="auth-wrap">
      <ThemeToggle />
      <div className="auth-card">
        <div className="auth-logo">
          <img
            className="logo-dark"
            src="/logo-dark.png"
            alt="WordDeck logo"
            width={46}
            height={46}
          />
          <img
            className="logo-light"
            src="/logo-light.png"
            alt="WordDeck logo"
            width={46}
            height={46}
          />
        </div>
        <h1>WordDeck</h1>
        <p className="sub">
          Gather &amp; memorize English vocabulary, one word a day.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              type="text"
              autoComplete="username"
              placeholder="e.g. andi_love_english"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>

          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && (
            <div
              className="banner failure mb"
              style={{ marginTop: 0, marginBottom: 12 }}
            >
              <span className="icon">!</span>
              <div>{error}</div>
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary mt-6"
            disabled={submitting}
          >
            {submitting ? 'Logging in…' : 'Log in'}
          </button>
        </form>

        <p className="auth-alt">
          Don't have an account? <Link to="/signup">Sign up</Link>
        </p>
      </div>
    </div>
  )
}
