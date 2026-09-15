# Masjid Display Plan 1 — Prayer Engine and Database Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add the internal deterministic Prayer Time Engine, canonical `prayer_settings`, atomic future-schedule persistence, calibration, and additive database foundations without yet building the TV application.

**Architecture:** Prayerapp remains the source of truth. A server-only prayer-engine module wraps exact-pinned `adhan@4.4.6`, converts explicit calculation settings into final `HH:MM` schedule rows, and persists only after Preview/Verification through database RPCs that are atomic and revision-aware. This plan is additive: legacy absolute-Iqama columns remain temporarily so existing Admin/public consumers keep working until Plan 2 completes the cutover.

**Tech Stack:** Next.js 16.3.3, TypeScript 5, React 19, Supabase/PostgreSQL, Vitest 4, `adhan@4.4.6`, existing `lib/date-utils.ts` timezone helpers.

## Branch / worktree assumptions

- Start from latest `main` after the approved design spec is available, or cherry-pick design commit `cfd68216f1c2c5e9a271c9b19670e12cf5e61ac3` if the spec PR has not merged yet.
- Create/use implementation branch `feat/masjid-display` in an isolated worktree.
- Do not implement on `docs/masjid-display-design`.
- Preserve current public prayer schedule behavior until the explicit cutover in Plan 2.
- Do not drop legacy `*_iqama` columns in this plan.

## Task 1: Lock the astronomy dependency

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `lib/prayer-engine/dependency-boundary.test.ts`

1. Write a failing contract test asserting only `lib/prayer-engine/calculate.ts` may import `adhan`; Admin/UI/display code must not import it directly.
2. Run `npx vitest run lib/prayer-engine/dependency-boundary.test.ts`; expect failure until the wrapper exists.
3. Install exactly: `npm install --save-exact adhan@4.4.6`.
4. Inspect `package.json`/lockfile: dependency must be exactly `4.4.6`, not a caret/range.
5. Commit: `chore: pin prayer calculation dependency`.

## Task 2: Add canonical prayer settings schema

**Files:**
- Create: `supabase/migrations/20260915220000_masjid_display_prayer_settings.sql`
- Create: `lib/prayer-engine/settings-schema.test.ts`

1. Write a failing SQL-contract test requiring singleton `public.prayer_settings` with `id='1'`, latitude/longitude, IANA timezone, Fajr angle, Isha rule/conditional fields, Asr method/factor, high-latitude rule, six calculation offsets, five mandatory non-negative Iqama delays, `calculation_revision`, `applied_calculation_revision`, and `updated_at`.
2. Run `npx vitest run lib/prayer-engine/settings-schema.test.ts`; expect failure.
3. Create the migration with strong `CHECK` constraints for coordinates, calculation ranges, delay/offset ranges, and mutually consistent Isha fields.
4. Enable RLS and do not grant anonymous/authenticated write authority.
5. Do not invent calculation defaults. If reviewed safe values are not already authoritative, leave setup incomplete for Admin configuration.
6. Run the targeted test and `supabase db reset`.
7. Commit: `feat: add canonical prayer settings schema`.

## Task 3: Add atomic generation/recalculation RPCs

**Files:**
- Create: `supabase/migrations/20260915221000_prayer_schedule_atomic_generation.sql`
- Create: `lib/prayer-engine/persistence-contract.test.ts`

1. Write failing contract tests for server-only RPCs `commit_prayer_schedule_extension(...)` and `commit_prayer_schedule_recalculation(...)`.
2. Extension RPC must revalidate first missing future date at commit time, reject revision mismatch, insert only missing dates, reject overwrites, and publish inserted rows.
3. Recalculation RPC must reject stale expected revision, update only the approved future range, never touch past dates, and set `applied_calculation_revision` only after successful completion.
4. Both paths are one PostgreSQL transaction: any row/validation failure rolls back all changes.
5. Revoke direct execute from public roles; invoke through the authorized server/service boundary.
6. Run `npx vitest run lib/prayer-engine/persistence-contract.test.ts` and `supabase db reset`.
7. Commit: `feat: add atomic prayer schedule persistence`.

## Task 4: Define engine types and settings validation

**Files:**
- Create: `lib/prayer-engine/types.ts`
- Create: `lib/prayer-engine/validate-settings.ts`
- Create: `lib/prayer-engine/validate-settings.test.ts`
- Modify: `lib/types.ts`

1. Write failing tests for coordinates, Isha angle/fixed-minutes exclusivity, five required delays including zero, IANA timezone validation, bounded offsets, and revisions.
2. Define focused `PrayerCalculationSettings`, `PrayerCalculationProfile`, `PrayerCalculationResult`, `PrayerSchedulePreview`, `PrayerScheduleDiff`, and `PrayerIqamaDelays` types.
3. Keep calculation settings separate from `PrayerTime` runtime rows.
4. Validate timezone with `Intl.DateTimeFormat` rather than a hand-maintained list.
5. Run targeted tests.
6. Commit: `feat: define prayer engine settings contract`.

## Task 5: Implement deterministic calculation and final rounding

**Files:**
- Create: `lib/prayer-engine/calculate.ts`
- Create: `lib/prayer-engine/rounding.ts`
- Create: `lib/prayer-engine/calculate.test.ts`
- Create: `lib/prayer-engine/rounding.test.ts`
- Reuse: `lib/date-utils.ts`

1. Write failing rounding tests: exact `16:42:00 -> 16:42`, `16:42:01 -> 16:43`, `16:42:59 -> 16:43`.
2. Write deterministic winter/summer calculation tests with explicit coordinates/profile.
3. Implement the only `adhan` adapter in `calculate.ts`.
4. Apply selected calculation behavior and six minute offsets before final ceiling.
5. Resolve output under configured IANA timezone; never add manual CET/CEST hours.
6. Return only Fajr, Sunrise, Dhuhr, Asr, Maghrib, Isha.
7. Run targeted tests twice to confirm identical results.
8. Re-run `dependency-boundary.test.ts` and require PASS.
9. Commit: `feat: implement deterministic prayer calculation`.

## Task 6: Add generation range/gap logic

**Files:**
- Create: `lib/prayer-engine/generate.ts`
- Create: `lib/prayer-engine/generate.test.ts`

1. Write failing tests: empty schedule starts at today; first internal gap wins; existing dates are excluded from extension writes; repeated extension starts at next gap; one calendar year is generated; leap/year boundaries are correct.
2. Implement pure preview functions accepting existing dates + explicit settings.
3. Preview must have zero Supabase writes.
4. Run targeted tests.
5. Commit: `feat: add prayer schedule generation previews`.

## Task 7: Add calibration and diff logic

**Files:**
- Create: `lib/prayer-engine/calibration.ts`
- Create: `lib/prayer-engine/calibration.test.ts`

1. Write failing tests comparing generated vs historical rows prayer-by-prayer in minutes.
2. Compare local scheduled instants correctly across DST/midnight; do not subtract `HH:MM` strings naively.
3. Return per-day/per-prayer delta plus `requiresInvestigation` for unexplained absolute delta >1 minute.
4. Add future recalculation diff helpers showing old/new values and change counts.
5. Run targeted tests.
6. Commit: `feat: add prayer engine calibration and diff`.

## Task 8: Add server settings/engine orchestration

**Files:**
- Create: `lib/data/prayer-settings.ts`
- Create: `lib/prayer-engine/server.ts`
- Create: `lib/prayer-engine/server.test.ts`
- Reuse: `lib/supabase/server.ts`
- Reuse: `lib/data/prayer-times.ts`

1. Write mocked-Supabase tests for settings read/save, revision bump semantics, side-effect-free previews, extension RPC, recalculation RPC, and calibration.
2. Calculation-affecting settings increment `calculation_revision`; Iqama-delay-only edits do not.
3. Implement `previewScheduleExtension`, `commitScheduleExtension`, `previewFutureRecalculation`, `commitFutureRecalculation`, and `calibrateAgainstHistoricalSchedule`.
4. Revalidate settings/revision/range basis immediately before commit.
5. Invalidate prayer caches only after successful commit.
6. Run targeted tests.
7. Commit: `feat: wire prayer engine server operations`.

## Task 9: Add delay-derived Iqama helper, without cutting legacy consumers yet

**Files:**
- Modify: `lib/prayer-utils.ts`
- Create/modify: `lib/__tests__/prayer-utils.test.ts`

1. Write failing tests for `deriveIqamaInstant(prayerDate, prayerTime, delayMinutes)` with delays 0/1/2 and a midnight crossing.
2. Implement using existing `zonedDateTime` and real instant arithmetic.
3. Never fall back to legacy absolute `PrayerTime.*Iqama` values in the new helper.
4. Retain legacy `getIqama()` only temporarily if current consumers require it to compile; Plan 2 removes it after cutover.
5. Run targeted + full tests.
6. Commit: `feat: add delay-derived iqama calculation`.

## Task 10: Add reviewed regression fixtures

**Files:**
- Create: `lib/prayer-engine/fixtures/degendorf-reference.ts`
- Create: `lib/prayer-engine/regression.test.ts`

1. Build expected values only from reviewed historical Prayerapp/reference data; never invent prayer values.
2. Include representative winter, summer, DST-start, DST-end, solstice-adjacent, and year-boundary dates.
3. Record fixture source and exact calculation settings in the fixture module.
4. Test all six final stored times and rounding.
5. Commit: `test: lock prayer engine regression fixtures`.

## Task 11: Verify Plan 1

1. Run `npm test`.
2. Run `npm run lint`.
3. Run `npx tsc --noEmit`.
4. Run `npm run build`.
5. Run `supabase db reset`; verify existing prayer rows and Maghrib Program fields survive additive migrations.
6. Exercise Preview only; do not write generated production data during verification.
7. Run `git grep -n "from ['\"]adhan['\"]" -- app components lib`; expected production import location is only the engine adapter.
8. Verify no public API exposes coordinates/angles.
9. Commit any stabilization fix separately.

## Exit criteria

- `adhan@4.4.6` is exact-pinned and isolated behind one server/domain adapter.
- `prayer_settings` exists with constraints and revision semantics.
- Preview is side-effect free; commits are atomic and revision-aware.
- Calibration surfaces >1-minute unexplained deltas.
- Delay-derived Iqama helper exists while legacy UI remains temporarily operational for Plan 2 cutover.
- Existing root tests/builds remain green.

**Next plan:** `2026-09-15-masjid-display-plan-2-admin-test-control.md`.