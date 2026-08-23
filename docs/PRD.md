# PRD — English Vocabulary Memorizer (working title: "WordDeck")

**Status:** Draft for AI validation review
**Author:** brainstormed with product owner
**Date:** 2026-08-23

---

## 1. Overview

A full-stack web app that helps the user gather and memorize English vocabulary.
Every day the app surfaces a **Word of the Day** as a flip card showing the word,
its English definition, Indonesian translation, and an example sentence. To close
the card, the user must write their own sentence using the word; a validator checks
that the word is genuinely used. The app tracks memorized vocabulary, XP, levels,
daily streaks, and badges to keep learning engaging. An optional **review mode**
lets the user re-practice words they have already memorized.

The UI is specified by a set of **static HTML mockups** in `docs/mockup/`
(`index.html` is the hub; screens: `login`, `dashboard`, `card`, `success`,
`failure`, `review`, `progress`). They define the visual direction — monochrome
base with a warm amber accent for rewards & CTAs — and serve as the reference
for the implemented UI. Numbers/words shown in the mockups are illustrative;
functional requirements in this document take precedence.

## 2. Goals & Non-Goals

### Goals (v1)

- Authenticated multi-user app with personal progress per user.
- Deliver one random Word of the Day per user per day, with a small chance of
  surfacing an already-memorized word (spaced recall).
- Flip-card word UI showing: word, level, part of speech, English definition,
  Indonesian translation, and example sentence.
- Sentence validation via a **vendor-agnostic AI validator** (Gemini initially)
  that checks meaning and word usage, with deterministic keyword matching as a
  fallback.
- Unlimited extra words per day ("Add more words").
- Review mode for previously memorized words.
- Gamification: XP, levels, daily streak, badges/achievements.
- Progress dashboard: total memorized vocabulary and breakdown by CEFR level.
- Seed the `words` table from the bundled Oxford 3000 dataset (3306 entries).
- **Indonesian translations** — guaranteed present for every word in the `words`
  table (backfill of the seed data is complete; 0 missing rows as of 2026-08-01).

### Non-Goals (v1)

- Spaced-repetition scheduling engine (future; see Roadmap).
- Social features, leaderboards, public profiles.
- Admin panel, word moderation workflows.
- Mobile app; the web UI will be responsive but web-first.

---

## 3. Personas

**Andi** — a non-native English speaker (Indonesian) preparing for exams. Learns a
little every day, on phone or laptop. Wants a lightweight daily habit with visible
progress and small wins (streaks, badges). Appreciates Indonesian translations as a
scaffold but practices by composing English sentences.

---

## 4. User Stories

1. As a user, I can create an account and log in so my progress is saved.
2. As a user, when I open the app I see my Word of the Day for today.
3. As a user, I can flip the card to see the definition, Indonesian translation,
   and example sentence.
4. As a user, I can write a sentence using the word; the app validates its meaning
   and usage, gives me pass/fail feedback, and optionally suggests a grammar
   correction (with retry on failure).
5. As a user, when I pass, the card is closed as "memorized" and I earn XP.
6. As a user, I can add more words any time during the day, unlimited.
7. As a user, I can enter review mode to re-practice already-memorized words via
   multiple-choice definition quizzes.
8. As a user, I can see my total memorized vocabulary and CEFR-level breakdown.
9. As a user, I can see my level, XP, streak, and badges to stay motivated.

---

## 5. Functional Requirements

### FR-1 Authentication

- **FR-1.1** Sign up with username + password (password min 8 chars, bcrypt-hashed;
  username 3–20 chars, alphanumeric + underscore). Username is **unique,
  case-insensitive** — the server stores a normalized key (lowercased) with a unique
  constraint, returns a clear "username already taken" error on conflict, and login
  matches case-insensitively (original casing preserved for display).
- **FR-1.2** Log in with username + password.
- **FR-1.3** Session via signed, `HttpOnly` cookie (30-day expiry) backed by a
  server-side `sessions` row (revocable on logout). Chosen over JWT: single-server
  app with no external API clients, so stateless tokens add no benefit, while
  sessions give real logout/revocation. Logout clears the cookie and the session row.
- **FR-1.4** Protected routes redirect unauthenticated users to `/login`.

### FR-2 Word of the Day

- **FR-2.1** Each user gets exactly one daily word per calendar day (day boundary =
  **Asia/Jakarta UTC+7** by default, configurable via `TZ`/`APP_TIMEZONE` env).
- **FR-2.2** Selection algorithm:
  1. **New pool** = words the user has never memorized.
  2. **Recall pool** = words the user has memorized.
  3. With ~10% probability pick from the recall pool, otherwise from the new pool
     (constant is configurable; chosen to keep old words fresh without drowning new
     learning).
  4. Exclude any word already shown today for that user.
  5. Soft-avoid repeating yesterday's daily word.
  6. If the new pool is empty, always pick from the recall pool.
- **FR-2.3** The selection is persisted so reloads show the same word until the next
  calendar day.

### FR-3 Word Card

- **FR-3.1** Card front shows the word + level/part-of-speech chip. Homograph
  suffixes are stripped for display (DB `can1` → card shows `can`); variants with
  commas display as-is (`a, an`).
- **FR-3.2** Card back shows English definition, Indonesian translation, and example
  sentence. Indonesian translation is **guaranteed present** for every seeded word
  (backfill milestone; see Goals).
- **FR-3.3** User flips the card to study, then must compose a sentence to close it.
- **FR-3.4** No phonetic transcription is displayed in v1 (the `words` table has no
  phonetic field; pronunciation is a post-v1 roadmap item).

### FR-4 Sentence Validation (AI with keyword fallback)

- **FR-4.1** Validation endpoint receives the word and the user's sentence.
- **FR-4.2** The deterministic keyword validator rules are:
  - Normalize: lowercase; strip punctuation into spaces; collapse whitespace.
  - **Word presence:** the word (or any of its comma-separated variants, e.g.
    `"a, an"` → `a` **or** `an`) must appear as a token in the sentence. Trailing
    homograph digits are stripped for matching (`can1` → matches `can`).
  - **Minimum length:** sentence must contain at least 4 tokens.
- **FR-4.3** The AI validator receives the target word, its English definition,
  relevant word metadata, and the user's sentence. It passes when the sentence
  demonstrates the target word's intended meaning. Natural inflections are
  accepted when they clearly represent the target word. Minor grammar or spelling
  errors do not fail an otherwise understandable sentence.
- **FR-4.4** The AI validator returns structured data containing `pass`, a concise
  learner-facing `reason` when useful, and an optional `correction` containing a
  corrected version of the sentence when grammar or spelling can be improved.
  Provider prose and unvalidated fields must never be sent directly to the UI.
- **FR-4.5** The active validator is selected by the vendor-neutral
  `SENTENCE_VALIDATOR` setting: `ai` uses the configured AI adapter and `keyword`
  uses deterministic keyword matching. The initial `ai` adapter is Gemini, but
  changing vendors must not require changes to the study flow or UI.
- **FR-4.6** If the AI adapter is not configured, times out, fails, or returns an
  invalid response, validation falls back to keyword matching. The user is not
  blocked by an external provider outage, and provider error details are not
  exposed in the UI.
- **FR-4.7** On pass: word marked memorized, XP awarded, daily word closed.
- **FR-4.8** On fail: user sees feedback and can retry as many times as they want.
- **FR-4.9** The sentence form briefly discloses that AI may process the sentence
  for meaning and usage checking. AI prompts, responses, and sentence content are
  not persisted or written to logs.

### FR-5 Extra Words

- **FR-5.1** "Add more words" button requests another random word immediately.
- **FR-5.2** Unlimited extra words per day; each uses the same card + validation flow
  and awards XP.
- **FR-5.3** Extra words are tracked in today's daily-words record (shown words).

### FR-6 Review Mode

- **FR-6.1** Review mode draws from the user's memorized words only.
- **FR-6.2** v1 format: multiple-choice definition quiz. The word is shown with
  4 answer choices; exactly one is the correct English definition, the other three
  are **distractors** drawn from other words (prefer same CEFR level, fall back to
  any level when the pool is small). Options are shuffled per question.
- **FR-6.3** On answer: immediate correct/incorrect feedback. A correct answer
  awards reduced XP (+5) and increments the word's review count
  (`user_words.review_count`, `last_reviewed_at`); an incorrect answer shows the
  correct definition and records a failed review (no XP).
- **FR-6.4** Words are served longest-since-last-review first; fully answered words
  of the current review session are not repeated in the same session.
- **FR-6.5** The **server** selects and orders review questions; the client only
  requests the next one. Every review attempt (correct and incorrect) is recorded
  in `daily_words` with `kind = 'review'` and `status = 'memorized' | 'failed'`, so
  the activity feed can include recent reviews.

### FR-7 Progress Dashboard

- **FR-7.1** Show: total memorized / total vocabulary (3306), with percentage.
- **FR-7.2** Breakdown of memorized words by CEFR level (A1 / A2 / B1 / B2).
- **FR-7.3** Show current level, XP, XP-to-next-level, current streak, and longest
  streak. Only these two streak figures are shown in v1 (no per-week tally).
- **FR-7.4** Badges grid with locked/unlocked states.
- **FR-7.5** Recent activity feed (last ~10 events: word memorized, badge earned).

### FR-8 Gamification

- **FR-8.1 XP**
  - +10 XP: memorize a new word (any source: daily or extra).
  - +5 XP: correct answer in review mode.
  - +20 XP: completing the daily Word of the Day. Awarded **on top of** the +10 when
    the daily word is newly memorized (+30 total for a fresh daily word); if the
    daily word was already memorized, only the +20 applies.
- **FR-8.2 Levels** — cumulative threshold: level **N** requires total XP of
  `50 × N × (N − 1) / 2` (i.e. to go from level N to N+1 costs `50 × N` XP).
  - L1 = 0 XP, L2 = 50, L3 = 150, L4 = 300, L5 = 500, …
  - Level titles: 1–4 Novice, 5–9 Apprentice, 10–19 Scholar, 20–34 Wordwright,
    35+ Lexicon Master.
- **FR-8.3 Streak** — increments each calendar day the user memorizes ≥ 1 word;
  resets on a missed day. `longest_streak` is kept as a best record.
- **FR-8.4 Badges** (unlocked server-side, announced in UI):
  - **First Steps** — memorize 1 word
  - **Building Blocks** — memorize 25 words
  - **Half Century** — memorize 50 words
  - **Century** — memorize 100 words
  - **Climbing** — memorize 250 words
  - **Half the Deck** — memorize 500 words
  - **One Thousand** — memorize 1000 words
  - **Full Deck** — memorize all 3306 words
  - **3-Day Streak** / **Week Warrior** (7 days) / **Monthly Devotion** (30 days)
  - **Review Master** — 50 correct review answers
  - **Level 5** / **Level 10** / **Level 20**
  - Badge names and criteria above are **canonical**; any badge labels shown in
    mockups (e.g. "Sentence Master") are illustrative and must match these.

### FR-9 Analytics (Google Analytics 4)

- **FR-9.1** Google Analytics 4 (gtag.js) is loaded in the app shell when a
  `GA_MEASUREMENT_ID` env var is configured, **in any environment** — production
  and localhost dev alike. Analytics is only disabled when the var is unset (e.g.
  CI, offline dev). Recommended practice: use a separate GA4 test property +
  measurement ID for localhost testing so dev traffic doesn't pollute production
  numbers.
- **FR-9.2** **Page views** are tracked automatically (GA4 default) so reports show
  active users, page views, and sessions — i.e. "how many users access the app".
- **FR-9.3** A `sign_up` event is fired on successful account creation so reports
  show "how many users registered" (counts registrations, not form submissions).
- **FR-9.4** **No PII** — events never include username, password, or other
  identifying fields. GA4's default anonymous `client_id` is used for users.
- **FR-9.5** Scope is deliberately minimal (page views + registration). Additional
  events (e.g. `login`, word memorized, badge earned) are possible later via the
  same `gtag('event', …)` helper without other changes.
- **FR-9.6** A small `analytics` client module wraps `gtag` so events are typed and
  the call sites stay framework-agnostic.

---

## 6. Data Model

```
users        id, username (unique, case-insensitive), username_key,
             password_hash, created_at

sessions     id, user_id FK, token, expires_at

words        id, word, level (A1/A2/B1/B2), kind, definition,
             indonesia, sentence_example          -- seeded from Oxford 3000

user_words   id, user_id FK, word_id FK, memorized_at, user_sentence,
             xp_earned, review_count, last_reviewed_at
             (unique: user_id + word_id)          -- "memorized" set

daily_words  id, user_id FK, date (YYYY-MM-DD), word_id FK,
             kind (daily|extra|review), status (shown|memorized|failed)
             (unique: user_id + date + word_id)

user_stats   user_id PK/FK, xp, level, streak, longest_streak,
             last_active_date

badges       code (unique), name, description, criteria
             -- static catalog seeded in DB

user_badges  id, user_id FK, badge_code FK, unlocked_at
             (unique: user_id + badge_code)
```

Indexes: `user_words(user_id)`, `daily_words(user_id, date)`,
`user_stats(user_id)`, `words(level)`.

---

## 7. Non-Functional Requirements

- **Responsive** — mobile-first layout; daily usage expected on phones.
- **Performance** — single-server SQLite; daily word lookup and stats queries are
  indexed and must return < 100 ms.
- **Security** — bcrypt password hashing; `HttpOnly`/`SameSite` session cookies;
  server-side authorization on all mutations (never trust the client for XP);
  unique constraint on `users.username_key` (case-insensitive); AI API keys are
  server-only environment variables and are never exposed to the client bundle.
- **Availability** — runs as a single Node process; SQLite file DB. AI validation
  is an optional external server-side dependency and keyword fallback keeps the
  learning flow available if it fails. Google Analytics remains non-blocking.
- **Privacy** — when AI validation is enabled, the user's sentence and required
  word context are sent to the configured AI provider for one validation request.
  Prompts and responses are not stored or logged, and the UI discloses this
  processing.
- **Maintainability** — typed end-to-end (TypeScript, Zod schemas), DB migrations
  via Drizzle, seed script idempotent.
- **Design: no emoji icons** — icons must use a real icon set (e.g. Lucide /
  Heroicons). Emoji must NOT be used as UI icons (buttons, nav, badges, stats,
  empty states). Emoji may only appear in user-generated content (e.g. text
  typed by the user).

---

## 8. Tech Stack

| Concern       | Choice                                              |
| ------------- | --------------------------------------------------- |
| Framework     | TanStack Start (full-stack, Vite + Nitro)           |
| Routing       | TanStack Router                                     |
| Server state  | TanStack Query                                      |
| UI            | React + TypeScript + Tailwind CSS                   |
| DB            | SQLite via better-sqlite3 + Drizzle ORM             |
| Validation    | Zod                                                 |
| Auth          | Custom: bcrypt + signed session cookies             |
| Analytics     | Google Analytics 4 via gtag.js (env-gated)          |
| AI validation | Vendor-neutral adapter; Gemini initially            |
| Seed data     | `data/oxford_3000.json` → `words` table (3306 rows) |

---

## 9. Milestones

1. **Scaffold** — TanStack Start app, Tailwind, DB + migrations + seed. Seed script
   asserts every row has non-empty `word`, `level`, `kind`, `definition`,
   `indonesia`, `sentence_example` (fails otherwise). Indonesian backfill is
   complete (0 missing rows as of 2026-08-01).
2. **Auth** — signup / login / logout / session guard.
3. **Daily word flow** — selection, flip card, sentence validation, close card.
4. **Extra words + XP/levels/streak** — gamification core.
5. **Review mode**.
6. **Badges + progress dashboard**.
7. **Polish** — responsive pass, empty/edge states, tests. UI must match the
   `docs/mockup/` mockups.
8. **AI sentence validation** — vendor-neutral async validator, Gemini adapter,
   structured meaning/grammar feedback, keyword fallback, privacy disclosure,
   configuration, and provider-mocked tests.

---

## 10. Roadmap (post-v1)

- Add additional AI providers behind the existing adapter without changing the
  study flow.
- Add AI validation rate limiting, cost controls, and an evaluation set for
  learner sentences.
- Spaced-repetition scheduling (SM-2) for review mode.
- CEFR-level filter and per-level daily word targets.
- Pronunciation audio (free TTS API).
- Dark/Light mode.
- Export learning data / Anki import.

---

## 11. Open Questions

- Final app name (placeholder used in UI until decided).
- Exact badge list / rewards beyond bragging rights.
