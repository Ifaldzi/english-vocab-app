import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'

import * as schema from './schema'

export {
  sql,
  eq,
  and,
  or,
  not,
  gte,
  lte,
  asc,
  desc,
  isNull,
  count,
  inArray,
} from 'drizzle-orm'

export const sqlite = new Database(
  process.env.DATABASE_PATH ?? './data/worddeck.db',
)

sqlite.pragma('journal_mode = WAL')
sqlite.pragma('foreign_keys = ON')

export const db = drizzle(sqlite, { schema })

export type DB = typeof db
