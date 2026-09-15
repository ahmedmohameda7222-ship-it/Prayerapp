# Masjid Display Plan 2 — Admin, Content Extensions, Iqama Cutover, and TV Test Control Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Expose the approved Prayer Engine workflows in Prayerapp Admin, add display/content settings, cut Prayerapp over from absolute Iqama times to shared delays, and add the Admin-controlled synthetic real-TV Test Mode without writing fake production content.

**Architecture:** Admin remains in the root Prayerapp and uses existing admin-auth/server-action patterns. Display-only settings and temporary test control get dedicated singleton records. Test Mode is a separate ephemeral control plane: Admin writes one safe synthetic scenario, while the TV later reads a public read-only projection every ~2 seconds. The same production renderer will consume those fixtures in Plan 4. Legacy absolute-Iqama data is removed only after all root Prayerapp consumers are converted.

**Tech Stack:** Existing Next.js Admin pages/server actions, TypeScript, Supabase, Vitest/Testing Library, Prayer Engine from Plan 1.

## Branch / prerequisite assumptions

- Continue on implementation branch `feat/masjid-display` after Plan 1 is green.
- `prayer_settings`, engine Preview/commit functions, and delay-derived Iqama helper from Plan 1 must exist.
- This plan does not create the TV project yet.

## Task 1: Add display/content/test-control database schema

**Files:**
- Create: `supabase/migrations/20260915222000_masjid_display_admin_schema.sql`
- Create: `lib/__tests__/masjid-display-admin-schema.test.ts`

1. Write a failing migration contract test for:
   - singleton `public.masjid_display_settings`;
   - five mandatory prayer-in-progress duration columns with bounded positive values;
   - `azkar_playlist_ids text[] not null default '{}'`;
   - announcement columns `display_style`, `display_from`, `display_until`;
   - nullable campaign `end_date` and nullable `donation_url`;
   - `mosque_settings.public_app_url`;
   - singleton `public.masjid_display_test_state` containing scenario, synthetic payload JSONB, start/expiry timestamps, enabled flag, and `updated_at`.
2. Add constraints:
   - announcement style only `normal|special`;
   - `display_until > display_from` when both present;
   - display durations within an explicit operational range (for example 2–120 minutes; use the same range in domain validation);
   - test expiry must be later than start when enabled.
3. RLS/security:
   - no anonymous/authenticated write access to settings/test-control records;
   - test-control public read is exposed through a route, not direct table grants;
   - preserve existing public read behavior for published announcements/campaigns.
4. Run `npx vitest run lib/__tests__/masjid-display-admin-schema.test.ts` and `supabase db reset`.
5. Commit: `feat: add masjid display admin schema`.

## Task 2: Extend domain types and data mappers

**Files:**
- Modify: `lib/types.ts`
- Modify: `lib/data/announcements.ts`
- Modify: `lib/data/donations.ts`
- Modify: `lib/data/mosque-settings.ts`
- Create: `lib/data/masjid-display-settings.ts`
- Create: `lib/data/masjid-display-test-state.ts`
- Create: `lib/__tests__/masjid-display-data-contract.test.ts`

1. Write failing mapper tests for new announcement scheduling/style fields, campaign nullable end date + donation URL, mosque public app URL, display settings, and test state.
2. Add narrow types:
   - `AnnouncementDisplayStyle`
   - optional `displayFrom/displayUntil` on Announcement
   - optional `donationUrl` and optional `endDate` on DonationCampaign
   - optional/required-after-setup `publicAppUrl` on MosqueSettings
   - `MasjidDisplaySettings`
   - `MasjidDisplayTestScenario` and `MasjidDisplayTestState`.
3. Keep test payload strongly discriminated by scenario instead of untyped arbitrary JSON at the TypeScript boundary.
4. Implement data mappers and cache invalidation following existing data-layer patterns.
5. Run targeted tests.
6. Commit: `feat: extend display content data contracts`.

## Task 3: Add bilingual publication validation shared by Admin content

**Files:**
- Create: `lib/masjid-display/content-validation.ts`
- Create: `lib/masjid-display/content-validation.test.ts`
- Modify: `app/admin/announcements/actions.ts`
- Modify: existing Event Admin action file(s) under `app/admin/events/`
- Modify: existing Donation Admin action file(s) under `app/admin/donations/`

1. Write failing pure tests requiring complete Arabic + German fields for published Announcements, Events, and Donation Campaigns that can appear on the display.
2. Define exactly which fields are mandatory per content type (title/message, title/description/location where applicable).
3. Allow drafts/unpublished items to be incomplete.
4. Wire Admin publish/create/update actions through the shared validator; return actionable validation errors instead of silently publishing incomplete TV content.
5. Do not auto-translate or auto-fill German/Arabic from another language.
6. Run pure tests plus relevant Admin tests.
7. Commit: `feat: enforce bilingual display publication rules`.

## Task 4: Build Prayer Engine Admin page and actions

**Files:**
- Create: `app/admin/prayer-engine/page.tsx`
- Create: `app/admin/prayer-engine/actions.ts`
- Create: `app/admin/prayer-engine/__tests__/page.test.tsx`
- Modify: `app/admin/page.tsx`
- Reuse: `lib/auth/use-admin-auth.ts`
- Reuse: `lib/auth/admin-actions.ts`
- Reuse: `lib/prayer-engine/server.ts`

1. Write failing UI tests covering:
   - all explicit calculation fields;
   - six offsets;
   - five mandatory Iqama delays including zero;
   - synchronized vs `Needs Recalculation` warning;
   - Calibration action;
   - Extend Preview then explicit Generate & Save;
   - Recalculate Preview/Diff then explicit confirmation.
2. Implement page using existing Admin styling/auth conventions.
3. Never call persistence directly when the user presses Preview.
4. Show Preview date range, row count, changed-count/diff summary, and representative rows before commit.
5. Block `Extend +1 Year` while calculation revisions differ.
6. Saving settings that affect calculation must only mark the schedule out of sync; it must not trigger recalculation.
7. Add a Prayer Engine card/link to `app/admin/page.tsx`.
8. Run targeted UI/action tests.
9. Commit: `feat: add prayer engine admin workflow`.

## Task 5: Convert Prayer Times Admin to schedule viewer/emergency correction

**Files:**
- Modify: `app/admin/prayer-times/page.tsx`
- Modify: `app/admin/prayer-times/new/page.tsx`
- Modify: `app/admin/prayer-times/edit/[id]/page.tsx`
- Remove from navigation/final UI: `app/admin/prayer-times/import/page.tsx`
- Modify: `app/admin/prayer-times/__tests__/page.test.tsx`
- Modify/add tests for new/edit pages as needed
- Modify: `lib/data/prayer-times.ts`
- Modify: `lib/types.ts`

1. Write failing tests asserting no absolute Fajr/Dhuhr/Asr/Maghrib/Isha Iqama inputs are rendered.
2. Preserve schedule times, published status, notes, and Maghrib Program fields.
3. Remove `maghribIqamaTime` from `MaghribProgram`; preserve `enabled`, lesson title/duration, and manual `combinedIshaTime`.
4. Remove absolute-Iqama writes from `mapToDb` and reads from the new domain path.
5. Keep per-day manual prayer-time correction as an explicit emergency tool.
6. Remove CSV import entry points from normal Admin navigation/Prayer Times workflow; do not delete unrelated CSV utilities until references prove they are unused.
7. Run Prayer Times Admin tests and full typecheck.
8. Commit: `refactor: cut prayer times admin to delay iqama model`.

## Task 6: Cut public Prayerapp Iqama consumers to shared delays

**Files:**
- Modify: `lib/prayer-utils.ts`
- Modify: all root Prayerapp consumers found by `git grep -nE 'fajrIqama|dhuhrIqama|asrIqama|maghribIqama|ishaIqama|getIqama\(' -- app components lib`
- Add/modify: focused tests beside each affected public prayer component

1. Before editing, run the grep command and save the exact consumer list in the implementation notes/commit description.
2. Add failing tests proving displayed Iqama comes from stored prayer start + `prayer_settings` delay, including delay `0`.
3. Pass the shared delays into consumers through one data/domain boundary; do not let components query settings independently.
4. Remove legacy `getIqama(prayer,name)` semantics once no consumer depends on absolute values.
5. Ensure Friday Dhuhr/Jumuah does not show normal Dhuhr Iqama.
6. Run targeted tests, then `npm test`.
7. Commit: `refactor: derive prayerapp iqama from shared delays`.

## Task 7: Add Masjid Display settings Admin

**Files:**
- Create: `app/admin/masjid-display/page.tsx`
- Create: `app/admin/masjid-display/actions.ts`
- Create: `app/admin/masjid-display/__tests__/page.test.tsx`
- Modify: `app/admin/page.tsx`
- Reuse: `lib/data/masjid-display-settings.ts`
- Reuse: `lib/data/azkar.ts`

1. Write failing UI tests for five prayer-duration fields and Azkar playlist selection from canonical hardcoded published IDs.
2. Validate every saved playlist ID against `getAzkarItems(true)`/canonical hardcoded content; reject unknown IDs.
3. Show setup-incomplete state when required durations/config are absent.
4. Do not add Iqama delays, calculation settings, Jumuah, or content editing to this page.
5. Add Admin home card/link.
6. Run tests.
7. Commit: `feat: add masjid display settings admin`.

## Task 8: Extend existing Announcement and Donation Admin UI

**Files:**
- Modify: `app/admin/announcements/page.tsx`
- Modify: `app/admin/announcements/actions.ts`
- Modify: relevant tests under `app/admin/announcements/` or `lib/__tests__/`
- Modify: existing donation/campaign Admin page/action files under `app/admin/donations/`
- Modify: relevant donation tests

1. Announcement tests:
   - Normal/Special Display style selector;
   - optional display-from/until;
   - invalid inverted window rejected;
   - existing Urgent behavior remains independent.
2. Campaign tests:
   - end date may be blank;
   - optional donation URL validates as HTTP(S);
   - no QR-image upload field is introduced.
3. Implement minimally in existing forms/actions.
4. Run targeted tests.
5. Commit: `feat: extend display content admin controls`.

## Task 9: Add canonical Prayerapp public URL setting

**Files:**
- Modify: existing mosque settings Admin page/action files
- Modify: `lib/data/mosque-settings.ts`
- Add/modify: mosque-settings tests

1. Write failing test for `public_app_url` round-trip and URL validation.
2. Add one Admin field for the canonical public Prayerapp URL used by the persistent TV QR.
3. Require HTTPS in production; allow local HTTP only under explicit development/test conditions.
4. Do not store a QR image.
5. Commit: `feat: configure public prayerapp display url`.

## Task 10: Implement synthetic Test Mode fixtures

**Files:**
- Create: `lib/masjid-display/test-fixtures.ts`
- Create: `lib/masjid-display/test-fixtures.test.ts`

1. Define deterministic fixtures for:
   - Normal
   - Prayer Approaching (10-minute ticking target)
   - Prayer Time Now
   - Waiting for Iqama (5-minute ticking target)
   - Iqama Now
   - Prayer In Progress
   - Friday first Jumuah in 60 minutes
   - next Jumuah in 10 minutes
   - Jumuah Now
   - Urgent AR/DE
   - Special Display
   - Event
   - Campaign with QR
   - Azkar
   - Offline/LKG
   - stale prayer horizon
   - missing settings
   - long Arabic/German content.
2. Write failing tests that fixtures contain no real production IDs/timestamps and that countdown scenarios derive target instants from `startedAt`.
3. Keep fixture payloads in application code, not inserted into announcement/prayer tables.
4. Commit: `test: add masjid display synthetic scenarios`.

## Task 11: Add Admin-controlled Test Mode write API and page

**Files:**
- Create: `app/admin/masjid-display-test/page.tsx`
- Create: `app/admin/masjid-display-test/actions.ts`
- Create: `app/admin/masjid-display-test/__tests__/page.test.tsx`
- Modify: `app/admin/page.tsx`
- Reuse: `lib/data/masjid-display-test-state.ts`
- Reuse: `lib/masjid-display/test-fixtures.ts`

1. Write failing tests for scenario buttons, active state indicator, `Stop Test`, and `Extend +15 min`.
2. Write action tests proving:
   - Admin authentication is required;
   - starting a scenario writes only `masjid_display_test_state`;
   - default expiry is 15 minutes;
   - stopping disables the singleton;
   - extending changes expiry only;
   - no writes target prayer/content production tables.
3. Implement the page as a remote-control console, not an embedded preview.
4. Add clear explanation that commands affect the real TV once the display client is online.
5. Add Admin home card/link.
6. Commit: `feat: add real tv masjid display test control`.

## Task 12: Add read-only test-control endpoint for TV polling

**Files:**
- Create: `app/api/public/masjid-display-test-control/route.ts`
- Create: `app/api/public/masjid-display-test-control/route.test.ts`

1. Write failing route tests:
   - GET only;
   - inactive/expired test returns `{ active: false }` and no fixture payload;
   - active test returns allowlisted synthetic scenario + start/expiry/payload;
   - expired state is never treated active;
   - no Admin/user/private fields leak;
   - response is `no-store` or has an appropriately tiny cache policy for ~2-second polling.
2. Implement route via server data layer, not direct browser Supabase access.
3. Keep endpoint read-only; all writes stay authenticated under Admin actions.
4. Commit: `feat: expose read only display test control`.

## Task 13: Drop legacy absolute-Iqama schema after cutover verification

**Files:**
- Create: `supabase/migrations/20260915223000_remove_absolute_iqama_columns.sql`
- Create: `lib/__tests__/absolute-iqama-removal-contract.test.ts`

1. Run `git grep -nE 'fajr_iqama|dhuhr_iqama|asr_iqama|maghrib_iqama|isha_iqama|fajrIqama|dhuhrIqama|asrIqama|maghribIqama|ishaIqama' -- app components lib` and require zero production-code consumers before creating the drop migration.
2. Write a failing migration contract test requiring all five columns to be dropped and Maghrib Program informational columns to remain.
3. Add the drop migration only after root app tests are green on the new delay model.
4. `supabase db reset` from scratch and test upgrading a production-like schema snapshot if the repo's migration harness supports it.
5. Commit: `refactor: remove absolute iqama storage`.

## Task 14: Verify Plan 2

1. Run targeted Admin tests for prayer-engine, prayer-times, masjid-display, announcements, donations, and test-control.
2. Run `npm test`.
3. Run `npm run lint`.
4. Run `npx tsc --noEmit`.
5. Run `npm run build`.
6. Run `supabase db reset`.
7. Grep again for legacy absolute-Iqama fields; expected result: no active application/domain consumers.
8. Verify a synthetic test scenario changes only test-control storage.
9. Commit any stabilization fixes separately.

## Exit criteria

- Admin can safely configure/calibrate/generate/recalculate prayer schedules.
- Prayerapp itself uses shared delay-derived Iqama, with legacy absolute fields removed from final schema/code.
- Display settings and Azkar playlist are configurable.
- Announcement/Campaign/mosque fields required by the display exist and validate.
- Admin can remotely start/stop synthetic TV Test Mode without polluting real data.
- Public test-control polling endpoint is read-only and safe.
- Full root app tests/build stay green.

**Next plan:** `2026-09-15-masjid-display-plan-3-display-feed.md`.