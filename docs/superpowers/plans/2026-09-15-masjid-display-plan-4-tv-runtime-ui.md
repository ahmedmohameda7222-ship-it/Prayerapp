# Masjid Display Plan 4 — TV Runtime, State Engine, Responsive UI, and Test Override Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the independent `masjid-display/` Next.js application that consumes Feed v1 through same-origin proxies, survives offline/wake conditions using Last Known Good data, resolves deterministic prayer/Friday/content states, renders a responsive/adaptive/fluid TV UI, keeps the Prayerapp QR persistent, and obeys Admin Test Mode commands on the real TV.

**Architecture:** The TV app is a read-only presentation/runtime consumer. All production data comes from the root Prayerapp feed. A pure state engine takes validated snapshot + corrected logical time and returns a render state; timers merely trigger recomputation. Local storage holds only the last validated snapshot. Test Mode polls a separate proxy every ~2 seconds and temporarily overrides production presentation with synthetic fixtures while keeping a clear TEST MODE indicator and the persistent Prayerapp QR.

**Tech Stack:** Independent Next.js 16.x project, React 19, TypeScript 5, CSS Grid/container queries/fluid `clamp()` sizing, Vitest + Testing Library, exact-pinned QR generation package. No Supabase browser client, no audio library, no WebSocket requirement.

## Branch / prerequisite assumptions

- Continue on `feat/masjid-display` after Plans 1–3.
- Root endpoints exist:
  - `/api/public/masjid-display`
  - `/api/public/masjid-display-test-control`
- Feed v1 golden fixture exists at `lib/masjid-display/__fixtures__/feed-v1.json`.
- Keep `masjid-display/` independently installable/buildable for its own Vercel project.

## Task 1: Scaffold the independent TV project with explicit boundaries

**Files:**
- Create: `masjid-display/package.json`
- Create: `masjid-display/package-lock.json`
- Create: `masjid-display/tsconfig.json`
- Create: `masjid-display/next.config.ts`
- Create: `masjid-display/eslint.config.mjs`
- Create: `masjid-display/postcss.config.mjs`
- Create: `masjid-display/vitest.config.ts`
- Create: `masjid-display/vitest.setup.ts`
- Create: `masjid-display/app/layout.tsx`
- Create: `masjid-display/app/page.tsx`
- Create: `masjid-display/app/globals.css`
- Create: `masjid-display/.env.example`

1. Start with a failing smoke test that imports the TV app shell and asserts no root Prayerapp mobile shell/navigation is inherited.
2. Create a minimal independent Next project matching compatible root Next/React versions.
3. Add scripts: `dev`, `build`, `start`, `lint`, `test`, `typecheck`.
4. Add only required runtime dependencies. Pin the chosen QR package exactly; do not add Supabase or audio packages.
5. Environment contract: server-only upstream Prayerapp base URL (for the proxy); no secret is required by the browser.
6. Run from `masjid-display/`: `npm test`, `npm run typecheck`, `npm run build`.
7. Commit: `feat: scaffold independent masjid display app`.

## Task 2: Implement strict Feed v1 consumer validation

**Files:**
- Create: `masjid-display/lib/feed-types.ts`
- Create: `masjid-display/lib/validate-feed.ts`
- Create: `masjid-display/lib/validate-feed.test.ts`
- Create: `masjid-display/lib/__fixtures__/feed-v1.json`

1. Copy the reviewed golden fixture from Plan 3; do not hand-invent a second semantic contract.
2. Write failing validation tests for valid golden fixture, wrong `schemaVersion`, invalid/missing required prayer fields, duplicate dates, bad `HH:MM`, negative/missing Iqama delays, invalid URL, bad prayer durations, incomplete required AR/DE dynamic content, and corrupt types.
3. Implement a strict runtime validator that returns typed success/failure; network JSON is `unknown` until validated.
4. Do not import root Prayerapp server modules from outside the `masjid-display/` project at runtime. Compatibility is enforced by the shared golden contract/tests instead.
5. Commit: `feat: validate masjid display feed v1`.

## Task 3: Add same-origin production feed proxy

**Files:**
- Create: `masjid-display/app/api/display-feed/route.ts`
- Create: `masjid-display/app/api/display-feed/route.test.ts`
- Create: `masjid-display/lib/upstream.ts`

1. Write failing tests proving proxy behavior:
   - forwards `If-None-Match`;
   - preserves upstream 200/304/5xx meaning;
   - forwards ETag;
   - emits a trustworthy response-time signal (`Date` or explicit equivalent);
   - times out rather than hanging indefinitely;
   - never turns upstream failure into `200 {}`;
   - GET only.
2. Implement server-side upstream fetch using the configured Prayerapp origin.
3. Do not add business/content logic to the proxy.
4. Commit: `feat: proxy masjid display feed same origin`.

## Task 4: Add same-origin Test Control proxy

**Files:**
- Create: `masjid-display/app/api/test-control/route.ts`
- Create: `masjid-display/app/api/test-control/route.test.ts`

1. Write failing tests for active/inactive/expired upstream responses and safe forwarding.
2. Use a very short/no-store cache policy appropriate for ~2-second control polling.
3. GET only. No TV-side mutation endpoint.
4. Commit: `feat: proxy masjid display test control`.

## Task 5: Implement Last Known Good storage atomically

**Files:**
- Create: `masjid-display/lib/lkg.ts`
- Create: `masjid-display/lib/lkg.test.ts`

1. Write failing tests for:
   - versioned storage key such as `masjid-display-lkg-v1`;
   - valid snapshot round-trip;
   - corrupt JSON discarded;
   - invalid schema discarded;
   - new network snapshot replaces LKG only after validation;
   - rejected network snapshot leaves prior LKG byte-for-byte intact.
2. Store `{ snapshot, etag, receivedAt, schemaVersion }` only.
3. Never store secrets/session data.
4. Handle localStorage quota/unavailability without crashing rendering.
5. Commit: `feat: add last known good display storage`.

## Task 6: Implement corrected logical clock

**Files:**
- Create: `masjid-display/lib/logical-clock.ts`
- Create: `masjid-display/lib/logical-clock.test.ts`

1. Write tests for `logicalNow = deviceNow + validatedServerOffset`.
2. Test small drift adoption, large drift requiring confirmation from a second response, persistence of last validated offset during offline operation, and wake-time recomputation.
3. Countdowns must always be `targetInstant - logicalNow`; never persist remaining seconds.
4. Keep clock logic pure; browser/network hooks belong in runtime orchestration later.
5. Commit: `feat: add corrected display logical clock`.

## Task 7: Implement core prayer state engine with boundary tests

**Files:**
- Create: `masjid-display/lib/state/prayer-state.ts`
- Create: `masjid-display/lib/state/prayer-state.test.ts`
- Create: `masjid-display/lib/time.ts`

1. Write table-driven failing tests at one second before/at/after every boundary for Fajr/Dhuhr/Asr/Maghrib/Isha:
   - T-10 `PRAYER_APPROACHING`;
   - prayer instant;
   - Prayer Time Now max two minutes;
   - delay 0 → immediate `IQAMA_NOW`;
   - delay 1 → one-minute Prayer Time Now;
   - delay >=2;
   - waiting period;
   - Iqama Now two minutes;
   - prayer-in-progress end calculated from original Iqama instant + configured duration;
   - return to NORMAL.
2. Test Sunrise never creates a prayer state.
3. Test missing required delay/duration returns a fail-safe unavailable/degraded resolution, never an invented value.
4. Test midnight rollover using actual next-day published schedule.
5. Implement pure `resolvePrayerState(snapshot, logicalNow)`.
6. Commit: `feat: implement deterministic prayer display state`.

## Task 8: Implement Friday/Jumuah state resolution

**Files:**
- Create: `masjid-display/lib/state/friday-state.ts`
- Create: `masjid-display/lib/state/friday-state.test.ts`

1. Write failing tests:
   - first Jumuah equals Friday Dhuhr;
   - Friday focus starts T-60;
   - no normal Dhuhr/Iqama lifecycle Friday;
   - Jumuah Now up to 30 minutes;
   - each additional service gets T-10 focus;
   - current hold is cut when next T-10 starts;
   - multiple additional services resolve correctly;
   - final hold returns NORMAL;
   - `khutbah_time` is irrelevant.
2. Implement using feed's normalized additional services and the same semantics as root canonical Friday resolver.
3. Commit: `feat: implement friday display state machine`.

## Task 9: Compose the final pure display-state resolver

**Files:**
- Create: `masjid-display/lib/state/resolve-display-state.ts`
- Create: `masjid-display/lib/state/resolve-display-state.test.ts`

1. Write priority tests that Friday replaces Dhuhr, prayer states outrank normal content, and stale/missing prayer coverage prevents prayer-state claims.
2. Return a discriminated state object carrying only the data needed by the renderer.
3. Keep Urgent/offline/test indicators outside the mutually exclusive religious-state union.
4. Test wake scenarios by jumping `now` across 20–60 minutes with no intermediate calls; resolver must return the current state directly.
5. Commit: `feat: compose masjid display state resolver`.

## Task 10: Implement deterministic normal content scheduler

**Files:**
- Create: `masjid-display/lib/scheduler.ts`
- Create: `masjid-display/lib/scheduler.test.ts`

1. Write failing tests for the approved pattern: Prayer → Dhikr → Prayer → General, repeating with Prayer as non-skippable anchor.
2. Every ordinary slide duration is 10 seconds.
3. Skip empty families immediately; never show blank slides.
4. Prayer main content must return in approximately <=20 seconds whenever normal rotation is active.
5. Special Display takes the first eligible non-prayer general slot with higher priority but cannot starve Events/Announcements/Campaigns.
6. Round-robin items inside each family.
7. Scheduler pauses during prayer/Friday states and resumes fairly rather than always resetting to item 0.
8. Selection should be derivable from stable time/snapshot basis where possible so a reload does not create pathological repetition.
9. Commit: `feat: add deterministic display content scheduler`.

## Task 11: Implement offline-local content eligibility

**Files:**
- Create: `masjid-display/lib/content-eligibility.ts`
- Create: `masjid-display/lib/content-eligibility.test.ts`

1. Mirror Feed v1 eligibility semantics using snapshot scheduling metadata and `logicalNow`.
2. Test offline expiration/showing for Announcement `displayFrom/displayUntil`, Event end/end-of-date, Campaign start/end, and Urgent windows.
3. If prayer date falls outside cached schedule coverage, return `prayerDataStale = true` and disable schedule-derived prayer state/countdown.
4. Keep still-valid static/dynamic cached content eligible.
5. Commit: `feat: enforce offline display content expiry`.

## Task 12: Build runtime polling/recovery orchestration

**Files:**
- Create: `masjid-display/lib/runtime/use-display-runtime.ts`
- Create: `masjid-display/lib/runtime/use-display-runtime.test.tsx`

1. With fake timers/fetch, write tests for:
   - initial LKG render before network completes;
   - production feed conditional poll every 60 seconds;
   - 304 keeps LKG and refreshes time offset;
   - 200 valid atomically replaces LKG;
   - 200 invalid leaves LKG;
   - network/5xx leaves LKG;
   - immediate sync on `online` and `visibilitychange` return;
   - state recompute every second;
   - no hard periodic reload.
2. Implement production fetch + validation + LKG + clock + resolver integration.
3. On wake/reconnect, recompute first, then request fresh data.
4. Commit: `feat: orchestrate resilient display runtime`.

## Task 13: Integrate real-TV Test Mode override

**Files:**
- Create: `masjid-display/lib/runtime/use-test-control.ts`
- Create: `masjid-display/lib/runtime/use-test-control.test.tsx`
- Modify: `masjid-display/lib/runtime/use-display-runtime.ts`

1. Write fake-timer tests for ~2-second Test Control polling.
2. Active test fixture must override production main presentation immediately while active.
3. Countdown test scenarios must tick from synthetic target instants.
4. Expiry or `Stop Test` response must return immediately to the correctly recomputed real production state; do not resume a stale pre-test state.
5. Test mode must never persist synthetic fixture into LKG.
6. Return a mandatory `testMode=true` flag for renderer indicator.
7. Persistent Prayerapp QR continues from real/configured app URL; Test Mode does not replace it.
8. Commit: `feat: apply admin controlled tv test override`.

## Task 14: Build responsive/adaptive/fluid TV shell

**Files:**
- Create: `masjid-display/components/DisplayShell.tsx`
- Create: `masjid-display/components/Header.tsx`
- Create: `masjid-display/components/PrayerStrip.tsx`
- Create: `masjid-display/components/PersistentAppQr.tsx`
- Create: `masjid-display/components/UrgentBar.tsx`
- Modify: `masjid-display/app/globals.css`
- Add: component tests under `masjid-display/components/__tests__/`

1. Write render tests that core shell regions always exist and the persistent QR remains mounted across representative states.
2. Implement a responsive/adaptive/fluid layout; do not encode device-inch checks or a fixed 1920×1080 canvas.
3. Use CSS Grid, percentages, `clamp()`, `minmax()`, viewport/container units as supported, and content-driven breakpoints.
4. Keep a proportional safe area and minimum readable clamps. A 32-inch 1080p display is a minimum/reference QA target, while larger/4K screens scale without increasing information density.
5. Prayer strip always shows Fajr, Sunrise, Dhuhr/Jumuah semantics, Asr, Maghrib, Isha; Sunrise is visually informational.
6. Persistent QR is generated dynamically from validated `publicAppUrl`, has quiet zone/high contrast, and remains visible in normal/prayer/Friday/Test Mode states.
7. No sound controls or audio elements.
8. Commit: `feat: build responsive masjid display shell`.

## Task 15: Implement prayer and Friday renderers

**Files:**
- Create: `masjid-display/components/states/NormalPrayer.tsx`
- Create: `masjid-display/components/states/PrayerApproaching.tsx`
- Create: `masjid-display/components/states/PrayerTimeNow.tsx`
- Create: `masjid-display/components/states/WaitingForIqama.tsx`
- Create: `masjid-display/components/states/IqamaNow.tsx`
- Create: `masjid-display/components/states/PrayerInProgress.tsx`
- Create: `masjid-display/components/states/FridayMode.tsx`
- Create: `masjid-display/components/states/JumuahNow.tsx`
- Create: `masjid-display/components/DisplayMain.tsx`
- Add focused tests under `masjid-display/components/states/__tests__/`

1. Write tests for required Arabic + German labels and countdown/time rendering from state DTOs.
2. Ensure `PRAYER_IN_PROGRESS` contains no rotating Event/Campaign/Azkar content.
3. Friday renderer labels primary/additional services without showing normal Dhuhr Iqama.
4. Keep transitions minimal (simple CSS opacity/crossfade only); no flashing/bouncing/heavy animation.
5. Commit: `feat: render prayer and friday display states`.

## Task 16: Implement normal content slides and adaptive grouping

**Files:**
- Create: `masjid-display/components/content/AzkarSlide.tsx`
- Create: `masjid-display/components/content/AnnouncementSlide.tsx`
- Create: `masjid-display/components/content/EventSlide.tsx`
- Create: `masjid-display/components/content/CampaignSlide.tsx`
- Create: `masjid-display/components/content/MaghribProgramSlide.tsx`
- Create: `masjid-display/components/content/SpecialDisplaySlide.tsx`
- Create: `masjid-display/components/content/NormalContent.tsx`
- Add tests under `masjid-display/components/content/__tests__/`

1. Test one/two-card grouping behavior: at most two Events or Campaigns and fall back to one when copy/QR constraints demand it.
2. Do not aggressively shrink typography to fit more cards.
3. Dynamic long content rotates Arabic/German views rather than cramming both languages.
4. Campaign URL absent → no QR; present → exact URL encoded into QR.
5. Maghrib Program is informational only and cannot mutate Isha state.
6. Azkar slide shows one canonical item with Arabic, German meaning, source, repeat count where relevant; no scrolling marquee for religious text.
7. Commit: `feat: render rotating mosque content`.

## Task 17: Implement Urgent/Test/Offline/Stale overlays

**Files:**
- Modify: `masjid-display/components/UrgentBar.tsx`
- Create: `masjid-display/components/TestModeBadge.tsx`
- Create: `masjid-display/components/StatusOverlay.tsx`
- Add tests

1. Production Urgent rotates each urgent/language view every 8 seconds and remains visible across all production religious states.
2. Test Mode shows a highly visible `TEST MODE / وضع الاختبار` indicator and uses synthetic test content rather than production urgent/content.
3. Offline indicator is non-blocking while LKG prayer coverage remains valid.
4. Expired prayer horizon shows a prominent update-needed warning and no fabricated prayer countdown/state.
5. Missing critical prayer settings gets a safe unavailable presentation.
6. Commit: `feat: add display operational overlays`.

## Task 18: Add error boundary, watchdog, and diagnostics

**Files:**
- Create: `masjid-display/app/error.tsx`
- Create: `masjid-display/lib/runtime/watchdog.ts`
- Create: `masjid-display/lib/runtime/watchdog.test.ts`
- Create: `masjid-display/components/DiagnosticsPanel.tsx`
- Modify: `masjid-display/app/page.tsx`

1. Write watchdog tests: normal timer throttling/wake does not reload; only proven prolonged renderer/runtime heartbeat failure allows controlled reload.
2. No periodic hourly/daily hard reload.
3. Error boundary should attempt a safe shell/recovery path and never expose stack traces publicly.
4. Diagnostics mode (for example `?diagnostics=1`) may show app version, supported schema, snapshot revision/generated time, last sync/attempt, clock offset, current state, prayer coverage, offline/LKG status, validation reason; it must have no Admin/write capability.
5. Log state transitions/reconnect/snapshot rejection without logging entire sensitive payloads.
6. Commit: `feat: add tv diagnostics and watchdog recovery`.

## Task 19: Add burn-in protection and CSS contract tests

**Files:**
- Create: `masjid-display/lib/pixel-shift.ts`
- Create: `masjid-display/lib/pixel-shift.test.ts`
- Modify: `masjid-display/components/DisplayShell.tsx`
- Modify: `masjid-display/app/globals.css`

1. Test deterministic bounded 2–4px safe-frame shifts on slow intervals.
2. Ensure the shift never clips content beyond the safe zone and is disabled/reduced if viewport constraints make it unsafe.
3. Add source-level CSS contract tests if practical to guard against fixed 32-inch/device-specific media logic and ensure fluid sizing primitives remain present.
4. Commit: `feat: add subtle display burn in protection`.

## Task 20: Verify Plan 4 independently

1. From `masjid-display/`, run `npm test`.
2. Run `npm run lint`.
3. Run `npm run typecheck`.
4. Run `npm run build`.
5. Run root `npm test` to ensure the nested project did not break existing Prayerapp tests/config.
6. Run local root Prayerapp and TV app simultaneously; verify proxy 200/304 behavior.
7. Start Test Mode from Admin and verify the TV changes within the expected ~2-second polling interval, then expires/stops back to current real state.
8. Disconnect network and confirm LKG continues; reconnect and confirm immediate refresh.
9. Put browser tab/background to sleep/throttle timers, return, and verify no stale transient state replay.
10. Commit only stabilization fixes if necessary.

## Exit criteria

- TV app is independently buildable/deployable.
- Production state is derived from validated Feed v1 + logical time, never timer history.
- LKG and offline expiry rules work.
- Friday/Iqama edge cases are unit-tested.
- Admin Test Mode controls the actual TV renderer with synthetic data and auto-returns safely.
- Persistent Prayerapp QR remains visible across all states.
- Layout is responsive/adaptive/fluid, not hard-coded to 32 inches.
- No audio, Supabase browser access, or TV-side write authority exists.

**Next plan:** `2026-09-15-masjid-display-plan-5-integration-certification.md`.