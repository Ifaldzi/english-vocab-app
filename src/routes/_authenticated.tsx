import {
  createFileRoute,
  Link,
  Outlet,
  redirect,
  useRouter,
  useLocation,
} from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Home, RotateCcw, BarChart3, LogOut, Flame } from 'lucide-react'

import { getProgressFn } from '../server/progress/progress.functions'
import { logoutFn } from '../server/auth/auth.functions'
import { ThemeToggle } from '../components/ThemeToggle'

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: ({ context, location }) => {
    if (!context.user) {
      throw redirect({
        to: '/login',
        search: {
          redirect: location.href,
        },
      })
    }
  },
  component: AuthenticatedLayout,
})

function AuthenticatedLayout() {
  const router = useRouter()
  const location = useLocation()
  const { user } = Route.useRouteContext()
  const pathname = location.pathname

  const { data: progress } = useQuery({
    queryKey: ['progress'],
    queryFn: getProgressFn,
  })

  const handleLogout = async () => {
    await logoutFn()
    await router.invalidate()
    router.navigate({ to: '/' })
  }

  const isHome = pathname === '/'
  const isReview = pathname === '/review'
  const isProgress = pathname === '/progress' || pathname === '/vocabularies'
  const isVocabulary = pathname === '/vocabularies'

  const topTitle = isHome
    ? 'Today'
    : isReview
      ? 'Review'
      : isVocabulary
        ? 'All vocabularies'
        : 'Progress'

  const stats = progress?.stats
  const memorized = progress?.memorized ?? 0

  const dateLabel = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <img
            className="logo-img logo-dark"
            src="/logo-dark.png"
            alt="Vocab Deck logo"
            width={36}
            height={36}
          />
          <img
            className="logo-img logo-light"
            src="/logo-light.png"
            alt="Vocab Deck logo"
            width={36}
            height={36}
          />
          <span>Vocab Deck</span>
        </div>
        <nav className="side-nav">
          <Link to="/" activeProps={{ className: 'active' }}>
            <span className="ico">
              <Home size={16} />
            </span>
            Home
          </Link>
          <Link to="/review" activeProps={{ className: 'active' }}>
            <span className="ico">
              <RotateCcw size={16} />
            </span>
            Review
          </Link>
          <Link to="/progress" className={isProgress ? 'active' : undefined}>
            <span className="ico">
              <BarChart3 size={16} />
            </span>
            Progress
          </Link>
        </nav>
        <div className="sidebar-foot">
          {stats && (
            <div className="mini-level">
              <div className="head">
                <span>Lv {stats.level}</span>
                <span>{stats.xp} XP</span>
              </div>
              <div className="bar">
                <div style={{ width: `${levelPct(stats.xp, stats.level)}%` }} />
              </div>
              <div className="lvl-name">{stats.levelTitle}</div>
            </div>
          )}
          {user && (
            <div className="side-user">
              <div className="avatar">
                {user.username.slice(0, 1).toUpperCase()}
              </div>
              <div className="side-user-meta">
                <b>{user.username}</b>
                <span>@{user.username}</span>
              </div>
              <button className="side-logout" onClick={handleLogout}>
                Logout
              </button>
            </div>
          )}
        </div>
      </aside>

      <div className="page">
        <div className="topbar">
          <div className="row">
            <span className="brand">
              <img
                className="logo-dark"
                src="/logo-dark.png"
                alt="Vocab Deck logo"
                width={22}
                height={22}
              />
              <img
                className="logo-light"
                src="/logo-light.png"
                alt="Vocab Deck logo"
                width={22}
                height={22}
              />
              Vocab Deck
            </span>
            <span className="top-title">{topTitle}</span>
            <span className="spacer" />
            <ThemeToggle />
            {isHome && stats ? (
              <span
                className="pill streak"
                title={`${stats.streak}-day streak`}
              >
                <Flame size={14} />
                {stats.streak}
              </span>
            ) : isReview ? (
              <span className="pill">{memorized} words to review</span>
            ) : (
              <span className="pill user">{user?.username}</span>
            )}
          </div>
          {isHome && (
            <div style={{ marginTop: 14 }}>
              <div style={{ fontSize: 13, opacity: 0.7 }}>{dateLabel}</div>
              <div style={{ fontSize: 20, fontWeight: 800, marginTop: 2 }}>
                Your Word of the Day
              </div>
            </div>
          )}
        </div>

        <main>
          <Outlet />
          <div className="nav">
            <Link to="/" className={isHome ? 'active' : ''}>
              <span className="ico">
                <Home size={18} />
              </span>
              Home
            </Link>
            <Link to="/review" className={isReview ? 'active' : ''}>
              <span className="ico">
                <RotateCcw size={18} />
              </span>
              Review
            </Link>
            <Link to="/progress" className={isProgress ? 'active' : ''}>
              <span className="ico">
                <BarChart3 size={18} />
              </span>
              Progress
            </Link>
            <button className={undefined} onClick={handleLogout}>
              <span className="ico">
                <LogOut size={18} />
              </span>
              Logout
            </button>
          </div>
        </main>
      </div>
    </div>
  )
}

function levelPct(xp: number, level: number): number {
  // Level N threshold = 50*N*(N-1)/2. Progress within the level's span.
  const start = (50 * level * (level - 1)) / 2
  const end = (50 * (level + 1) * level) / 2
  const span = end - start
  return Math.max(0, Math.min(100, Math.round(((xp - start) / span) * 100)))
}
