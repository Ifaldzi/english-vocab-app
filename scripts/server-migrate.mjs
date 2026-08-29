import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'

const dbPath = process.env.DATABASE_PATH
const migrationsFolder = process.env.MIGRATIONS_FOLDER

if (!dbPath || !migrationsFolder) {
  console.error('DATABASE_PATH and MIGRATIONS_FOLDER are required')
  process.exit(1)
}

const sqlite = new Database(dbPath)
sqlite.pragma('journal_mode = WAL')
migrate(drizzle(sqlite), { migrationsFolder })
console.log(`Migrations up to date for ${dbPath}`)
sqlite.close()
