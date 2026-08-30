export type Level = 'A1' | 'A2' | 'B1' | 'B2'
export type ProgressLevel = Level
export type VocabularyFilterLevel = 'all' | Level

/** Primary parts of speech present in the Oxford seed (first token of `words.kind`). */
export type VocabularyFilterKind =
  | 'all'
  | 'n.'
  | 'v.'
  | 'adj.'
  | 'adv.'
  | 'pron.'
  | 'prep.'
  | 'conj.'
  | 'det.'
  | 'exclam.'
  | 'number'
  | 'modal v.'

export interface SessionUser {
  id: number
  username: string
}

export interface Word {
  id: number
  word: string
  level: Level
  kind: string
  definition: string
  indonesia: string
  sentenceExample: string
}

export interface VocabularyItem extends Word {
  memorized: boolean
  memorizedAt?: number
}

export interface VocabularyPage {
  items: VocabularyItem[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export interface StatsView {
  xp: number
  level: number
  streak: number
  longestStreak: number
}

export interface BadgeView {
  code: string
  name: string
  description: string
  unlocked: boolean
  unlockedAt?: number
}

export interface ActivityItem {
  id: string
  kind: 'memorized' | 'reviewed' | 'badge'
  word?: string
  badgeName?: string
  at: number
  status?: 'memorized' | 'failed'
}

export interface DashboardData {
  dailyWord: (Word & { status: 'shown' | 'memorized' | 'failed' }) | null
  totalMemorized: number
  totalWords: number
  pct: number
  cefr: { level: Level; count: number }[]
  stats: StatsView & { levelTitle: string; xpToNext: number }
  recentActivity: ActivityItem[]
}

export interface ProgressData {
  totalMemorized: number
  totalWords: number
  pct: number
  cefr: { level: Level; count: number }[]
  stats: StatsView & { levelTitle: string; xpToNext: number }
  badges: BadgeView[]
}

export interface ReviewQuestion {
  wordId: number
  word: string
  level: Level
  kind: string
  options: string[]
  correctIndex: number
  // For the client we don't send correctIndex; server validates.
  sessionId: string
}

export interface ReviewResult {
  correct: boolean
  xpEarned: number
  correctDefinition: string
  reviewCount: number
  newlyBadges: string[]
}

export interface StudyResult {
  pass: boolean
  reason?: string
  xpEarned: number
  totalXp: number
  level: number
  streak: number
  isDaily: boolean
  newlyBadges: string[]
}
