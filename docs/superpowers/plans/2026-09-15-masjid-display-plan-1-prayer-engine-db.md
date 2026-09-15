# Masjid Display Plan 1 — Prayer Engine and Database Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add the internal deterministic Prayer Time Engine, canonical `prayer_settings`, atomic future schedule persistence, calibration, and additive database foundations without yet building the TV application.

**Architecture:** Prayerapp remains the source of truth. A server-only prayer-engine module wraps a pinned `adhan` dependency, converts explicit calculation settings into final `HH:MM` schedule rows, and persists only after Preview/Verification through database RPCs that are atomic and revision-aware. This plan is intentionally additive: legacy absolute-Iqama columns remain temporarily so the existing Admin stays functional until Plan 2 cuts consumers over.

**Tech Stack:** Next.js 16.3.3, TypeScript 5, React 19, Supabase/PostgreSQL, Vitest 4, `adhan` pinned exact version, existing `lib/date-utils.ts` timezone helpers.

## Branch / worktree assumptions

- Start from latest `main` after the approved design spec is available, or cherry-pick design commit `cfd68216f1c2c5e9a271c9b19670e12cf5e61ac3` if the spec PR has not merged yet.
- Create/use implementation branch `feat/masjid-display` in an isolated worktree.
- Do not implement on `docs/masjid-display-design`.
- Preserve current public prayer schedule behavior until the cutover task explicitly changes it.
- Do not drop legacy `*_iqama` columns in this plan.

## Task 1: Lock the astronomy dependency

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`

1. Add a test/contract note in the first prayer-engine test file asserting the wrapper, not direct library calls, is the public calculation boundary.
2. Install `adhan` as an **exact pinned version** (`npm install --save-exact adhan@<verified-current-version>`); do not use a caret range.
3. Run `npm install` and inspect the lockfile to confirm one resolved version.
4. Run `npm test -- --runInBand` only if the current script accepts it; otherwise run `npm test`.
5. Commit: `chore: pin prayer calculation dependency`.

## Task 2: Add canonical prayer settings schema

**Files:**
- Create: `supabase/migrations/20260915220000_masjid_display_prayer_settings.sql`
- Create: `lib/prayer-engine/settings-schema.test.ts`

1. Write a failing SQL-contract test that reads the migration text and asserts it defines singleton table `public.prayer_settings` with:
   - `id text primary key` constrained to `'1'`
   - latitude / longitude
   - IANA timezone
   - Fajr angle
   - Isha rule plus conditional angle/fixed-minute fields
   - Asr shadow factor/method
   - high-latitude rule
   - six calculation offsets
   - five mandatory non-negative Iqama delays
   - `calculation_revision`
   - `applied_calculation_revision`
   - `updated_at`
2. Run `npx vitest run lib/prayer-engine/settings-schema.test.ts`; expect failure because the migration does not exist yet.
3. Create the migration with database `CHECK` constraints for valid coordinates, bounded angles/offsets/delays, and mutually consistent Isha rule fields.
4. Enable RLS. Public clients must not be granted broad write access. Reads used by public UI should continue through existing server/domain boundaries; admin writes must use existing authorized server paths.
5. Seed exactly one row only if safe defaults are explicitly known. Otherwise create the table without inventing religious calculation values; Admin must show incomplete setup later.
6. Re-run the test and `supabase db reset` against the local project.
7. Commit: `feat: add canonical prayer settings schema`.

## Task 3: Add atomic generation/recalculation database RPCs

**Files:**
- Create: `supabase/migrations/20260915221000_prayer_schedule_atomic_generation.sql`
- Create: `lib/prayer-engine/persistence-contract.test.ts`

1. Write failing contract tests for two server-only RPCs:
   - `commit_prayer_schedule_extension(...)`
   - `commit_prayer_schedule_recalculation(...)`
2. Require each RPC to accept the approved row payload plus expected calculation revision/range basis and to execute in one PostgreSQL transaction.
3. Extension RPC rules:
   - recompute/validate first missing date from today forward at commit time;
   - reject if `calculation_revision != applied_calculation_revision`;
   - insert only missing dates;
   - reject any payload that would overwrite an existing date;
   - set `published = true` on inserted rows.
4. Recalculation RPC rules:
   - reject if expected revision no longer equals current revision;
   - update only the approved future range;
   - never touch past dates;
   - update `applied_calculation_revision` only after all rows succeed.
5. Explicitly revoke execute from `anon`/`authenticated` unless the repository's established privileged RPC pattern requires another controlled grant. Invoke through the server/service boundary only.
6. Run `npx vitest run lib/prayer-engine/persistence-contract.test.ts` and `supabase db reset`.
7. Commit: `feat: add atomic prayer schedule persistence`.

## Task 4: Define engine domain types and validation

**Files:**
- Create: `lib/prayer-engine/types.ts`
- Create: `lib/prayer-engine/validate-settings.ts`
- Create: `lib/prayer-engine/validate-settings.test.ts`
- Modify: `lib/types.ts`

1. Write failing tests for valid and invalid coordinates, Isha angle/fixed-minutes exclusivity, non-negative required Iqama delays, timezone validation, bounded offsets, and calculation revision values.
2. Define focused types such as `PrayerCalculationSettings`, `PrayerCalculationProfile`, `PrayerCalculationResult`, `PrayerSchedulePreview`, `PrayerScheduleDiff`, and `PrayerIqamaDelays`.
3. Keep these types separate from `PrayerTime` so calculation settings do not leak into public schedule rows.
4. Implement pure validation. Validate the IANA timezone using `Intl.DateTimeFormat` rather than maintaining a custom timezone list.
5. Run `npx vitest run lib/prayer-engine/validate-settings.test.ts`.
6. Commit: `feat: define prayer engine settings contract`.

## Task 5: Implement deterministic calculation and final rounding

**Files:**
- Create: `lib/prayer-engine/calculate.ts`
- Create: `lib/prayer-engine/rounding.ts`
- Create: `lib/prayer-engine/calculate.test.ts`
- Create: `lib/prayer-engine/rounding.test.ts`
- Reuse: `lib/date-utils.ts`

1. Write failing rounding tests:
   - `16:42:00` → `16:42`
   - `16:42:01` → `16:43`
   - `16:42:59` → `16:43`
2. Write failing deterministic calculation tests for one winter and one summer date using explicit coordinates/profile.
3. Implement the `adhan` adapter in one module only. No Admin/UI/display file may import `adhan` directly.
4. Apply calculation method parameters and per-prayer offsets before final minute ceiling.
5. Convert/interpret all instants under the configured IANA timezone; do not apply manual CET/CEST offsets.
6. Return Fajr, Sunrise, Dhuhr, Asr, Maghrib, and Isha only.
7. Re-run targeted tests twice to confirm identical output.
8. Commit: `feat: implement deterministic prayer calculation`.

## Task 6: Add generation range and gap logic

**Files:**
- Create: `lib/prayer-engine/generate.ts`
- Create: `lib/prayer-engine/generate.test.ts`

1. Write failing tests for:
   - empty future schedule starts at today;
   - internal gap wins over latest stored date;
   - existing rows are never included in extension writes;
   - repeated extension starts from the next first missing date;
   - exactly one calendar year of dates is produced from the resolved start date;
   - leap-year/year-boundary behavior.
2. Implement pure functions that accept existing dates plus calculation settings and return an immutable preview payload.
3. Keep `Preview` generation side-effect free; it must not write to Supabase.
4. Run `npx vitest run lib/prayer-engine/generate.test.ts`.
5. Commit: `feat: add prayer schedule generation previews`.

## Task 7: Add calibration and diff logic

**Files:**
- Create: `lib/prayer-engine/calibration.ts`
- Create: `lib/prayer-engine/calibration.test.ts`

1. Write failing tests comparing generated vs historical `PrayerTime` rows prayer-by-prayer in minutes.
2. Ensure differences across midnight or DST are compared as local scheduled instants, not naive string subtraction.
3. Produce a structured result with per-day/per-prayer delta and an `requiresInvestigation` flag for unexplained absolute deltas greater than one minute.
4. Add diff helpers for future recalculation Preview showing old/new values and changed prayer count.
5. Run `npx vitest run lib/prayer-engine/calibration.test.ts`.
6. Commit: `feat: add prayer engine calibration and diff`.

## Task 8: Add server data access for prayer settings and engine operations

**Files:**
- Create: `lib/data/prayer-settings.ts`
- Create: `lib/prayer-engine/server.ts`
- Create: `lib/prayer-engine/server.test.ts`
- Reuse: `lib/supabase/server.ts`
- Reuse: `lib/data/prayer-times.ts`

1. Write tests with mocked Supabase calls covering settings read/save, revision bump semantics, Preview generation with no writes, extension commit RPC call, and recalculation commit RPC call.
2. Implement singleton settings read/update functions.
3. Calculation-affecting changes increment `calculation_revision`; Iqama-delay-only changes do not.
4. Implement server-only orchestration functions:
   - `previewScheduleExtension()`
   - `commitScheduleExtension(previewTokenOrBasis)`
   - `previewFutureRecalculation()`
   - `commitFutureRecalculation(previewTokenOrBasis)`
   - `calibrateAgainstHistoricalSchedule(range)`
5. Revalidate settings and preview basis immediately before RPC commit.
6. Invalidate existing prayer-time caches only after successful commit.
7. Run `npx vitest run lib/prayer-engine/server.test.ts`.
8. Commit: `feat: wire prayer engine server operations`.

## Task 9: Add shared delay-derived Iqama helper without cutting legacy consumers yet

**Files:**
- Modify: `lib/prayer-utils.ts`
- Create/modify: `lib/__tests__/prayer-utils.test.ts`

1. Write failing tests for `deriveIqamaInstant(prayerDate, prayerTime, delayMinutes)` with delays 0, 1, 2, and a value crossing midnight.
2. Add a pure helper that uses the existing `zonedDateTime` path and adds delay minutes.
3. Do not silently fall back to legacy `PrayerTime.*Iqama` values.
4. Keep the existing legacy `getIqama()` export temporarily only if current pages still compile; mark it for removal in Plan 2, not as a fallback in new engine code.
5. Run the targeted test and the full test suite.
6. Commit: `feat: add delay-derived iqama calculation`.

## Task 10: Add canonical engine regression fixtures

**Files:**
- Create: `lib/prayer-engine/fixtures/degendorf-reference.ts`
- Create: `lib/prayer-engine/regression.test.ts`

1. Build fixtures only from reviewed historical Prayerapp schedule/reference data; do not invent expected prayer values.
2. Include winter, summer, DST-start, DST-end, solstice-adjacent, and year-boundary examples.
3. Test all six generated times and final rounding.
4. Document in the fixture source where each expected value came from and the calculation settings used.
5. Run `npx vitest run lib/prayer-engine/regression.test.ts`.
6. Commit: `test: lock prayer engine regression fixtures`.

## Task 11: Verify Plan 1 as a standalone deliverable

1. Run `npm test`.
2. Run `npm run lint`.
3. Run `npx tsc --noEmit`.
4. Run `npm run build`.
5. Run `supabase db reset` and inspect that existing prayer rows/Maghrib Program fields survive the additive migrations.
6. Manually execute the Preview path only; do **not** commit generated production data as part of verification.
7. Confirm no client-side file imports `adhan` and no new public endpoint exposes calculation coordinates/angles.
8. Commit any verification-only fixes separately: `fix: stabilize prayer engine foundation`.

## Exit criteria

- Prayer Engine calculations are deterministic and pinned to an exact library version.
- `prayer_settings` exists with strong constraints and revision semantics.
- Extend/recalculate Preview paths are side-effect free.
- Commit paths are atomic and revision-aware.
- Historical calibration can identify >1 minute differences.
- Shared delay-derived Iqama helper exists, but existing legacy UI remains operational until Plan 2.
- All existing tests/builds remain green.

**Next plan:** `2026-09-15-masjid-display-plan-2-admin-test-control.md`.