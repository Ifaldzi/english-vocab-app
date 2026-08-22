import { db } from './index'
import { badges, words } from './schema'

/** Badge catalog — canonical per PRD FR-8.4. */
export const BADGE_CATALOG = [
  {
    code: 'first_steps',
    name: 'First Steps',
    description: 'Memorize your first word',
    criteria: 'memorize_count >= 1',
  },
  {
    code: 'building_blocks',
    name: 'Building Blocks',
    description: 'Memorize 25 words',
    criteria: 'memorize_count >= 25',
  },
  {
    code: 'half_century',
    name: 'Half Century',
    description: 'Memorize 50 words',
    criteria: 'memorize_count >= 50',
  },
  {
    code: 'century',
    name: 'Century',
    description: 'Memorize 100 words',
    criteria: 'memorize_count >= 100',
  },
  {
    code: 'climbing',
    name: 'Climbing',
    description: 'Memorize 250 words',
    criteria: 'memorize_count >= 250',
  },
  {
    code: 'half_the_deck',
    name: 'Half the Deck',
    description: 'Memorize 500 words',
    criteria: 'memorize_count >= 500',
  },
  {
    code: 'one_thousand',
    name: 'One Thousand',
    description: 'Memorize 1000 words',
    criteria: 'memorize_count >= 1000',
  },
  {
    code: 'full_deck',
    name: 'Full Deck',
    description: 'Memorize all 3306 words',
    criteria: 'memorize_count >= 3306',
  },
  {
    code: 'streak_3',
    name: '3-Day Streak',
    description: 'Memorize a word 3 days in a row',
    criteria: 'streak >= 3',
  },
  {
    code: 'week_warrior',
    name: 'Week Warrior',
    description: 'Memorize a word 7 days in a row',
    criteria: 'streak >= 7',
  },
  {
    code: 'monthly_devotion',
    name: 'Monthly Devotion',
    description: 'Memorize a word 30 days in a row',
    criteria: 'streak >= 30',
  },
  {
    code: 'review_master',
    name: 'Review Master',
    description: 'Get 50 correct review answers',
    criteria: 'review_count >= 50',
  },
  {
    code: 'level_5',
    name: 'Level 5',
    description: 'Reach level 5',
    criteria: 'level >= 5',
  },
  {
    code: 'level_10',
    name: 'Level 10',
    description: 'Reach level 10',
    criteria: 'level >= 10',
  },
  {
    code: 'level_20',
    name: 'Level 20',
    description: 'Reach level 20',
    criteria: 'level >= 20',
  },
]

/** Raw shape as it appears in data/oxford_3000.json */
export interface SeedWordRaw {
  word: string
  level: string
  kind: string
  definition: string
  indonesia: string
  sentence_example: string
}

/** Shape expected by the Drizzle insert (camelCase matching schema keys). */
export interface SeedWord {
  word: string
  level: string
  kind: string
  definition: string
  indonesia: string
  sentenceExample: string
}

export function toSeedWord(raw: SeedWordRaw): SeedWord {
  return {
    word: raw.word,
    level: raw.level,
    kind: raw.kind,
    definition: raw.definition,
    indonesia: raw.indonesia,
    sentenceExample: raw.sentence_example,
  }
}

/** Returns the rows that are missing a required field (empty array = valid). */
export function validateSeedRows(rows: SeedWordRaw[]) {
  return rows.flatMap((w, i) => {
    const missing: string[] = []
    if (!w.word) missing.push('word')
    if (!w.level) missing.push('level')
    if (!w.kind) missing.push('kind')
    if (!w.definition) missing.push('definition')
    if (!w.indonesia) missing.push('indonesia')
    if (!w.sentence_example) missing.push('sentence_example')
    return missing.length ? [{ index: i, word: w.word, missing }] : []
  })
}

/** Idempotent — safe to run on every server start. */
export function seedBadges() {
  for (const badge of BADGE_CATALOG) {
    db.insert(badges)
      .values(badge)
      .onConflictDoUpdate({
        target: badges.code,
        set: {
          name: badge.name,
          description: badge.description,
          criteria: badge.criteria,
        },
      })
      .run()
  }
}

/** Idempotent word seed. Throws if any row is missing a required field. */
export function seedWords(rows: SeedWord[]) {
  const existing = db.select({ id: words.id }).from(words).limit(1).get()
  if (existing) {
    return 0
  }

  const CHUNK = 500
  for (let i = 0; i < rows.length; i += CHUNK) {
    db.insert(words)
      .values(rows.slice(i, i + CHUNK))
      .run()
  }

  return rows.length
}

export { badges, words }
export { db } from './index'
