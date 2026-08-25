import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import {
  Play,
  Layers,
  Flag,
  Target,
  Mountain,
  Anchor,
  Gem,
  Crown,
  Flame,
  Trophy,
  Award,
  GraduationCap,
  Star,
  Zap,
  Rocket,
} from 'lucide-react'

import { getProgressFn } from '../../server/progress.functions'

export const Route = createFileRoute('/_authenticated/progress')({
  component: ProgressPage,
})

const BADGE_ICONS: Record<string, React.ComponentType<{ size?: number }>> = {
  first_steps: Play,
  building_blocks: Layers,
  half_century: Flag,
  century: Target,
  climbing: Mountain,
  half_the_deck: Anchor,
  one_thousand: Gem,
  full_deck: Crown,
  streak_3: Flame,
  week_warrior: Trophy,
  monthly_devotion: Award,
  review_master: GraduationCap,
  level_5: Star,
  level_10: Zap,
  level_20: Rocket,
}

function ProgressPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['progress'],
    queryFn: getProgressFn,
  })

  if (isLoading) {
    return <p className="muted">Loading your progress…</p>
  }

  if (!data) return null

  const { stats, cefr, cefrTotals, badges, memorized, totalWords } = data
  const pct = totalWords > 0 ? Math.round((memorized / totalWords) * 100) : 0

  return (
    <div className="layout pgrid">
      <div className="card">
        <div className="level-head">
          <div className="level-badge">{stats.level}</div>
          <div className="grow">
            <div style={{ fontWeight: 800 }}>
              {stats.levelTitle} · Level {stats.level}
            </div>
            <div className="muted">
              {stats.xp} XP · {stats.xpToNext} XP to Level {stats.level + 1}
            </div>
          </div>
        </div>
        <div className="bar">
          <div style={{ width: `${levelPct(stats.xp, stats.level)}%` }} />
        </div>
        <div className="row mt" style={{ justifyContent: 'space-between' }}>
          <span className="muted">Lv {stats.level}</span>
          <span className="muted">Lv {stats.level + 1}</span>
        </div>
      </div>

      <div className="card">
        <h2 className="section" style={{ marginTop: 0 }}>
          Streaks
        </h2>
        <div
          className="stats"
          style={{ gridTemplateColumns: 'repeat(3,1fr)', marginTop: 8 }}
        >
          <div className="stat">
            <div className="num">{stats.streak}</div>
            <div className="lab">Current</div>
          </div>
          <div className="stat">
            <div className="num">{stats.longestStreak}</div>
            <div className="lab">Longest</div>
          </div>
          <div className="stat">
            <div className="num">{memorized}</div>
            <div className="lab">Memorized</div>
          </div>
        </div>
      </div>

      <div className="card fill">
        <div className="section-header">
          <h2 className="section" style={{ marginTop: 0 }}>
            Vocabulary progress
          </h2>
          <Link
            className="btn btn-ghost library-link"
            to="/vocabularies"
            search={{ q: '', level: 'all', page: 1 }}
          >
            View all vocabularies
          </Link>
        </div>
        <div className="row" style={{ alignItems: 'baseline' }}>
          <div style={{ fontWeight: 800, fontSize: 17 }} className="grow">
            {memorized} / {totalWords} memorized
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#a3a3a3' }}>
            {pct}%
          </div>
        </div>
        <div className="bar" style={{ marginTop: 10 }}>
          <div style={{ width: `${pct}%` }} />
        </div>

        <div style={{ marginTop: 16 }}>
          {cefr.map((row) => {
            const total =
              cefrTotals.find((c) => c.level === row.level)?.total ?? 0
            const bar = total > 0 ? Math.round((row.count / total) * 100) : 0
            return (
              <div className="level-row" key={row.level}>
                <span className={`chip ${row.level.toLowerCase()}`}>
                  {row.level}
                </span>
                <div className="bar">
                  <div style={{ width: `${Math.min(100, bar)}%` }} />
                </div>
                <span className="cnt">
                  {row.count} / {total}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      <div className="card fill">
        <h2 className="section" style={{ marginTop: 0 }}>
          Badges &amp; achievements
        </h2>
        <div className="badges">
          {badges.map((b) => {
            const Icon = BADGE_ICONS[b.code] ?? Star
            return (
              <div
                key={b.code}
                className={`badge-item${b.unlocked ? '' : ' locked'}`}
              >
                <div className="icon">
                  <Icon size={24} />
                </div>
                <div className="name">{b.name}</div>
                <div className="desc">{b.description}</div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function levelPct(xp: number, level: number): number {
  const start = (50 * level * (level - 1)) / 2
  const end = (50 * (level + 1) * level) / 2
  const span = end - start
  return Math.max(0, Math.min(100, Math.round(((xp - start) / span) * 100)))
}
