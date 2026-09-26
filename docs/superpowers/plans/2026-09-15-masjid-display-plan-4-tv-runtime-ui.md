# Masjid Display Plan 4 — TV Runtime, State Engine, Responsive UI, and Test Override Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the independent `masjid-display/` Next.js application that validates Feed v1, proxies Prayerapp same-origin, survives offline/wake conditions with Last Known Good data, resolves deterministic prayer/Friday/content states, renders a responsive/adaptive/fluid TV UI, keeps the Prayerapp QR persistent, and obeys Admin Test Mode on the real TV.

**Architecture:** The TV app is a read-only consumer with no Supabase/browser write authority. A pure resolver maps validated snapshot + corrected logical time to a render state; timers only cause recomputation. A versioned LKG is replaced atomically only by valid Feed v1 data. Production feed polls every 60 seconds plus wake/reconnect; Test Control polls about every 2 seconds and temporarily substitutes synthetic render input without entering LKG.

**Tech Stack:** Independent Next.js 16.3.3, React 19.2.8, TypeScript 5, Vitest/Testing Library, CSS Grid/container queries/fluid `clamp()`, exact `qrcode.react@4.2.0`. No Supabase client and no audio dependency.

**Spec:** `docs/superpowers/specs/2026-09-15-masjid-display-design.md`

## Global Constraints

- The display is completely silent: no adhan/Iqama audio, volume controls, audio activation, or audio dependencies.
- The display never calculates prayer start times and never queries Supabase directly.
- Feed schema supported in v1 is exactly `1`; invalid/unsupported network snapshots never replace LKG.
- Production feed poll interval is 60 seconds; reconnect/wake/visibility-return triggers immediate refresh.
- Test Control poll interval is approximately 2 seconds; Test Mode default TTL is 15 minutes from Admin.
- Local clock/state recomputes every second; countdown source of truth is `targetInstant - logicalNow`.
- Prayer state: approach T-10, Prayer Time Now max 2m, Iqama Now 2m, in-progress duration starts at original Iqama instant.
- Delay 0 immediately enters Iqama Now; delay 1 shortens Prayer Time Now to one minute; Iqama always preempts stale Prayer Time visual.
- Friday primary service is Dhuhr; first focus T-60; additional focus T-10; Jumuah Now max 30m and is preempted by next T-10.
- Normal slide duration 10s; Urgent language/item view duration 8s.
- Responsive + adaptive + fluid; never hard-code screen inches. 32-inch 1080p is a minimum/reference QA target only.
- Persistent Prayerapp QR remains visible across production and Test Mode; Campaign QR is separate.
- Test Mode never writes/persists synthetic data to LKG and must show `TEST MODE / وضع الاختبار`.
- If current day is outside cached prayer coverage, disable prayer-derived claims and show stale/update-needed warning; never guess prayer times.

---

### Task 1: Scaffold the independent TV project and validate Feed v1

**Files:**
- Create: `masjid-display/package.json`
- Create: `masjid-display/package-lock.json`
- Create: `masjid-display/tsconfig.json`
- Create: `masjid-display/next.config.ts`
- Create: `masjid-display/eslint.config.mjs`
- Create: `masjid-display/vitest.config.ts`
- Create: `masjid-display/vitest.setup.ts`
- Create: `masjid-display/app/layout.tsx`
- Create: `masjid-display/app/page.tsx`
- Create: `masjid-display/app/globals.css`
- Create: `masjid-display/.env.example`
- Create: `masjid-display/lib/feed-types.ts`
- Create: `masjid-display/lib/validate-feed.ts`
- Create: `masjid-display/lib/validate-feed.test.ts`
- Create: `masjid-display/lib/__fixtures__/feed-v1.json`

**Interfaces:**
- Consumes: producer golden fixture `lib/masjid-display/__fixtures__/feed-v1.json` from Plan 3.
- Produces: independent package and `validateFeedV1(value: unknown): MasjidDisplayFeedV1`.

- [ ] **Step 1: Create the package with exact runtime dependencies**

`masjid-display/package.json` must include:

```json
{
  "name": "prayerapp-masjid-display",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint",
    "test": "vitest run",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "next": "16.3.3",
    "qrcode.react": "4.2.0",
    "react": "19.2.8",
    "react-dom": "19.2.8"
  }
}
```

Add compatible exact/dev dependency versions matching root where available. Do not add `@supabase/supabase-js` or an audio package.

- [ ] **Step 2: Copy the producer golden fixture and write failing validation tests**

Copy `lib/masjid-display/__fixtures__/feed-v1.json` byte-for-byte to `masjid-display/lib/__fixtures__/feed-v1.json`, then add:

```ts
import fixture from "./__fixtures__/feed-v1.json";
import { describe, expect, it } from "vitest";
import { validateFeedV1 } from "./validate-feed";

describe("Feed v1 consumer validation", () => {
  it("accepts the producer golden fixture", () => {
    expect(validateFeedV1(fixture).schemaVersion).toBe(1);
  });
  it("rejects an unsupported schema", () => {
    expect(() => validateFeedV1({ ...fixture, schemaVersion: 2 })).toThrow(/schema/i);
  });
  it("rejects duplicate prayer dates", () => {
    const bad = structuredClone(fixture);
    bad.prayers.schedule.push(structuredClone(bad.prayers.schedule[0]));
    expect(() => validateFeedV1(bad)).toThrow(/date/i);
  });
});
```

Add cases for bad HH:MM, missing/negative delay, invalid duration, invalid URL, incomplete AR/DE dynamic content.

- [ ] **Step 3: Run and verify failure**

Run from `masjid-display/`: `npm install && npm test`

Expected: FAIL because `validate-feed.ts` is not implemented.

- [ ] **Step 4: Define Feed v1 consumer types and strict validator**

Mirror the producer DTO names/fields exactly inside the independent project; network JSON remains `unknown` until `validateFeedV1` succeeds. Do not import root server modules at runtime. Validator throws a typed error with field path/reason.

- [ ] **Step 5: Add minimal independent app shell and verify**

`app/layout.tsx` imports only `./globals.css`; `app/page.tsx` renders a TV shell placeholder component without root Prayerapp mobile navigation/providers.

Run:

```bash
cd masjid-display
npm test
npm run typecheck
npm run build
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add masjid-display
git commit -m "feat: scaffold independent masjid display app"
```

### Task 2: Add same-origin Feed/Test proxies and LKG storage

**Files:**
- Create: `masjid-display/lib/upstream.ts`
- Create: `masjid-display/app/api/display-feed/route.ts`
- Create: `masjid-display/app/api/display-feed/route.test.ts`
- Create: `masjid-display/app/api/test-control/route.ts`
- Create: `masjid-display/app/api/test-control/route.test.ts`
- Create: `masjid-display/lib/lkg.ts`
- Create: `masjid-display/lib/lkg.test.ts`

**Interfaces:**
- Consumes: server-only `PRAYERAPP_ORIGIN` environment variable.
- Produces:
  - GET `/api/display-feed` proxying root `/api/public/masjid-display`
  - GET `/api/test-control` proxying root `/api/public/masjid-display-test-control`
  - `loadLkg(): StoredLkg | null`
  - `replaceLkg(snapshot, etag, receivedAt): void`.

- [ ] **Step 1: Write failing Feed proxy tests**

```ts
it("forwards conditional ETag and preserves 304", async () => {
  mockUpstream(new Response(null, { status: 304, headers: { etag: '"abc"', date: "Tue, 15 Sep 2026 18:00:00 GMT" } }));
  const response = await GET(new Request("https://display.test/api/display-feed", {
    headers: { "if-none-match": '"abc"' },
  }));
  expect(lastUpstreamHeaders().get("if-none-match")).toBe('"abc"');
  expect(response.status).toBe(304);
  expect(response.headers.get("etag")).toBe('"abc"');
});
```

Also test 5xx remains 5xx, timeout does not become `200 {}`, and GET only.

- [ ] **Step 2: Write failing Test Control proxy tests**

Assert active/inactive bodies pass through, `Cache-Control: no-store`, and no write method exists.

- [ ] **Step 3: Implement server-only upstream helper and routes**

Validate `PRAYERAPP_ORIGIN` at server startup/use as a fixed configured URL; concatenate only fixed route paths, never a user-supplied target. Use `AbortSignal.timeout(8_000)` for production feed and a smaller reasonable timeout for test control. Forward `If-None-Match`, ETag, response status, and time signal.

- [ ] **Step 4: Write failing LKG tests**

```ts
it("does not replace valid LKG with invalid network data", () => {
  saveRawLkg(validStoredLkg);
  expect(() => replaceLkgFromUnknown({ schemaVersion: 2 }, '"bad"', now)).toThrow();
  expect(loadLkg()).toEqual(validStoredLkg);
});

it("discards corrupt local JSON", () => {
  localStorage.setItem("masjid-display-lkg-v1", "{");
  expect(loadLkg()).toBeNull();
});
```

- [ ] **Step 5: Implement versioned atomic LKG**

Store only `{ snapshot, etag, receivedAt, schemaVersion: 1 }` under `masjid-display-lkg-v1`. Validate before writing. Catch storage quota/unavailability and continue in-memory without crashing.

- [ ] **Step 6: Run tests and commit**

Run: `cd masjid-display && npx vitest run app/api/display-feed app/api/test-control lib/lkg.test.ts`

Expected: PASS.

```bash
git add masjid-display/app/api masjid-display/lib/upstream.ts masjid-display/lib/lkg.ts masjid-display/lib/lkg.test.ts
git commit -m "feat: add display proxies and last known good cache"
```

### Task 3: Implement corrected logical clock and deterministic prayer/Friday resolver

**Files:**
- Create: `masjid-display/lib/logical-clock.ts`
- Create: `masjid-display/lib/logical-clock.test.ts`
- Create: `masjid-display/lib/time.ts`
- Create: `masjid-display/lib/state/prayer-state.ts`
- Create: `masjid-display/lib/state/prayer-state.test.ts`
- Create: `masjid-display/lib/state/friday-state.ts`
- Create: `masjid-display/lib/state/friday-state.test.ts`
- Create: `masjid-display/lib/state/resolve-display-state.ts`
- Create: `masjid-display/lib/state/resolve-display-state.test.ts`

**Interfaces:**
- Consumes: validated Feed v1 + corrected `Date`.
- Produces:
  - `LogicalClock.observeServerDate(deviceNowMs, serverDateHeader): ClockObservation`
  - `LogicalClock.now(deviceNowMs): Date`
  - `resolveDisplayState(feed, logicalNow): DisplayStateResolution`.

- [ ] **Step 1: Write failing logical-clock tests**

```ts
it("uses validated server offset", () => {
  const clock = createLogicalClock();
  clock.observeServerDate(Date.parse("2026-09-15T18:00:05Z"), "Tue, 15 Sep 2026 18:00:00 GMT");
  expect(clock.now(Date.parse("2026-09-15T18:01:05Z")).toISOString()).toBe("2026-09-15T18:01:00.000Z");
});
```

Add a large-drift test that requires a second consistent observation before replacing the last validated offset.

- [ ] **Step 2: Write table-driven prayer boundary tests before implementation**

```ts
it.each([
  ["17:49:59", "NORMAL"],
  ["17:50:00", "PRAYER_APPROACHING"],
  ["18:00:00", "PRAYER_TIME_NOW"],
  ["18:02:00", "WAITING_FOR_IQAMA"],
  ["18:10:00", "IQAMA_NOW"],
  ["18:12:00", "PRAYER_IN_PROGRESS"],
  ["18:20:00", "NORMAL"],
])("resolves %s as %s", (localTime, expected) => {
  expect(resolvePrayerState(feedWithPrayer({ prayer: "18:00", delay: 10, duration: 10 }), local(localTime)).kind).toBe(expected);
});
```

Add explicit delay `0`, delay `1`, delay `2`, Sunrise-no-state, missing-delay fail-safe, midnight rollover, and wake jump directly from pre-prayer to in-progress without intermediate calls.

- [ ] **Step 3: Write Friday boundary tests**

Test Friday Dhuhr as primary Jumuah, T-60 first focus, no Dhuhr Iqama lifecycle, 30m hold, T-10 next-service preemption, multiple services, final return to NORMAL, and irrelevance of `khutbah_time`.

- [ ] **Step 4: Run and verify failure**

Run: `cd masjid-display && npx vitest run lib/logical-clock.test.ts lib/state`

Expected: FAIL.

- [ ] **Step 5: Implement pure time/state modules**

Parse each schedule `date + HH:MM` into an instant in `feed.timezone`; derive Iqama as prayer instant + delay minutes. Calculate:

```ts
const prayerTimeNowEnd = new Date(Math.min(
  prayerInstant.getTime() + 2 * 60_000,
  iqamaInstant.getTime(),
));
const iqamaNowEnd = new Date(iqamaInstant.getTime() + 2 * 60_000);
const prayerInProgressEnd = new Date(iqamaInstant.getTime() + durationMinutes * 60_000);
```

For delay `0`, resolve `IQAMA_NOW` at the prayer instant. For Friday, route Dhuhr time through Friday resolver before normal Dhuhr logic. If the current local date is absent from schedule coverage, return a degraded resolution with no prayer claim.

- [ ] **Step 6: Run tests and commit**

Run: `cd masjid-display && npx vitest run lib/logical-clock.test.ts lib/state`

Expected: PASS.

```bash
git add masjid-display/lib/logical-clock.ts masjid-display/lib/logical-clock.test.ts masjid-display/lib/time.ts masjid-display/lib/state
git commit -m "feat: implement deterministic tv prayer state engine"
```

### Task 4: Implement offline eligibility and deterministic normal scheduler

**Files:**
- Create: `masjid-display/lib/content-eligibility.ts`
- Create: `masjid-display/lib/content-eligibility.test.ts`
- Create: `masjid-display/lib/scheduler.ts`
- Create: `masjid-display/lib/scheduler.test.ts`

**Interfaces:**
- Consumes: Feed v1 dynamic items, logical time, selected Azkar IDs/categories.
- Produces:
  - `activeDisplayContent(feed, now): ActiveContent`
  - `resolveNormalSlide(active, now, basis): NormalSlide`.

- [ ] **Step 1: Write failing offline-expiry tests**

```ts
it("expires urgent locally while offline", () => {
  const urgent = item({ displayUntil: "2026-09-15T18:05:00Z" });
  expect(isAnnouncementActive(urgent, new Date("2026-09-15T18:04:59Z"))).toBe(true);
  expect(isAnnouncementActive(urgent, new Date("2026-09-15T18:05:01Z"))).toBe(false);
});
```

Add future activation, Event end/end-of-date, Campaign optional end, Azkar current-category/fallback, and stale prayer-horizon tests.

- [ ] **Step 2: Write failing scheduler tests**

```ts
it("keeps Prayer as the non-skippable anchor and skips empty families", () => {
  const slides = [0, 10, 20, 30, 40].map((seconds) =>
    resolveNormalSlide(activeOnlyPrayerAndAzkar, atSeconds(seconds), basis).kind,
  );
  expect(slides).toEqual(["PRAYER", "AZKAR", "PRAYER", "AZKAR", "PRAYER"]);
});
```

Add: 10s interval, Prayer returns within ~20s, Special gets first general slot but no starvation, per-family round robin, scheduler pause/resume fairness.

- [ ] **Step 3: Run and verify failure**

Run: `cd masjid-display && npx vitest run lib/content-eligibility.test.ts lib/scheduler.test.ts`

Expected: FAIL.

- [ ] **Step 4: Implement pure offline eligibility**

Mirror producer runtime rules using explicit scheduling fields and `feed.timezone`. Use `smartAzkarCategory` semantics locally (reimplemented as contract-equivalent pure logic or copied golden behavior inside TV project; do not import root runtime code). If no selected Azkar matches current category, fallback to any selected item.

- [ ] **Step 5: Implement deterministic scheduler**

Use stable 10-second epochs derived from `logicalNow` and `snapshotRevision`/a scheduler basis. Slot pattern is Prayer, Dhikr, Prayer, General; skip empty slots immediately. General-family ordering rotates Special/Announcement/Event/Campaign/Maghrib Program fairly, with Special first eligible slot but not exclusive.

- [ ] **Step 6: Run tests and commit**

Run: `cd masjid-display && npx vitest run lib/content-eligibility.test.ts lib/scheduler.test.ts`

Expected: PASS.

```bash
git add masjid-display/lib/content-eligibility.ts masjid-display/lib/content-eligibility.test.ts masjid-display/lib/scheduler.ts masjid-display/lib/scheduler.test.ts
git commit -m "feat: add offline content and deterministic scheduler"
```

### Task 5: Implement resilient runtime polling, wake recovery, and Test Mode override

**Files:**
- Create: `masjid-display/lib/runtime/use-display-runtime.ts`
- Create: `masjid-display/lib/runtime/use-display-runtime.test.tsx`
- Create: `masjid-display/lib/runtime/use-test-control.ts`
- Create: `masjid-display/lib/runtime/use-test-control.test.tsx`

**Interfaces:**
- Consumes: same-origin `/api/display-feed`, `/api/test-control`, LKG, logical clock, state resolver/scheduler.
- Produces: `useDisplayRuntime(): DisplayRuntimeViewModel` containing validated production state, content, urgent list, network/LKG/stale flags, testMode flag, and synthetic override when active.

- [ ] **Step 1: Write failing production-runtime tests with fake timers/fetch**

```tsx
it("renders LKG first, polls every 60s, and keeps LKG after invalid 200", async () => {
  seedLkg(validFeed);
  mockFetchSequence([
    jsonResponse({ schemaVersion: 2 }),
    new Response(null, { status: 304, headers: { date: SERVER_DATE } }),
  ]);
  const { result } = renderHook(() => useDisplayRuntime());
  expect(result.current.feed?.snapshotRevision).toBe(validFeed.snapshotRevision);
  await vi.advanceTimersByTimeAsync(60_000);
  expect(result.current.feed?.snapshotRevision).toBe(validFeed.snapshotRevision);
});
```

Add immediate refresh on `online` and `visibilitychange` return, one-second state recompute, 5xx/timeout retention, valid 200 atomic replacement, and no periodic hard reload.

- [ ] **Step 2: Write failing Test Control tests**

```tsx
it("applies test override without persisting it to LKG and returns to fresh real state", async () => {
  seedLkg(realFeed);
  mockTestControl(activeIqamaFixture);
  const { result } = renderHook(() => useDisplayRuntime());
  await vi.advanceTimersByTimeAsync(2_000);
  expect(result.current.testMode).toBe(true);
  expect(result.current.state.kind).toBe("IQAMA_NOW");
  expect(loadLkg()?.snapshot.snapshotRevision).toBe(realFeed.snapshotRevision);

  mockTestControl({ active: false });
  await vi.advanceTimersByTimeAsync(2_000);
  expect(result.current.testMode).toBe(false);
  expect(result.current.state).toEqual(resolveDisplayState(realFeed, result.current.logicalNow));
});
```

- [ ] **Step 3: Run and verify failure**

Run: `cd masjid-display && npx vitest run lib/runtime`

Expected: FAIL.

- [ ] **Step 4: Implement production polling/recovery**

On mount: load/validate LKG synchronously where browser-safe, render it, fetch fresh feed. Poll production every 60s with stored ETag. On 304 update clock observation only. On valid 200 atomically replace LKG. Register `online` and `visibilitychange` listeners to recompute immediately then fetch. One-second interval only triggers `logicalNow`/resolver recomputation.

- [ ] **Step 5: Implement Test Control polling**

Poll `/api/test-control` every 2 seconds. Active response builds a synthetic runtime view directly from payload and current logical time; never call `replaceLkg` with it. Expiry/inactive response immediately falls back to freshly resolved production state. In Test Mode, production Urgent/main content is suppressed while persistent real app URL remains available.

- [ ] **Step 6: Run tests and commit**

Run: `cd masjid-display && npx vitest run lib/runtime`

Expected: PASS.

```bash
git add masjid-display/lib/runtime
git commit -m "feat: orchestrate resilient tv runtime and test override"
```

### Task 6: Build responsive/adaptive/fluid shell with persistent Prayerapp QR

**Files:**
- Create: `masjid-display/components/DisplayShell.tsx`
- Create: `masjid-display/components/Header.tsx`
- Create: `masjid-display/components/PrayerStrip.tsx`
- Create: `masjid-display/components/PersistentAppQr.tsx`
- Create: `masjid-display/components/UrgentBar.tsx`
- Create: `masjid-display/components/__tests__/DisplayShell.test.tsx`
- Modify: `masjid-display/app/globals.css`

**Interfaces:**
- Consumes: `DisplayRuntimeViewModel` and validated `publicAppUrl`.
- Produces: stable TV shell regions with persistent QR and fluid layout.

- [ ] **Step 1: Write failing shell/QR tests**

```tsx
it("keeps the Prayerapp QR mounted across prayer and test states", () => {
  const { rerender } = render(<DisplayShell vm={vm({ state: approachingState, testMode: false })} />);
  expect(screen.getByTestId("prayerapp-qr")).toBeInTheDocument();
  rerender(<DisplayShell vm={vm({ state: iqamaState, testMode: true })} />);
  expect(screen.getByTestId("prayerapp-qr")).toBeInTheDocument();
  expect(screen.getByText(/TEST MODE/i)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run and verify failure**

Run: `cd masjid-display && npx vitest run components/__tests__/DisplayShell.test.tsx`

Expected: FAIL.

- [ ] **Step 3: Implement QR from canonical URL**

Use `QRCodeSVG` from exact `qrcode.react@4.2.0`:

```tsx
<QRCodeSVG
  data-testid="prayerapp-qr"
  value={publicAppUrl}
  level="M"
  marginSize={4}
  size={256}
  title="Prayerapp öffnen / افتح التطبيق"
/>
```

Wrap the component in fluid CSS so rendered physical size uses `clamp()`; the library numeric SVG viewBox size is not a hard-coded screen-device assumption.

- [ ] **Step 4: Implement fluid shell CSS**

Use a proportional safe area and CSS primitives such as:

```css
.display-shell {
  min-height: 100dvh;
  padding: clamp(1rem, 3vmin, 3.5rem);
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto auto;
  gap: clamp(.75rem, 1.5vmin, 2rem);
  container-type: size;
}
.hero-time { font-size: clamp(4rem, 11vmin, 10rem); }
.prayer-strip { grid-template-columns: repeat(6, minmax(0, 1fr)); }
@container (max-width: 70rem) {
  .prayer-strip { grid-template-columns: repeat(3, minmax(0, 1fr)); }
}
```

No media query may reference physical inches/device model. Larger/4K viewports scale sizes but do not add information density.

- [ ] **Step 5: Implement Header, PrayerStrip, UrgentBar**

Header shows mosque, Gregorian/Hijri date supplied by the runtime/view model, and corrected clock. PrayerStrip shows six entries; Sunrise is visually informational; Friday Dhuhr cell uses Jumuah semantics and omits Dhuhr Iqama. Urgent production bar is absent when no urgent content.

- [ ] **Step 6: Run tests and commit**

Run: `cd masjid-display && npx vitest run components/__tests__/DisplayShell.test.tsx && npm run typecheck`

Expected: PASS.

```bash
git add masjid-display/components masjid-display/app/globals.css
git commit -m "feat: build responsive masjid display shell"
```

### Task 7: Render prayer/Friday states and rotating dynamic content

**Files:**
- Create: `masjid-display/components/DisplayMain.tsx`
- Create: `masjid-display/components/states/PrayerApproaching.tsx`
- Create: `masjid-display/components/states/PrayerTimeNow.tsx`
- Create: `masjid-display/components/states/WaitingForIqama.tsx`
- Create: `masjid-display/components/states/IqamaNow.tsx`
- Create: `masjid-display/components/states/PrayerInProgress.tsx`
- Create: `masjid-display/components/states/FridayMode.tsx`
- Create: `masjid-display/components/states/JumuahNow.tsx`
- Create: `masjid-display/components/content/AzkarSlide.tsx`
- Create: `masjid-display/components/content/AnnouncementSlide.tsx`
- Create: `masjid-display/components/content/EventSlide.tsx`
- Create: `masjid-display/components/content/CampaignSlide.tsx`
- Create: `masjid-display/components/content/MaghribProgramSlide.tsx`
- Create: `masjid-display/components/content/SpecialDisplaySlide.tsx`
- Create: tests under `masjid-display/components/states/__tests__/` and `masjid-display/components/content/__tests__/`

**Interfaces:**
- Consumes: discriminated `DisplayState`/`NormalSlide` DTOs.
- Produces: state-specific AR+DE presentation and content slides.

- [ ] **Step 1: Write failing state-renderer tests**

```tsx
it("renders Iqama Now bilingually and no normal rotating content", () => {
  render(<DisplayMain state={{ kind: "IQAMA_NOW", prayer: "asr", iqamaAt: TEST_DATE }} slide={eventSlide} />);
  expect(screen.getByText(/إقامة الصلاة/)).toBeInTheDocument();
  expect(screen.getByText(/Iqama/)).toBeInTheDocument();
  expect(screen.queryByText(eventSlide.titleDe)).not.toBeInTheDocument();
});
```

Add Prayer In Progress no-rotation, Friday primary/additional labels, and countdown target rendering cases.

- [ ] **Step 2: Write failing content tests**

Test one/two Event/Campaign card grouping; long copy forces one card; Campaign URL absent means no campaign QR; present means QR encodes the exact URL; long dynamic content rotates Arabic/German rather than shrinking both; Maghrib Program never changes Isha state; Azkar shows Arabic + German meaning/source without marquee.

- [ ] **Step 3: Implement renderer dispatch**

Use a `switch(state.kind)` with exhaustive `never` checking. Religious states own the main area and suppress normal scheduler slides. NORMAL renders the current `NormalSlide`.

- [ ] **Step 4: Implement content components with adaptive grouping**

Group max two only when a pure `canRenderTwoCards` heuristic based on string lengths/QR presence and available layout class permits it; QR-bearing pair that violates minimum scan layout becomes one card. Never reduce essential typography below shell minimum to force two cards.

- [ ] **Step 5: Run tests and commit**

Run: `cd masjid-display && npx vitest run components/states components/content`

Expected: PASS.

```bash
git add masjid-display/components/DisplayMain.tsx masjid-display/components/states masjid-display/components/content
git commit -m "feat: render prayer states and mosque content"
```

### Task 8: Add operational overlays, diagnostics, watchdog, and burn-in protection

**Files:**
- Create: `masjid-display/components/TestModeBadge.tsx`
- Create: `masjid-display/components/StatusOverlay.tsx`
- Create: `masjid-display/components/DiagnosticsPanel.tsx`
- Create: `masjid-display/app/error.tsx`
- Create: `masjid-display/lib/runtime/watchdog.ts`
- Create: `masjid-display/lib/runtime/watchdog.test.ts`
- Create: `masjid-display/lib/pixel-shift.ts`
- Create: `masjid-display/lib/pixel-shift.test.ts`
- Modify: `masjid-display/components/DisplayShell.tsx`
- Modify: `masjid-display/app/page.tsx`

**Interfaces:**
- Consumes: runtime health/status.
- Produces: test/stale/offline UI, read-only diagnostics, controlled last-resort recovery, bounded 2–4px pixel shift.

- [ ] **Step 1: Write watchdog/pixel-shift tests**

```ts
it("does not request reload for ordinary timer throttling followed by a heartbeat", () => {
  const watchdog = createWatchdog({ hardFailureMs: 120_000 });
  watchdog.heartbeat(0);
  expect(watchdog.shouldReload(90_000)).toBe(false);
  watchdog.heartbeat(90_001);
  expect(watchdog.shouldReload(180_000)).toBe(false);
});

it("keeps pixel shift inside four pixels", () => {
  for (let i = 0; i < 20; i += 1) {
    const shift = pixelShiftForEpoch(i);
    expect(Math.abs(shift.x)).toBeLessThanOrEqual(4);
    expect(Math.abs(shift.y)).toBeLessThanOrEqual(4);
  }
});
```

- [ ] **Step 2: Run and verify failure**

Run: `cd masjid-display && npx vitest run lib/runtime/watchdog.test.ts lib/pixel-shift.test.ts`

Expected: FAIL.

- [ ] **Step 3: Implement overlays and diagnostics**

Production offline indicator is non-blocking while valid prayer coverage exists. Stale prayer coverage gets a prominent update-needed warning and no prayer countdown claim. Test Mode badge always says `TEST MODE / وضع الاختبار`. `?diagnostics=1` may show app version, schema, snapshot revision/generatedAt, last sync/attempt, clock offset, current state, coverage, offline/LKG/test flags, and validation error summary; it exposes no secrets and no controls.

- [ ] **Step 4: Implement watchdog and error boundary**

Watchdog uses renderer heartbeat timestamps and only requests `window.location.reload()` after a proven prolonged runtime stall beyond the explicit hard-failure threshold; normal 60s/2s polling and sleep/wake never trigger scheduled reload. `app/error.tsx` renders a safe recovery message/shell and reset control without stack traces.

- [ ] **Step 5: Implement slow bounded pixel shift**

Compute a deterministic safe-frame transform from a slow epoch (for example every 10 minutes) selecting offsets in `[-4,-2,0,2,4]`; disable/reduce shift if viewport safe-area calculation says clipping would occur.

- [ ] **Step 6: Run tests and commit**

Run: `cd masjid-display && npx vitest run lib/runtime/watchdog.test.ts lib/pixel-shift.test.ts && npm run typecheck`

Expected: PASS.

```bash
git add masjid-display/components/TestModeBadge.tsx masjid-display/components/StatusOverlay.tsx masjid-display/components/DiagnosticsPanel.tsx masjid-display/app/error.tsx masjid-display/lib/runtime/watchdog.ts masjid-display/lib/runtime/watchdog.test.ts masjid-display/lib/pixel-shift.ts masjid-display/lib/pixel-shift.test.ts masjid-display/components/DisplayShell.tsx masjid-display/app/page.tsx
git commit -m "feat: harden tv display operations"
```

### Task 9: Verify Plan 4 end to end locally

**Files:**
- Review: `masjid-display/` and root public Feed/Test Control endpoints.

**Interfaces:**
- Consumes: completed root endpoints and TV project.
- Produces: independently buildable, locally integrated TV application ready for certification.

- [ ] **Step 1: Run nested-project verification**

```bash
cd masjid-display
npm ci
npm test
npm run lint
npm run typecheck
npm run build
```

Expected: all exit 0.

- [ ] **Step 2: Run root regression tests**

From repository root: `npm test && npm run build`

Expected: PASS.

- [ ] **Step 3: Verify forbidden dependencies/imports**

Run:

```bash
git grep -nE '@supabase/supabase-js|adhan-audio|new Audio\(|<audio' -- masjid-display || true
```

Expected: no production runtime matches. `qrcode.react` is allowed only for QR rendering.

- [ ] **Step 4: Run local two-app integration**

Start root Prayerapp and `masjid-display` on separate ports with `PRAYERAPP_ORIGIN` pointing to root. Verify Feed 200→ETag→304, initial LKG replacement, network disconnect continuing from LKG, reconnect immediate refresh, and visibility hide/show recomputation.

- [ ] **Step 5: Verify real-TV Test Mode path locally**

From Admin, start `prayer_approaching`; expected display change within the next ~2-second poll, ticking synthetic 10-minute target, visible TEST MODE badge, persistent real Prayerapp QR. Stop; expected immediate return to current real state. Confirm LKG file/storage snapshot revision did not change because of the synthetic fixture.

- [ ] **Step 6: Commit stabilization only if needed**

```bash
git add -A
git commit -m "fix: stabilize masjid display tv runtime"
```

Skip if no correction was required.

## Exit Criteria

- Independent TV app builds/tests without Supabase or audio runtime dependencies.
- Strict Feed v1 validation protects LKG.
- Logical clock, prayer/Friday state, offline scheduling, and wake recovery are deterministic.
- Admin Test Mode overrides the real renderer within polling cadence and never pollutes LKG.
- Persistent Prayerapp QR survives every state/Test Mode.
- UI is responsive/adaptive/fluid rather than inch/device hard-coded.
- Diagnostics/watchdog/pixel shift are bounded and non-disruptive.

**Next plan:** `docs/superpowers/plans/2026-09-15-masjid-display-plan-5-integration-certification.md`
