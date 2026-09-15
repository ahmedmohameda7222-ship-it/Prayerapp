# Masjid Display Plan 3 — Public Display Feed and Contract Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the stable, versioned, atomic, public read-only Masjid Display Feed using existing Prayerapp domain/data sources, with offline-capable scheduling metadata, strict output minimization, stable ETag support, and contract tests.

**Architecture:** The root Prayerapp assembles one safe snapshot from existing published data and the new shared settings. It does not duplicate database/business ownership in the TV app. The feed is a public GET-only projection with schema version `1`. The snapshot deliberately includes currently relevant **and near-future scheduled** content so a TV that goes offline can still activate/expire items at the correct local time. Runtime eligibility is therefore repeated defensively on the TV from the same explicit scheduling fields. Current time synchronization comes from the HTTP `Date` header, not from regenerating the response body every second.

**Tech Stack:** Next.js route handlers, TypeScript, existing Prayerapp data layer/caches, Vitest, Node/Web Crypto hashing as appropriate.

## Branch / prerequisite assumptions

- Continue on `feat/masjid-display` after Plans 1–2.
- Root Prayerapp already has delay-derived Iqama settings, display settings, content scheduling fields, public app URL, and Test Mode control.
- No `masjid-display/` consumer code is required yet; Plan 4 consumes the resulting contract.

## Task 1: Extract canonical Azkar time-category logic

**Files:**
- Create: `lib/azkar-routine.ts`
- Create: `lib/azkar-routine.test.ts`
- Modify: `components/azkar/AzkarRoutine.tsx`

1. Write failing tests for the existing behavior: Friday → Friday; 04:00–11:59 Morning; 15:00–21:59 Evening; 22:00–03:59 Sleep; otherwise Morning.
2. Move `mosqueClock`/`smartDefaultCategory` behavior into a pure shared module using `APP_TIME_ZONE`.
3. Update `components/azkar/AzkarRoutine.tsx` to call the shared function without changing existing public behavior.
4. Run targeted tests.
5. Commit: `refactor: share azkar routine selection logic`.

## Task 2: Define Feed v1 domain contract

**Files:**
- Create: `lib/masjid-display/feed-contract.ts`
- Create: `lib/masjid-display/feed-contract.test.ts`

1. Write failing tests for strict `MasjidDisplayFeedV1` containing only:
   - `schemaVersion: 1`;
   - `snapshotRevision`;
   - deterministic `generatedAt` metadata tied to the snapshot revision/window, never the current second;
   - timezone;
   - safe mosque identity + `publicAppUrl`;
   - published prayer schedule operating window;
   - five Iqama delays;
   - additional Jumuah services;
   - display prayer durations + Azkar playlist IDs;
   - selected Azkar source data;
   - published schedulable announcements including future `displayFrom` items within the feed horizon;
   - current/upcoming Events including enough future entries for offline operation;
   - active/future-scheduled Campaigns with their start/end metadata.
2. Explicitly test absence of calculation coordinates/angles, admin users, audit logs, account data, Supabase keys, unpublished content, and legacy absolute-Iqama fields.
3. Define DTOs separate from database row types.
4. Commit: `feat: define masjid display feed v1 contract`.

## Task 3: Implement shared scheduling/eligibility helpers

**Files:**
- Create: `lib/masjid-display/content-eligibility.ts`
- Create: `lib/masjid-display/content-eligibility.test.ts`

1. Write pure tests for **runtime eligibility at a supplied `now`**:
   - Announcement: published, AR+DE complete, `displayFrom/displayUntil` bounds;
   - Event: current/upcoming, expires at endTime or end-of-date;
   - Campaign: active, AR+DE complete, start/end bounds, optional URL;
   - Urgent uses the same announcement scheduling window.
2. Add a separate **feed-inclusion** predicate that includes items which are not yet active but can become active inside the offline operating horizon. A future `displayFrom` item must not be discarded merely because it is not active at fetch time.
3. Exclude content that is already irreversibly expired before the feed operating window.
4. Keep all helpers pure with explicit `now`, timezone, and horizon inputs.
5. Commit: `feat: add display scheduling eligibility rules`.

## Task 4: Implement selected Azkar projection

**Files:**
- Create: `lib/masjid-display/azkar-selection.ts`
- Create: `lib/masjid-display/azkar-selection.test.ts`
- Reuse: `lib/data/azkar.ts`
- Reuse: `lib/azkar-routine.ts`

1. Test that only playlist IDs are projected; current smart category wins; no category match falls back to any selected published Azkar; empty playlist is empty; unknown IDs are ignored defensively.
2. Include enough selected canonical Azkar data for offline category selection/rotation rather than only the item active at fetch time.
3. Preserve stable IDs, Arabic, German, source, repeat count, and category.
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
2. Prayer window: previous local date through approximately 35 days ahead; never send years of rows.
3. Include only published prayer rows and additional Jumuah rows relevant to that operating window.
4. Primary Friday Jumuah is semantically Dhuhr; do not duplicate it from `jumuah_times`.
5. Include Iqama **delays**, never absolute Iqama times.
6. Include published dynamic content needed for current/near-future offline scheduling, preserving start/end metadata. Do not filter future scheduled items out with a “currently active only” predicate.
7. Build one complete DTO in memory. Missing/invalid required religious settings produce a typed build failure/degraded setup result; never fabricate defaults.
8. Make the snapshot window anchor deterministic (mosque-local date). The body must not vary because one wall-clock second passed.
9. Derive `generatedAt` deterministically from the semantic snapshot basis (for example the latest included source-update timestamp and/or operating-window anchor). Never set it to `new Date()` on every request.
10. Commit: `feat: assemble atomic masjid display snapshot`.

## Task 6: Add deterministic snapshot revision and ETag

**Files:**
- Create: `lib/masjid-display/feed-etag.ts`
- Create: `lib/masjid-display/feed-etag.test.ts`

1. Test: same semantic snapshot → same revision/ETag; object-key order does not matter; any semantic field change changes revision; one second of wall time does not change revision.
2. Implement canonical serialization of the **entire returned representation** followed by cryptographic digest, or use a documented weak ETag only if `generatedAt` is intentionally excluded as semantically insignificant. Prefer making the body itself deterministic so a strong ETag is valid.
3. `snapshotRevision` must have a documented stable invariant and must agree with the representation used for ETag.
4. Commit: `feat: add stable display feed etag`.

## Task 7: Add public GET-only Display Feed route

**Files:**
- Create: `app/api/public/masjid-display/route.ts`
- Create: `app/api/public/masjid-display/route.test.ts`

1. Write route tests: GET returns Feed v1 + ETag + Date; matching If-None-Match returns 304/no body; unsupported methods rejected; safe 5xx errors; no auth/session required; allowlisted fields only; repeated request one second later is byte/ETag stable when source/window unchanged.
2. Implement via `buildMasjidDisplayFeed()`.
3. Add cache semantics that permit conditional revalidation. Test-control state remains separate from this 60-second production feed.
4. Ensure response time header is present/usable on 200 and 304 for logical-clock correction.
5. Commit: `feat: expose public masjid display feed`.

## Task 8: Validate feed before publication

**Files:**
- Create: `lib/masjid-display/validate-feed.ts`
- Create: `lib/masjid-display/validate-feed.test.ts`
- Modify: `lib/masjid-display/build-feed.ts`
- Modify: `app/api/public/masjid-display/route.ts`

1. Write failures for duplicate/unordered prayer dates, invalid HH:MM, missing/negative delays, invalid durations, duplicate IDs where prohibited, malformed URL, unsupported schema, and incomplete AR/DE dynamic items.
2. Required prayer/settings corruption fails the whole snapshot; do not partial-salvage religious state.
3. Invalid legacy dynamic item is defensively omitted with server diagnostic/log signal so prayer data remains available.
4. Validate before hashing/sending.
5. Commit: `feat: validate display feed before publication`.

## Task 9: Add golden Feed v1 fixture

**Files:**
- Create: `lib/masjid-display/__fixtures__/feed-v1.json`
- Create: `lib/masjid-display/feed-golden.test.ts`

1. Build deterministic synthetic data covering prayer schedule, extra Jumuah, future-scheduled + active announcements, urgent/special/general, current/upcoming Event, future/active Campaign with/without URL, Azkar, settings, and persistent Prayerapp URL.
2. Test root validator accepts it.
3. Keep it stable/reviewable for Plan 4 consumer compatibility.
4. Commit: `test: add display feed v1 golden fixture`.

## Task 10: Security/caching verification

**Files:**
- Create/modify: `lib/__tests__/masjid-display-feed-security.test.ts`
- Review: `next.config.ts` only if route-specific headers require changes

1. Public Feed/Test-Control endpoints are read-only.
2. No service-role key/private payload serialized.
3. No private/admin table is required solely to build public feed.
4. Error paths expose no stack/raw Supabase errors.
5. Error responses cannot become valid LKG candidates through cache headers/status confusion.
6. Commit: `test: harden masjid display public feed boundary`.

## Task 11: Verify Plan 3

1. `npx vitest run lib/masjid-display app/api/public/masjid-display`.
2. `npm test`.
3. `npm run lint`.
4. `npx tsc --noEmit`.
5. `npm run build`.
6. Local `curl`: capture body/ETag, repeat after one second (expect same representation/ETag), then send `If-None-Match` (expect 304).
7. Test a future-scheduled Announcement in the snapshot and prove the JSON contains its scheduling metadata before activation.
8. Inspect JSON for safe field allowlisting.
9. Commit stabilization fixes separately.

## Exit criteria

- One versioned atomic Feed v1 represents all TV production data.
- Future scheduled content needed for offline activation is retained with explicit scheduling metadata.
- Representation and ETag are stable when semantic content/window is stable.
- HTTP response time can correct the TV clock without changing snapshot content each second.
- Feed exposes no calculation internals, secrets, accounts, admin data, or legacy absolute Iqama.
- Golden producer fixture exists for consumer compatibility tests.

**Next plan:** `2026-09-15-masjid-display-plan-4-tv-runtime-ui.md`.