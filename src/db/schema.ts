import { relations } from 'drizzle-orm'
import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core'

// ---------- users ----------

export const users = sqliteTable(
  'users',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    username: text('username').notNull(),
    usernameKey: text('username_key').notNull(),
    passwordHash: text('password_hash').notNull(),
    createdAt: integer('created_at').notNull(),
  },
  (table) => [uniqueIndex('users_username_key_unique').on(table.usernameKey)],
)

// ---------- sessions ----------

export const sessions = sqliteTable(
  'sessions',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    token: text('token').notNull(),
    expiresAt: integer('expires_at').notNull(),
    createdAt: integer('created_at').notNull(),
  },
  (table) => [index('sessions_user_id_idx').on(table.userId)],
)

// ---------- words (seeded from Oxford 3000) ----------

export const words = sqliteTable(
  'words',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    word: text('word').notNull(),
    level: text('level').notNull(),
    kind: text('kind').notNull(),
    definition: text('definition').notNull(),
    indonesia: text('indonesia').notNull(),
    sentenceExample: text('sentence_example').notNull(),
  },
  (table) => [index('words_level_idx').on(table.level)],
)

// ---------- user_words (the "memorized" set) ----------

export const userWords = sqliteTable(
  'user_words',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    wordId: integer('word_id')
      .notNull()
      .references(() => words.id, { onDelete: 'cascade' }),
    memorizedAt: integer('memorized_at').notNull(),
    userSentence: text('user_sentence').notNull(),
    xpEarned: integer('xp_earned').notNull().default(0),
    reviewCount: integer('review_count').notNull().default(0),
    lastReviewedAt: integer('last_reviewed_at'),
  },
  (table) => [
    uniqueIndex('user_words_user_word_unique').on(table.userId, table.wordId),
    index('user_words_user_id_idx').on(table.userId),
  ],
)

// ---------- daily_words ----------

export const dailyWords = sqliteTable(
  'daily_words',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    date: text('date').notNull(), // YYYY-MM-DD
    wordId: integer('word_id')
      .notNull()
      .references(() => words.id, { onDelete: 'cascade' }),
    kind: text('kind').notNull(), // daily | extra | review
    status: text('status').notNull(), // shown | memorized | failed
    createdAt: integer('created_at').notNull(),
  },
  (table) => [
    uniqueIndex('daily_words_user_date_word_unique').on(
      table.userId,
      table.date,
      table.wordId,
    ),
    index('daily_words_user_date_idx').on(table.userId, table.date),
  ],
)

// ---------- user_stats ----------

export const userStats = sqliteTable('user_stats', {
  userId: integer('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  xp: integer('xp').notNull().default(0),
  level: integer('level').notNull().default(1),
  streak: integer('streak').notNull().default(0),
  longestStreak: integer('longest_streak').notNull().default(0),
  lastActiveDate: text('last_active_date'),
})

// ---------- badges (static catalog) ----------

export const badges = sqliteTable('badges', {
  code: text('code').primaryKey(),
  name: text('name').notNull(),
  description: text('description').notNull(),
  criteria: text('criteria').notNull(),
})

// ---------- user_badges ----------

export const userBadges = sqliteTable(
  'user_badges',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    badgeCode: text('badge_code')
      .notNull()
      .references(() => badges.code, { onDelete: 'cascade' }),
    unlockedAt: integer('unlocked_at').notNull(),
  },
  (table) => [
    uniqueIndex('user_badges_user_badge_unique').on(
      table.userId,
      table.badgeCode,
    ),
  ],
)

// ---------- relations ----------

export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
  userWords: many(userWords),
  dailyWords: many(dailyWords),
  userStats: many(userStats),
}))

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}))

export const wordsRelations = relations(words, ({ many }) => ({
  userWords: many(userWords),
  dailyWords: many(dailyWords),
}))

export const userWordsRelations = relations(userWords, ({ one }) => ({
  user: one(users, { fields: [userWords.userId], references: [users.id] }),
  word: one(words, { fields: [userWords.wordId], references: [words.id] }),
}))

export const dailyWordsRelations = relations(dailyWords, ({ one }) => ({
  user: one(users, { fields: [dailyWords.userId], references: [users.id] }),
  word: one(words, { fields: [dailyWords.wordId], references: [words.id] }),
}))

export const userStatsRelations = relations(userStats, ({ one }) => ({
  user: one(users, { fields: [userStats.userId], references: [users.id] }),
}))

export const userBadgesRelations = relations(userBadges, ({ one }) => ({
  user: one(users, { fields: [userBadges.userId], references: [users.id] }),
  badge: one(badges, {
    fields: [userBadges.badgeCode],
    references: [badges.code],
  }),
}))
