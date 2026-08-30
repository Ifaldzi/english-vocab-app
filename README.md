# Vocab Deck — English Vocabulary Memorizer

A full-stack web app that helps you gather and memorize English vocabulary using daily word cards, sentence validation, and gamification.

## Features

- **Word of the Day** — random word with spaced recall (~10% chance of reviewing memorized words)
- **Flip Card UI** — word, level, definition, Indonesian translation, example sentence
- **Sentence Validation** — write your own sentence to prove you understand the word
- **Extra Words** — add unlimited words per day
- **Review Mode** — multiple-choice definition quiz for previously memorized words
- **Gamification** — XP, levels, daily streaks, and 15 achievement badges
- **Progress Dashboard** — total memorized, CEFR level breakdown, activity feed

## Tech Stack

| Concern    | Choice                                  |
| ---------- | --------------------------------------- |
| Framework  | TanStack Start (Vite + Nitro)           |
| Routing    | TanStack Router (file-based)            |
| UI         | React + TypeScript + Tailwind CSS       |
| DB         | SQLite via better-sqlite3 + Drizzle ORM |
| Validation | Zod                                     |
| Auth       | bcrypt + signed session cookies         |
| Analytics  | Google Analytics 4 (env-gated)          |

## Getting Started

```bash
# Install dependencies
npm install

# Set up database (create .env.local if needed)
# DATABASE_PATH=./data/worddeck.db  (optional, this is the default)

# Run migrations and seed data
npx tsx scripts/seed.ts

# Start dev server
npm run dev
```

App runs at `http://localhost:3000`.

## Database

### Environment Variables

| Variable             | Description                                  | Default                                                |
| -------------------- | -------------------------------------------- | ------------------------------------------------------ |
| `DATABASE_PATH`      | Path to SQLite database file                 | `./data/worddeck.db`                                   |
| `APP_TIMEZONE`       | Timezone for daily word                      | `Asia/Jakarta` (UTC+7)                                 |
| `GA_MEASUREMENT_ID`  | Google Analytics ID                          | _(disabled)_                                           |
| `GA4_MEASUREMENT_ID` | Server-side Google Analytics measurement ID  | _(disabled)_                                           |
| `GA4_API_SECRET`     | Server-only Google Analytics API secret      | _(disabled)_                                           |
| `SENTENCE_VALIDATOR` | Sentence validator mode: `ai` or `keyword`   | `ai` when `GEMINI_API_KEY` is set, otherwise `keyword` |
| `GEMINI_API_KEY`     | Server-only Gemini API key for AI validation | _(keyword fallback)_                                   |
| `GEMINI_MODEL`       | Gemini model used by the AI adapter          | `gemini-3.5-flash-lite`                                |

When AI validation is enabled, the user's sentence and word context are sent to
Gemini for checking. Sentences and provider responses are not stored or logged;
the app falls back to keyword validation if Gemini is unavailable.

### Commands

```bash
npm run db:generate   # Generate migration from schema changes
npm run db:migrate    # Apply pending migrations
npm run db:push       # Push schema directly (no migration files)
npm run db:studio     # Open Drizzle Studio (GUI)
npx tsx scripts/seed.ts  # Seed words + badges
```

## Scripts

```bash
npm run dev           # Start dev server
npm run build         # Build for production
npm run preview       # Preview production build
npm run lint          # Run ESLint
npm run format        # Format with Prettier
npm run check         # Check formatting
npm run test          # Run tests
```

## Project Structure

```
src/
├── components/       # UI components (WordCard, etc.)
├── db/               # Drizzle schema, seed, migrations
├── lib/              # Shared utilities (env, types, analytics)
├── routes/           # File-based routes (TanStack Router)
├── server/           # Server functions (auth, study, review, etc.)
└── integrations/     # TanStack Query/Devtools setup
data/
└── oxford_3000.json  # 3306 Oxford 3000 words (seed data)
docs/
├── PRD.md            # Product requirements
├── mockup/           # Static HTML mockups
└── plan/             # Development plan
drizzle/              # Generated SQL migrations
tests/                # Test files
```

## License

Private
