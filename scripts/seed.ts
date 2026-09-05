import { mkdirSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'

import { db, sqlite } from '../src/db/index'
import {
  seedBadges,
  seedWords,
  toSeedWord,
  validateSeedRows,
} from '../src/db/seed'
import type { SeedWordRaw } from '../src/db/seed'

const __dirname = dirname(fileURLToPath(import.meta.url))
const dataPath = resolve(__dirname, '../data/oxford_3000.json')
const migrationsPath = resolve(__dirname, '../drizzle')

function main() {
  const data = JSON.parse(readFileSync(dataPath, 'utf8')) as SeedWordRaw[]

  if (!Array.isArray(data)) {
    throw new Error('oxford_3000.json must be a JSON array')
  }

  console.log(`Loaded ${data.length} seed rows from oxford_3000.json`)

  const invalid = validateSeedRows(data)
  if (invalid.length > 0) {
    console.error(
      `Seed validation FAILED: ${invalid.length} rows missing fields. Example:`,
      invalid.slice(0, 5),
    )
    process.exit(1)
  }

  mkdirSync(dirname(sqlite.name), { recursive: true })

  migrate(db, { migrationsFolder: migrationsPath })
  console.log('Migrations applied')

  seedBadges()
  console.log(`Badges seeded (${15} catalog entries)`)

  const { inserted, updated } = seedWords(data.map(toSeedWord))
  console.log(`Words synced: ${updated} updated, ${inserted} inserted`)

  sqlite.close()
  console.log('Done')
}

main()
