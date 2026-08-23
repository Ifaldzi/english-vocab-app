# WordDeck — Full Implementation Plan

Status: **In progress** — M1-M9 complete; all planned milestones are implemented.
Reference: `docs/PRD.md` (functional requirements) and `docs/mockup/` (UI reference).

---

## Legend

- `[ ]` — not started
- `[~]` — in progress / partial
- `[x]` — implemented (done in a previous session)

---

## Milestone 1 — Scaffold (DB, seed, app shell)

- [x] M1-1 TanStack Start app scaffold (Vite + Nitro), Tailwind, router.
- [x] M1-2 Drizzle schema for all tables: `users`, `sessions`, `words`,
      `user_words`, `daily_words`, `user_stats`, `badges`, `user_badges`
      (`src/db/schema.ts`).
- [x] M1-3 Word seed from `data/oxford_3000.json` → `words` (3306 rows,
      idempotent, validates required fields, `src/db/seed.ts`).
- [x] M1-4 Badge catalog seed (canonical names per FR-8.4).
- [x] M1-5 No-emoji design system (Lucide icons) — `src/styles.css`.

## Milestone 2 — Authentication (FR-1)

- [x] M2-1 Sign up with username + password (min 8 chars, bcrypt;
      username 3–20 alnum + underscore).
- [x] M2-2 Username unique, case-insensitive (`username_key` + unique index,
      clear "already taken" error).
- [x] M2-3 Log in (case-insensitive lookup, timing-safe compare).
- [x] M2-4 Session via signed `HttpOnly` 30-day cookie backed by `sessions`
      row (`src/server/session.ts`).
- [x] M2-5 Logout revokes cookie + session row.
- [x] M2-6 Protected routes redirect to `/login` (`beforeLoad` guard,
      `src/routes/_authenticated.tsx`).
- [x] M2-7 Open-redirect protection on `?redirect=` (login/signup).

## Milestone 3 — Daily Word Flow (FR-2, FR-3, FR-4)

- [x] M3-1 One daily word per user per calendar day (Asia/Jakarta default,
      `APP_TIMEZONE` configurable).
- [x] M3-2 Selection algorithm: new pool + recall pool, ~10% recall
      (`RECALL_PROBABILITY`), exclude shown-today, soft-avoid yesterday,
      recall-only when new pool empty (`src/server/words.ts`).
- [x] M3-3 Selection persisted → reloads show the same word.
- [x] M3-4 Flip card: front (word + level/kind chip, homograph suffix
      stripped) / back (definition, Indonesian, example) — `WordCard.tsx`.
- [x] M3-5 Sentence validation: keyword matching, min 4 tokens, variant +
      homograph handling, pluggable `validateSentence` (`src/server/validate.ts`).
- [x] M3-6 Pass → word marked memorized, XP/streak/badges updated, daily
      word closed; fail → feedback + unlimited retry (`src/server/study.ts`).
- [x] M3-7 Dashboard card front hides definition until opened — card shows
      `WordFront` only; modal reuses the flip card (definition on back,
      `Tap card to reveal`), and the already-memorized branch was fixed to
      actually flip. Stage hint styling added for the `.hint` class.

## Milestone 4 — Extra Words + XP/Levels/Streak (FR-5, FR-8.1–8.3)

- [x] M4-1 "Add more words" button requests an extra word immediately.
- [x] M4-2 **Unlimited extra words per day** — cap removed in
      `src/server/words.functions.ts`; each extra word uses the card +
      validation flow and awards XP (PRD FR-5.2).
- [x] M4-3 Extra words tracked in today's `daily_words` record.
- [x] M4-4 XP: +10 new word, +5 review, +20 daily-complete on top of +10
      (`src/server/gamification.ts`).
- [x] M4-5 Levels: cumulative threshold `50·N·(N−1)/2`, level titles
      (Novice → Lexicon Master).
- [x] M4-6 Streak: +1 per active calendar day, resets on miss,
      `longest_streak` record.
- [x] M4-7 Level progress bar in sidebar + dashboard.

## Milestone 5 — Review Mode (FR-6)

- [x] M5-1 Draws only from memorized words.
- [x] M5-2 MCQ: word + 4 options, 1 correct definition, 3 same-level
      distractors (fallback to any level), shuffled (`src/server/review.ts`).
- [x] M5-3 Immediate correct/incorrect feedback; correct = +5 XP +
      `review_count`/`last_reviewed_at`; incorrect = shows correct def, no XP.
- [x] M5-4 Served longest-since-last-review first (NULLs first); answered
      words excluded via `excludedWordIds`.
- [x] M5-5 Server selects/orders questions; attempts recorded in
      `daily_words` (`kind='review'`, status `memorized`/`failed`).
- [x] M5-6 Review completion screen with stats + "Review again".

## Milestone 6 — Badges + Progress Dashboard (FR-7, FR-8.4)

- [x] M6-1 Badges unlocked server-side (`unlockEligibleBadges`), canonical
      names/criteria per FR-8.4.
- [x] M6-2 Progress: memorized / total (3306) with %.
- [x] M6-3 CEFR breakdown (A1/A2/B1/B2) with per-level totals + bars.
- [x] M6-4 Level, XP, XP-to-next, current + longest streak (no per-week
      tally per FR-7.3).
- [x] M6-5 Badge grid with locked/unlocked states (Lucide icons).
- [x] M6-6 Recent activity feed (~10 events: memorized / reviewed / badge).

## Milestone 7 — Analytics (FR-9)

- [x] M7-1 Typed `analytics` client wrapper (`src/lib/analytics.ts`), no PII.
- [x] M7-2 `sign_up` event on successful registration.
- [x] M7-3 Server-side fallback via `/api/ga` Measurement Protocol endpoint.
- [x] M7-4 **Load gtag.js in the app shell when `GA_MEASUREMENT_ID` is set**
      — env-gated gtag.js `<script>` + inline config (`send_page_view: false`)
      in `src/routes/__root.tsx` head; `GtagPageView` fires `page_view` on
      route change (FR-9.1, FR-9.2).
- [x] M7-5 Wire GA env vars (`GA_MEASUREMENT_ID` / `GA4_MEASUREMENT_ID`) in
      `.env.local` + document; `vite.config.ts` `envPrefix` extended;
      `src/lib/env.ts` exposes the client-available id.

## Milestone 8 — Polish (Responsive, Edge States, Tests)

- [x] M8-1 Responsive pass: small-screen refinements added to
      `src/styles.css` (word size, modal padding, 3-col stats, stage min-height).
- [x] M8-2 Empty / edge states: review pool empty renders a friendly
      "Nothing to review yet" UI in `src/routes/_authenticated/review.tsx`
      (no crash).
- [x] M8-3 Match mockup details: chip text `n.` (no double period), hint
      "Tap to study ↻", success banner with XP/streak, "+ Another word" and
      "→ Back to today" links (via `onBackToToday` prop on `StudyModal`).
- [x] M8-4 Fix `src/components/WordCard.tsx` — chip renders `{word.kind}`
      directly; `kindLabel()` maps `n.` → `noun` etc. for the card type.
- [x] M8-5 Unit tests (Node `node:test` via `tsx`, `npm test`):
      `tests/validate.test.ts`, `tests/gamification.test.ts`,
      `tests/selection.test.ts` (28 passing).
- [x] M8-6 `integration-test.ts` rewritten — compiles clean; unused imports
      removed, `res.pass` guard before `xpEarned`/`newlyBadges`.
- [x] M8-7 Lint + typecheck + production build clean; `npm run build`
      succeeds; eslint config ignores `.output`/`.tanstack` build artifacts.

## Known Divergences to Resolve

1. ~~FR-5.2 Unlimited extra words~~ → resolved (M4-2).
2. ~~FR-9.1/9.2 gtag.js page-view tracking~~ → resolved (M7-4).
3. ~~`integration-test.ts` does not compile~~ → resolved (M8-6).

---

## Milestone 9 — AI Sentence Validation (FR-4)

- [x] M9-1 Define an async, vendor-neutral sentence-validation contract with
      structured `{ pass, reason?, correction? }` results; keep keyword matching
      as an independent deterministic adapter.
- [x] M9-2 Implement the Gemini adapter behind the AI boundary. Send only the
      target word, definition/metadata, and learner sentence; require structured
      output; validate and sanitize the response; apply a bounded request timeout.
- [x] M9-3 Add `SENTENCE_VALIDATOR=ai|keyword` configuration. The `ai` mode maps
      internally to Gemini for now; `GEMINI_API_KEY` and optional model settings
      remain server-only. Missing configuration, timeouts, provider failures, and
      malformed responses fall back to keyword validation.
- [x] M9-4 Update both sentence-validation call paths to await the async validator
      without changing the study/reward transaction semantics.
- [x] M9-5 Show optional grammar corrections and a concise AI-processing disclosure
      in the sentence form while preserving the existing retry/loading behavior.
- [x] M9-6 Add tests for meaning-first AI results, correction handling, malformed
      provider output, timeout/error fallback, configuration selection, and the
      unchanged keyword validator behavior.
- [x] M9-7 Document environment variables and privacy behavior; run tests, lint,
      typecheck, and production build.

---

## Suggested Execution Order

1. M4-2 (unlimited extra words) — quick, unlocks a PRD requirement.
2. M7-4/M7-5 (gtag.js + env vars) — completes FR-9.
3. M8-4/M8-3 (UI polish, chip text) — low effort, high visual impact.
4. M8-1/M8-2 (responsive + edge states).
5. M8-5/M8-6 (tests + fix integration-test).
6. M8-7 (final verification: lint, typecheck, build, smoke test).
7. M9-1…M9-7 (AI sentence validation).
