# WordDeck Vocabulary Library Implementation Plan

Status: **Awaiting approval**

This plan covers the vocabulary library described by PRD FR-7.6 through
FR-7.11 and the reference mockup `docs/mockup/vocabularies.html`. This file is
intentionally separate from `docs/plan/PLAN.md`.

## Scope

Build an authenticated `/vocabularies` page that lets a user:

- Browse every row in `words`, alphabetically by English word.
- See the English word, Indonesian translation, CEFR level, part of speech, and
  whether the word is memorized for the current user.
- Search by a case-insensitive English substring only.
- Filter by one level: All levels, A1, A2, B1, B2, or C1.
- Browse results with numbered pagination and previous/next controls.
- Open any result in a detail modal.
- Start the existing flip-card and sentence-validation flow for an unmemorized
  word without leaving the library page.
- Keep memorized words browseable, but do not offer a second memorization action.

The existing `words`, `user_words`, `daily_words`, and gamification tables are
enough for this feature. No database table or migration is planned.

## Existing Baseline

- `src/db/schema.ts` already stores all word metadata and the per-user
  memorization relation.
- `src/server/progress.ts` and `progress.functions.ts` provide the existing
  authenticated progress query pattern.
- `src/components/WordCard.tsx` provides the reusable word front/back content.
- `StudyModal` currently lives inside
  `src/routes/_authenticated/index.tsx` and submits through
  `submitSentenceFn`.
- `src/routes/_authenticated.tsx` owns desktop sidebar, mobile bottom nav, and
  page titles.
- `src/styles.css` contains the shared dark/amber visual system, modal styles,
  responsive breakpoints, and progress-card styles.
- `src/routeTree.gen.ts` is generated and must be refreshed by the route
  generator rather than edited manually.

## Design Decisions

### Route and URL state

- Add the authenticated file route `src/routes/_authenticated/vocabularies.tsx`
  at `/vocabularies`.
- Keep `q`, `level`, and `page` in the route search params. This makes the
  current library view reloadable, shareable, and consistent with TanStack
  Router navigation.
- Normalize invalid or missing search values to `q=''`, `level='all'`, and
  `page=1`.
- Changing the search text or level filter always navigates to page 1.
- If a result page becomes invalid after a filter/search change, clamp the
  requested page to the available range and render that page consistently.
- Use typed `Link`/route search navigation and preserve existing search values
  when changing only the page.

### Server query contract

- Add a server-only query helper in `src/server/vocabulary.ts`.
- Add an authenticated `getVocabularyFn` in
  `src/server/vocabulary.functions.ts` using `authMiddleware`.
- Validate the request on the server. The accepted input will be equivalent to:

  ```ts
  {
    query: string // trimmed, bounded length
    level: 'all' | 'A1' | 'A2' | 'B1' | 'B2' | 'C1'
    page: number // positive integer
    pageSize: number // fixed server-approved size
  }
  ```

- Use a fixed page size for the feature (the mockup shows six cards; use six
  unless implementation review changes this) and do not allow the client to
  request an unbounded page.
- Search only `words.word`, with a case-insensitive substring match. Escape
  wildcard characters so user input is treated as literal text rather than a
  SQL pattern.
- Apply the level filter to `words.level`; the C1 option must work against
  compatible future data even though the current Oxford seed has no C1 rows.
- Sort by `words.word` ascending and use `words.id` as a deterministic tie
  breaker.
- Count the filtered word set and select only the requested page.
- Left-join `user_words` for the authenticated user so unmemorized words are
  retained. Do not put the user relation predicate in a way that turns the
  query into an inner join.
- Return a serializable payload containing:

  ```ts
  {
    items: Array<
      Word & {
        memorized: boolean
        memorizedAt?: number
      }
    >
    total: number
    page: number
    pageSize: number
    totalPages: number
  }
  ```

- Return no user sentence or other private study data in the library response.
- Keep the authenticated response private/no-store; never mark it as publicly
  cacheable because memorization status is user-specific.

### C1 type support

- Extend the shared vocabulary level type to include `C1`, while keeping the
  progress breakdown limited to the currently required A1-B2 rows.
- Replace any progress-level typing that assumes every `Level` is one of the
  four current seed levels with an explicit progress-level list/type.
- Do not change the database schema, since `words.level` is already stored as
  text and the seed remains A1-B2.

### Learning from the library

- Extract the current `StudyModal` from the dashboard route into a reusable
  component, keeping its current behavior for daily and extra words.
- Add a source/presentation option so the same modal can be titled "Learn this
  word" for the library instead of incorrectly presenting it as the Word of the
  Day.
- Library learning will call the existing `submitSentenceFn` with `kind: 'extra'`.
  This uses the existing `daily_words` contract, awards the normal +10 XP for a
  newly memorized word, updates streaks/badges, and avoids introducing an
  unsupported third study kind. It does not award the +20 daily completion XP.
- The server remains authoritative for word ownership, validation, XP, and
  memorization. The library must never mark a card memorized locally without a
  successful server response.
- After a successful library study, invalidate the vocabulary query and the
  existing progress query so the card status, totals, badges, XP, and streak
  update on the next render.
- Preserve the existing retry, loading, AI disclosure, correction feedback,
  keyboard flip, Escape close, and outside-click modal behavior.
- Memorized detail modals hide "Learn this word" and show the existing Review
  guidance instead.

## Implementation Steps

### 1. Shared types and server query

- Update `src/lib/types.ts` for C1-compatible vocabulary levels and the library
  item/payload shape if shared types are useful at the client boundary.
- Add `src/server/vocabulary.ts` with the filtered count/page query, mapping DB
  rows into the public response shape.
- Add `src/server/vocabulary.functions.ts` with input validation and
  `authMiddleware`.
- Reuse `displayWord` for display formatting while retaining the raw word for
  the English search query.

### 2. Reusable study modal

- Move the dashboard's `StudyModal` and its supporting local state/handlers to
  a shared component file, likely `src/components/StudyModal.tsx`.
- Keep `WordFront` and `WordBack` as the content primitives.
- Make the modal source label and post-save callbacks configurable without
  duplicating the validation flow.
- Update `src/routes/_authenticated/index.tsx` to import the extracted modal
  and verify daily/extra behavior remains unchanged.

### 3. Vocabulary route

- Create `src/routes/_authenticated/vocabularies.tsx`.
- Add route search validation for query, level, and page.
- Use a TanStack Query key containing all effective filter and pagination values.
- Render the mockup structure:
  - Back to Progress link.
  - "All vocabularies" heading and explanatory copy.
  - Total-word chip.
  - English search field with accessible label.
  - Single-select level filter.
  - Result count and memorized/to-learn legend.
  - Responsive vocabulary-card grid.
  - Explicit no-results state.
  - Numbered pagination with current-page state and previous/next controls.
- Each vocabulary card must be a keyboard-accessible button. It must show:
  - Level chip and part-of-speech chip.
  - Memorized or To learn status badge.
  - Display-formatted English word.
  - Indonesian translation.
  - Memorized-relative-time or "Not memorized" footer.
- Add the detail modal with focusable close control, accessible dialog labels,
  level/kind/status, translation, definition, example, and conditional learn
  action.
- Open the reusable study modal from the detail modal for unmemorized words and
  close the detail modal before opening the study modal to avoid stacked modal
  interaction.

### 4. Navigation and Progress entry point

- Add a typed `Link` labeled "View all vocabularies" to the Vocabulary progress
  section in `src/routes/_authenticated/progress.tsx`.
- Update `src/routes/_authenticated.tsx` so `/vocabularies`:
  - Uses the top title "All vocabularies".
  - Keeps Progress highlighted in the desktop and mobile navigation.
  - Retains the existing authenticated layout and user/level context.
- Regenerate `src/routeTree.gen.ts` after adding the route; do not hand-edit the
  generated file.

### 5. Styling and responsive behavior

- Add library styles to `src/styles.css`, based on the mockup's existing visual
  language rather than adding a separate design system.
- Cover section header, back link, search/filter controls, result metadata,
  status badges, card grid, subdued unmemorized cards, empty state, pagination,
  detail modal, and C1 chip styling.
- Match the mockup's two-column card grid on larger content widths and one-column
  layout on narrow screens.
- Stack search/filter controls and result metadata on small screens.
- Add `input[type='search']` to the shared input treatment and ensure visible
  focus states for controls and card buttons.
- Use Lucide icons for search, arrows, close, and status affordances; do not
  introduce emoji UI icons.
- Respect the existing modal overlay behavior and prevent page scrolling while
  a library/detail/study modal is open.

## Tests

Add focused tests without requiring a browser for the pure/query contract
pieces, following the existing `node:test` and `tsx` conventions.

- Test search pattern escaping and case-insensitive English substring behavior.
- Test level filtering, including an empty C1 result set.
- Test alphabetical ordering and deterministic ordering for equal spellings.
- Test page-size slicing, total count, total-pages calculation, first/last page,
  and out-of-range page handling.
- Test that a user with no `user_words` row receives `memorized: false` and that
  a matching user row receives `memorized: true` with its timestamp.
- Test that the left join does not exclude unmemorized words.
- Test that invalid server input is rejected and page/page-size bounds are
  enforced.
- Preserve and rerun existing validation/gamification tests to verify the
  extracted study modal did not alter server-side reward behavior.

If a direct DB integration test is added, use an isolated temporary database or
the repository's existing test setup and assert the serialized server response,
not only TypeScript types.

## Verification

After implementation and approval:

1. Run `npm run test`.
2. Run `npm run lint`.
3. Run `npx tsc --noEmit` if available in the repository environment.
4. Run `npm run build` to regenerate/check the route tree and production bundle.
5. Manually smoke-test authenticated desktop and mobile flows:
   - Progress link opens the library.
   - Search and level changes reset to page 1.
   - C1 shows an explicit empty state with current seed data.
   - Pagination preserves active filters.
   - Memorized and unmemorized cards have the correct visual treatment.
   - Detail modal works for both statuses.
   - Library learning uses the flip card, validates sentences, awards the
     expected XP, and refreshes library/progress status.
   - Escape, outside click, keyboard card flipping, and modal transitions work.

No implementation changes or commit should be made until this plan is
approved. Once implementation is approved, changes should remain uncommitted
until the user explicitly confirms that the implementation is ready to commit.
