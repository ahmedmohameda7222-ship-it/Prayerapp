# Masjid Display Plan 2 — Admin, Content Extensions, Iqama Cutover, and TV Test Control Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Expose the approved Prayer Engine workflows in Prayerapp Admin, add display/content settings, cut Prayerapp from absolute Iqama times to shared delays, and add the Admin-controlled synthetic real-TV Test Mode without writing fake production content.

**Architecture:** Admin remains in root Prayerapp using existing auth/server-action patterns. `masjid_display_settings` owns only TV behavior. Test Mode is a separate ephemeral singleton control plane: Admin writes one synthetic scenario; the TV later reads a public read-only projection every ~2 seconds. Legacy absolute-Iqama storage is removed only after all application consumers are converted and the deployment gate confirms the five shared delays are configured in the target environment.

**Tech Stack:** Existing Next.js Admin pages/server actions, TypeScript, Supabase, Vitest/Testing Library, Prayer Engine from Plan 1.

## Branch / prerequisite assumptions

- Continue on `feat/masjid-display` after Plan 1 is green.
- `prayer_settings`, engine Preview/commit functions, and `deriveIqamaInstant` already exist.
- This plan does not create the TV project.
- Destructive legacy-Iqama removal is a separate end-of-plan deployment checkpoint; do not deploy that migration before shared Iqama delays are configured and root Prayerapp consumers are verified on the delay model.

## Task 1: Add display/content/test-control database schema

**Files:**
- Create: `supabase/migrations/20260915222000_masjid_display_admin_schema.sql`
- Create: `lib/__tests__/masjid-display-admin-schema.test.ts`

1. Write a failing migration-contract test for:
   - singleton `public.masjid_display_settings`;
   - five mandatory prayer-in-progress durations constrained to **2–120 minutes inclusive**;
   - `azkar_playlist_ids text[] not null default '{}'`;
   - Announcement `display_style`, `display_from`, `display_until`;
   - Campaign nullable `end_date`, nullable `donation_url`;
   - `mosque_settings.public_app_url`;
   - singleton `public.masjid_display_test_state` with scenario, synthetic payload JSONB, `started_at`, `expires_at`, enabled flag, `updated_at`.
2. Constraints: `display_style in ('normal','special')`; `display_until > display_from` when both exist; durations 2–120; test expiry after start when enabled.
3. RLS: no anon/authenticated writes to display settings/test state; Test Control is exposed through a route, not a direct table grant.
4. Preserve existing public read semantics for published content.
5. Run `npx vitest run lib/__tests__/masjid-display-admin-schema.test.ts` and `supabase db reset`.
6. Commit: `feat: add masjid display admin schema`.

## Task 2: Extend domain types and data mappers

**Files:**
- Modify: `lib/types.ts`
- Modify: `lib/data/announcements.ts`
- Modify: `lib/data/donations.ts`
- Modify: `lib/data/mosque-settings.ts`
- Create: `lib/data/masjid-display-settings.ts`
- Create: `lib/data/masjid-display-test-state.ts`
- Create: `lib/__tests__/masjid-display-data-contract.test.ts`

1. Write failing mapper tests for new Announcement scheduling/style fields, Campaign optional end date + donation URL, mosque public app URL, display settings, and test state.
2. Add narrow types: `AnnouncementDisplayStyle`, optional `displayFrom/displayUntil`, optional `donationUrl/endDate`, `MasjidDisplaySettings`, discriminated `MasjidDisplayTestScenario`, `MasjidDisplayTestState`.
3. Keep test payload strongly discriminated by scenario at the TypeScript boundary; do not pass arbitrary JSON through application code.
4. Use existing cache invalidation/data-layer conventions.
5. Run targeted tests.
6. Commit: `feat: extend display content data contracts`.

## Task 3: Add shared AR+DE publication validation

**Files:**
- Create: `lib/masjid-display/content-validation.ts`
- Create: `lib/masjid-display/content-validation.test.ts`
- Modify: `app/admin/announcements/actions.ts`
- Modify: `app/admin/events/actions.ts`
- Modify: `app/admin/donations/actions.ts`

1. Write failing pure tests requiring complete Arabic + German for every **published** Announcement, Event, and Donation Campaign because there is no `show_on_masjid_display` opt-in.
2. Mandatory published fields:
   - Announcement: AR+DE title and message;
   - Event: AR+DE title, description, location;
   - Campaign: AR+DE title and description.
3. Draft/unpublished records may remain incomplete.
4. Wire existing create/update/publish actions through this validator and return actionable errors.
5. Never auto-translate or copy one language into another.
6. Run targeted tests.
7. Commit: `feat: enforce bilingual display publication rules`.

## Task 4: Build Prayer Engine Admin

**Files:**
- Create: `app/admin/prayer-engine/page.tsx`
- Create: `app/admin/prayer-engine/actions.ts`
- Create: `app/admin/prayer-engine/__tests__/page.test.tsx`
- Modify: `app/admin/page.tsx`
- Reuse: `lib/auth/use-admin-auth.ts`
- Reuse: `lib/auth/admin-actions.ts`
- Reuse: `lib/prayer-engine/server.ts`

1. Write failing UI tests for all explicit calculation fields, six offsets, five delays including 0, sync warning, Calibration, Extend Preview→Save, Recalculate Preview/Diff→Confirm.
2. Use existing Admin auth/style conventions.
3. Preview actions are side-effect free.
4. Preview displays exact date range, row count, diff/change count, and representative rows.
5. Block Extend while revisions differ.
6. Saving calculation settings marks `Needs Recalculation`; it must not alter live `prayer_times`.
7. Add Admin home card.
8. Run targeted tests.
9. Commit: `feat: add prayer engine admin workflow`.

## Task 5: Convert Prayer Times Admin to schedule viewer/emergency correction

**Files:**
- Modify: `app/admin/prayer-times/page.tsx`
- Modify: `app/admin/prayer-times/new/page.tsx`
- Modify: `app/admin/prayer-times/edit/[id]/page.tsx`
- Modify: `app/admin/prayer-times/__tests__/page.test.tsx`
- Modify: `lib/data/prayer-times.ts`
- Modify: `lib/types.ts`
- Stop linking to: `app/admin/prayer-times/import/page.tsx`

1. Write failing tests asserting no absolute Fajr/Dhuhr/Asr/Maghrib/Isha Iqama inputs are rendered.
2. Preserve six prayer values, published status, notes, and Maghrib Program.
3. Remove `maghribIqamaTime`; keep `enabled`, lesson title/duration, `combinedIshaTime`.
4. Remove absolute-Iqama mapping from the new domain path.
5. Keep manual one-day prayer-time correction as emergency functionality.
6. Remove CSV import navigation/primary workflow; do not delete unrelated CSV helpers until `git grep` proves them unused.
7. Run targeted tests + typecheck.
8. Commit: `refactor: cut prayer times admin to delay iqama model`.

## Task 6: Cut root Prayerapp consumers to shared delays

**Files:**
- Modify: `lib/prayer-utils.ts`
- Modify: exact consumers returned by `git grep -nE 'fajrIqama|dhuhrIqama|asrIqama|maghribIqama|ishaIqama|getIqama\(' -- app components lib`
- Create/modify: focused tests beside each affected consumer

1. Capture the grep result before editing in the implementation notes.
2. Write failing tests proving UI Iqama = stored prayer start + shared delay, including delay 0.
3. Supply shared delays through one domain/data boundary; components must not independently query settings.
4. Remove legacy `getIqama(prayer,name)` once the last consumer is converted.
5. Friday primary Jumuah must never display normal Dhuhr Iqama.
6. Run targeted tests + `npm test`.
7. Commit: `refactor: derive prayerapp iqama from shared delays`.

## Task 7: Add Masjid Display settings Admin

**Files:**
- Create: `app/admin/masjid-display/page.tsx`
- Create: `app/admin/masjid-display/actions.ts`
- Create: `app/admin/masjid-display/__tests__/page.test.tsx`
- Modify: `app/admin/page.tsx`
- Reuse: `lib/data/masjid-display-settings.ts`
- Reuse: `lib/data/azkar.ts`

1. Write failing tests for five 2–120 minute duration fields and playlist selection from canonical hardcoded published Azkar IDs.
2. Reject unknown playlist IDs against canonical Azkar data.
3. Show setup-incomplete when required values are absent/invalid.
4. Do not add calculation settings, Iqama delays, Jumuah, or content editing here.
5. Add Admin home card.
6. Commit: `feat: add masjid display settings admin`.

## Task 8: Extend Announcement/Event/Campaign Admin UI

**Files:**
- Modify: `app/admin/announcements/page.tsx`
- Modify: `app/admin/announcements/actions.ts`
- Modify: `app/admin/events/page.tsx`
- Modify: `app/admin/events/actions.ts`
- Modify: `app/admin/donations/page.tsx`
- Modify: `app/admin/donations/actions.ts`
- Create: `lib/__tests__/admin-masjid-display-content.test.ts`

1. Write failing UI/action contract tests for Announcement Normal/Special style, optional display window, inverted-window rejection, and unchanged Urgent semantics.
2. Ensure Event forms/actions continue exposing the bilingual fields required by Task 3.
3. Campaign end date can be blank; donation URL optional but must be valid HTTP(S) when present; no QR-image upload field.
4. Implement minimally in existing pages/actions.
5. Run targeted tests.
6. Commit: `feat: extend display content admin controls`.

## Task 9: Add canonical Prayerapp public URL setting

**Files:**
- Modify: `app/admin/settings/page.tsx`
- Modify: `app/admin/settings/actions.ts`
- Modify: `lib/data/mosque-settings.ts`
- Create: `lib/__tests__/mosque-public-app-url.test.ts`

1. Write failing round-trip/validation tests.
2. Add `public_app_url` Admin field used by persistent TV QR.
3. Require HTTPS outside local development/test; permit localhost HTTP only in development/test validation.
4. Do not store a QR image.
5. Commit: `feat: configure public prayerapp display url`.

## Task 10: Implement synthetic Test Mode fixtures

**Files:**
- Create: `lib/masjid-display/test-fixtures.ts`
- Create: `lib/masjid-display/test-fixtures.test.ts`

1. Define deterministic synthetic scenarios: Normal; Prayer Approaching 10m; Prayer Time Now; Waiting Iqama 5m; Iqama Now; Prayer In Progress; first Jumuah 60m; next Jumuah 10m; Jumuah Now; Urgent AR/DE; Special Display; Event; Campaign+QR; Azkar; Offline/LKG; stale horizon; missing settings; long AR/DE.
2. Tests must prove countdown targets derive from test `startedAt`, and fixture IDs/content are synthetic/non-production.
3. Fixtures live in code/test-control storage only; never insert into prayer/content tables.
4. Commit: `test: add masjid display synthetic scenarios`.

## Task 11: Add Admin real-TV Test console

**Files:**
- Create: `app/admin/masjid-display-test/page.tsx`
- Create: `app/admin/masjid-display-test/actions.ts`
- Create: `app/admin/masjid-display-test/__tests__/page.test.tsx`
- Modify: `app/admin/page.tsx`
- Reuse: `lib/data/masjid-display-test-state.ts`
- Reuse: `lib/masjid-display/test-fixtures.ts`

1. UI tests: scenario buttons, active state, Stop Test, Extend +15 min.
2. Action tests: Admin auth required; starting writes only singleton test state; default TTL exactly 15 minutes; Stop disables; Extend adjusts expiry only; no production prayer/content write.
3. This page is a remote control for the real TV, not an embedded preview.
4. Add Admin home card.
5. Commit: `feat: add real tv masjid display test control`.

## Task 12: Add public read-only Test Control endpoint

**Files:**
- Create: `app/api/public/masjid-display-test-control/route.ts`
- Create: `app/api/public/masjid-display-test-control/route.test.ts`

1. Tests: GET only; inactive/expired returns `{active:false}`; active returns allowlisted synthetic scenario/start/expiry/payload; expired never active; no Admin/user/private data; `Cache-Control: no-store`.
2. Use server data layer, not browser Supabase.
3. No write verbs or mutation behavior.
4. Commit: `feat: expose read only display test control`.

## Task 13: Verify the cutover gate, then remove absolute-Iqama columns

**Files:**
- Create: `supabase/migrations/20260915223000_remove_absolute_iqama_columns.sql`
- Create: `lib/__tests__/absolute-iqama-removal-contract.test.ts`
- Create: `docs/masjid-display/iqama-cutover-checklist.md`

1. Before adding/deploying the destructive migration, require:
   - zero active application references from `git grep -nE 'fajr_iqama|dhuhr_iqama|asr_iqama|maghrib_iqama|isha_iqama|fajrIqama|dhuhrIqama|asrIqama|maghribIqama|ishaIqama' -- app components lib`;
   - root tests/build green on delay-derived Iqama;
   - target environment has a `prayer_settings` row with all five reviewed delays configured (0 is valid).
2. Document the target-environment check and rollback point in `iqama-cutover-checklist.md`; do not mark it complete before actually verified.
3. Write migration contract test requiring all five legacy columns dropped while Maghrib Program fields remain.
4. Add drop migration after the gate is satisfied for deployment. Fresh `supabase db reset` must still succeed even when a new environment has no configured settings row; in that case the app correctly reports setup incomplete rather than restoring legacy Iqama.
5. Commit: `refactor: remove absolute iqama storage`.

## Task 14: Verify Plan 2

1. Run targeted Admin/content/Test-Control tests.
2. `npm test`.
3. `npm run lint`.
4. `npx tsc --noEmit`.
5. `npm run build`.
6. `supabase db reset`.
7. Grep legacy absolute-Iqama fields: expected no active application/domain consumers.
8. Prove a synthetic test scenario changes only test-control storage.
9. Re-run existing Jumuah tests including `lib/admin-jumuah-validation.test.ts` and `lib/__tests__/admin-jumuah-ui-cleanup.test.ts`; first Friday service remains Dhuhr and additional services remain manual.
10. Commit stabilization fixes separately.

## Exit criteria

- Admin safely configures/calibrates/generates/recalculates schedules.
- Root Prayerapp uses shared delay-derived Iqama; final active schema/code has no absolute Iqama source.
- Display settings/Azkar playlist and content fields are configured/validated.
- Persistent Prayerapp URL is configurable.
- Admin can remotely start/stop synthetic real-TV Test Mode without production-data pollution.
- Test-Control endpoint is public read-only/no-store; writes remain Admin-authenticated.
- Root tests/build remain green.

**Next plan:** `2026-09-15-masjid-display-plan-3-display-feed.md`.