# Masjid Display Plan 3 — Public Display Feed and Contract Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the stable, versioned, atomic, public read-only Masjid Display Feed using existing Prayerapp domain/data sources, with deterministic content eligibility, strict output minimization, ETag support, and contract tests.

**Architecture:** The root Prayerapp assembles one safe snapshot from existing published data and the new shared settings. It does not duplicate SQL/business rules in the TV app. The feed is a public GET-only projection with schema version `1`; the snapshot body changes only when underlying display content changes. Current time synchronization comes from the HTTP `Date` header, not by forcing a new body/ETag every second.

**Tech Stack:** Next.js route handlers, TypeScript, existing Prayerapp data layer/caches, Vitest, Web Crypto/Node crypto for stable snapshot hashing as appropriate.

## Branch / prerequisite assumptions

- Continue on `feat/masjid-display` after Plans 1–2.
- Root Prayerapp already has delay-derived Iqama settings, display settings, content scheduling fields, public app URL, and Test Mode control.
- No `masjid-display/` consumer code is required for this plan; Plan 4 consumes the resulting contract.

## Task 1: Extract the canonical Azkar time-category resolver

**Files:**
- Create: `lib/azkar-routine.ts`
- Create: `lib/azkar-routine.test.ts`
- Modify: `components/azkar/AzkarRoutine.tsx`

1. Write failing tests for the existing behavior:
   - Friday → `Friday`;
   - 04:00–11:59 → `Morning`;
   - 15:00–21:59 → `Evening`;
   - 22:00–03:59 → `Sleep`;
   - otherwise → `Morning`.
2. Move `mosqueClock`/`smartDefaultCategory` behavior into a pure shared module using `APP_TIME_ZONE`.
3. Update `components/azkar/AzkarRoutine.tsx` to call the shared function; do not change existing user-facing Azkar behavior.
4. Run `npx vitest run lib/azkar-routine.test.ts` plus existing Azkar component tests.
5. Commit: `refactor: share azkar routine selection logic`.

## Task 2: Define Feed v1 domain contract

**Files:**
- Create: `lib/masjid-display/feed-contract.ts`
- Create: `lib/masjid-display/feed-contract.test.ts`

1. Write failing tests for a strict `MasjidDisplayFeedV1` shape containing only:
   - `schemaVersion: 1`;
   - `snapshotRevision`;
   - `generatedAt` as metadata only when content is rebuilt;
   - timezone;
   - safe mosque identity + `publicAppUrl`;
   - published prayer schedule window;
   - five Iqama delays;
   - additional Jumuah services;
   - display prayer durations + Azkar playlist IDs;
   - selected Azkar payloads;
   - active/schedulable announcements;
   - current/upcoming schedulable events;
   - active/schedulable campaigns.
2. Explicitly test absence of calculation coordinates/angles, admin users, audit logs, account data, Supabase keys, and unpublished content.
3. Define serializable DTO types separate from database row types.
4. Do not expose legacy absolute-Iqama fields.
5. Commit: `feat: define masjid display feed v1 contract`.

## Task 3: Implement deterministic content eligibility helpers

**Files:**
- Create: `lib/masjid-display/content-eligibility.ts`
- Create: `lib/masjid-display/content-eligibility.test.ts`

1. Write failing tests for Announcement eligibility:
   - published required;
   - `displayFrom` respected;
   - `displayUntil` respected;
   - missing bounds means indefinite on that side;
   - AR+DE completeness required.
2. Write Event tests:
   - only current/upcoming;
   - expires at `endTime` if present;
   - without end time expires at end of event date in mosque timezone;
   - nearest chronological first.
3. Write Campaign tests:
   - `isActive` required;
   - start date respected;
   - missing end date means no end bound;
   - passed end date hides;
   - AR+DE completeness required;
   - donation URL optional.
4. Keep functions pure and accept `now` explicitly for deterministic testing/offline parity.
5. Commit: `feat: add display content eligibility rules`.

## Task 4: Implement selected Azkar projection

**Files:**
- Create: `lib/masjid-display/azkar-selection.ts`
- Create: `lib/masjid-display/azkar-selection.test.ts`
- Reuse: `lib/data/azkar.ts`
- Reuse: `lib/azkar-routine.ts`

1. Write failing tests:
   - only IDs present in display playlist can be selected;
   - current smart category wins;
   - if no selected item matches the current category, fallback to any selected published item;
   - empty playlist returns empty list;
   - unknown IDs are ignored defensively.
2. Return enough selected Azkar source data for the TV to rotate without receiving the entire hardcoded catalog.
3. Preserve stable canonical IDs/source/repeat count and Arabic/German text.
4. Commit: `feat: project display azkar playlist`.

## Task 5: Build atomic snapshot assembler

**Files:**
- Create: `lib/masjid-display/build-feed.ts`
- Create: `lib/masjid-display/build-feed.test.ts`
- Reuse: `lib/data/prayer-times.ts`
- Reuse: `lib/data/prayer-settings.ts`
- Reuse: `lib/data/jumuah.ts`
- Reuse: `lib/data/announcements.ts`
- Reuse: `lib/data/events.ts`
- Reuse: `lib/data/donations.ts`
- Reuse: `lib/data/mosque-settings.ts`
- Reuse: `lib/data/masjid-display-settings.ts`
- Reuse: `lib/data/azkar.ts`
- Reuse/adapt: `lib/friday.ts`

1. Write a failing assembler test using mocked data functions.
2. Compute the prayer window as previous local date through approximately 35 days ahead; never send all future years.
3. Include only published prayer rows and additional Jumuah rows relevant to the operating horizon.
4. Derive first Friday Jumuah from Dhuhr semantically; do not duplicate it from `jumuah_times`.
5. Include Iqama delay settings, not absolute times.
6. Apply content eligibility but preserve future scheduling metadata needed so the TV can expire/show content correctly while offline.
7. Build one complete DTO in memory. If a required religious setting is invalid/missing, return a typed feed-build error rather than fabricating defaults.
8. Keep `generatedAt` stable for a built snapshot; do not rebuild solely because wall-clock seconds advanced.
9. Commit: `feat: assemble atomic masjid display snapshot`.

## Task 6: Add deterministic snapshot revision / ETag hashing

**Files:**
- Create: `lib/masjid-display/feed-etag.ts`
- Create: `lib/masjid-display/feed-etag.test.ts`

1. Write failing tests proving:
   - same semantic snapshot → same ETag;
   - object-key order differences do not change ETag;
   - one content field change does change ETag;
   - current request time does not affect ETag.
2. Implement stable canonical serialization followed by a cryptographic digest.
3. Set `snapshotRevision` from a stable content-derived revision/hash or from an equally deterministic monotonic source; document the chosen invariant in code.
4. Commit: `feat: add stable display feed etag`.

## Task 7: Add public GET-only Display Feed route

**Files:**
- Create: `app/api/public/masjid-display/route.ts`
- Create: `app/api/public/masjid-display/route.test.ts`

1. Write failing route tests for:
   - `GET` returns Feed v1 + `ETag` + `Date`;
   - matching `If-None-Match` returns `304` with no body;
   - unsupported methods are rejected;
   - feed-build failure returns a safe 5xx body without stack trace/internal SQL;
   - no auth/session is required for GET;
   - response contains only allowlisted feed fields;
   - body does not vary just because one second passes when source content is unchanged.
2. Implement route via `buildMasjidDisplayFeed()`.
3. Add public-cache semantics that still permit conditional revalidation. Do not cache test-control state into this 60-second production feed.
4. Ensure the HTTP `Date` header is available for clock correction even on 304 responses.
5. Commit: `feat: expose public masjid display feed`.

## Task 8: Add defensive feed self-validation before sending

**Files:**
- Create: `lib/masjid-display/validate-feed.ts`
- Create: `lib/masjid-display/validate-feed.test.ts`
- Modify: `lib/masjid-display/build-feed.ts`
- Modify: `app/api/public/masjid-display/route.ts`

1. Write failing tests for duplicate prayer dates, invalid HH:MM, unordered/invalid dates, negative/missing Iqama delays, invalid display durations, duplicate IDs where prohibited, invalid URLs, and incomplete AR/DE content.
2. Validate the assembled DTO before hashing/responding.
3. Fail the whole feed build for corrupt required prayer/settings data; do not partially salvage an inconsistent religious snapshot.
4. For defensively encountered invalid dynamic legacy content, exclude the bad item and expose a server log/diagnostic signal rather than failing all prayer data.
5. Commit: `feat: validate display feed before publication`.

## Task 9: Add golden contract fixture for the future TV client

**Files:**
- Create: `lib/masjid-display/__fixtures__/feed-v1.json`
- Create: `lib/masjid-display/feed-golden.test.ts`

1. Generate a deterministic fixture from synthetic, non-production data covering prayer schedule, extra Jumuah, urgent/special/general announcement, event, campaign with/without URL, Azkar, settings, and persistent Prayerapp URL.
2. Test that root feed validation accepts it.
3. Keep fixture stable and reviewable; later Plan 4 copies this fixture into the TV project's consumer contract tests or checks semantic equivalence.
4. Commit: `test: add display feed v1 golden fixture`.

## Task 10: Security and caching verification

**Files:**
- Add/modify: `lib/__tests__/masjid-display-feed-security.test.ts`
- Review: `next.config.ts` and existing security-header middleware/config only if route-specific changes are necessary

1. Add tests that public Feed/Test-Control endpoints are read-only and cannot mutate data.
2. Verify no service-role key is serialized into route output or client bundle.
3. Verify no private/admin tables are read solely to build the display feed.
4. Confirm error paths do not expose stack traces or raw Supabase error objects.
5. Confirm ETag/304 behavior does not cache an error response as a valid LKG candidate.
6. Commit: `test: harden masjid display public feed boundary`.

## Task 11: Verify Plan 3

1. Run `npx vitest run lib/masjid-display app/api/public/masjid-display`.
2. Run `npm test`.
3. Run `npm run lint`.
4. Run `npx tsc --noEmit`.
5. Run `npm run build`.
6. With local app running, execute two `curl` requests:
   - first GET captures `ETag` and body;
   - second GET sends `If-None-Match` and must return 304 when data is unchanged.
7. Inspect the JSON manually for safe field allowlisting.
8. Commit any stabilization fix separately.

## Exit criteria

- One versioned Feed v1 atomically represents all TV production data.
- ETag is stable when content is stable.
- Clock synchronization can use HTTP response time without invalidating ETag.
- Feed never exposes calculation internals, secrets, accounts, admin data, or legacy absolute Iqama.
- Offline scheduling metadata needed by the TV is present.
- A golden fixture exists for consumer compatibility tests.

**Next plan:** `2026-09-15-masjid-display-plan-4-tv-runtime-ui.md`.