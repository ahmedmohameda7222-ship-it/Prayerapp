# Masjid Display Plan 3 — Public Display Feed and Contract Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the stable versioned public read-only Display Feed v1 that projects Prayerapp’s existing data into one validated atomic snapshot with offline-capable scheduling metadata and stable ETag behavior.

**Architecture:** Root Prayerapp assembles the feed through existing domain/data functions plus the new shared settings; the feed is not a second source of truth. It sends a ~35-day operating window and published current/near-future content required for offline activation/expiry. The returned representation is deterministic for unchanged semantic data/window so conditional GETs can use a strong ETag; current time is conveyed separately by HTTP response time.

**Tech Stack:** Next.js route handlers, TypeScript 5, existing data/cache layer, Vitest 4.1.9, Node `crypto` for canonical content hashing.

**Spec:** `docs/superpowers/specs/2026-09-15-masjid-display-design.md`

## Global Constraints

- Feed endpoint is public GET-only and requires no TV session/token.
- Feed schema version is exactly `1`.
- The feed exposes only public display fields; no service secrets, account/admin data, audit data, coordinates, or calculation angles.
- Feed contains shared Iqama delays, never absolute Iqama times.
- Prayer coverage is previous mosque-local day plus approximately 35 future days.
- Primary Jumuah is Friday Dhuhr; `jumuah_times` supplies additional services only.
- Published future-scheduled content needed during the offline horizon must remain in the snapshot even before activation.
- Already irreversibly expired old content should be excluded.
- Dynamic content must be complete Arabic + German; invalid legacy items are defensively omitted rather than corrupting prayer data.
- Required prayer/settings corruption rejects the whole snapshot; do not partially salvage religious state.
- Same semantic representation must produce the same `snapshotRevision` and ETag.
- HTTP response time is used for clock correction; wall-clock seconds must not mutate the feed body/ETag.
- Test Control remains a separate endpoint and is not embedded in the 60-second production feed.

---

### Task 1: Extract canonical Azkar smart-category logic

**Files:**
- Create: `lib/azkar-routine.ts`
- Create: `lib/azkar-routine.test.ts`
- Modify: `components/azkar/AzkarRoutine.tsx`

**Interfaces:**
- Consumes: `Date`, `APP_TIME_ZONE`.
- Produces: `smartAzkarCategory(date: Date): AzkarCategory`.

- [ ] **Step 1: Write the failing pure tests**

```ts
import { describe, expect, it } from "vitest";
import { smartAzkarCategory } from "./azkar-routine";

const at = (iso: string) => new Date(iso);

describe("smartAzkarCategory", () => {
  it("selects Friday before time-of-day rules", () => {
    expect(smartAzkarCategory(at("2026-09-18T11:00:00Z"))).toBe("Friday");
  });
  it("uses Morning from 04 through 11", () => {
    expect(smartAzkarCategory(at("2026-09-17T04:00:00Z"))).toBe("Morning");
  });
  it("uses Evening from 15 through 21", () => {
    expect(smartAzkarCategory(at("2026-09-17T17:00:00Z"))).toBe("Evening");
  });
  it("uses Sleep from 22 through 03", () => {
    expect(smartAzkarCategory(at("2026-09-17T22:30:00Z"))).toBe("Sleep");
  });
});
```

Choose test UTC instants so their `Europe/Berlin` local hour matches the named boundary.

- [ ] **Step 2: Run and verify failure**

Run: `npx vitest run lib/azkar-routine.test.ts`

Expected: FAIL because the shared function does not exist.

- [ ] **Step 3: Implement by extracting existing behavior exactly**

```ts
export function smartAzkarCategory(date: Date): AzkarCategory {
  const { weekday, hour } = mosqueClock(date);
  if (weekday === "Fri") return "Friday";
  if (hour >= 4 && hour < 12) return "Morning";
  if (hour >= 15 && hour < 22) return "Evening";
  if (hour >= 22 || hour < 4) return "Sleep";
  return "Morning";
}
```

Move `mosqueClock` into this module using `APP_TIME_ZONE`, then replace the private component helper call with `smartAzkarCategory`.

- [ ] **Step 4: Run tests**

Run: `npx vitest run lib/azkar-routine.test.ts && npm test -- --run components/azkar`

Expected: shared tests PASS; if test-script filtering is unsupported, run `npm test`.

- [ ] **Step 5: Commit**

```bash
git add lib/azkar-routine.ts lib/azkar-routine.test.ts components/azkar/AzkarRoutine.tsx
git commit -m "refactor: share azkar routine selection logic"
```

### Task 2: Define Feed v1 DTOs and runtime self-validation

**Files:**
- Create: `lib/masjid-display/feed-contract.ts`
- Create: `lib/masjid-display/validate-feed.ts`
- Create: `lib/masjid-display/feed-contract.test.ts`
- Create: `lib/masjid-display/validate-feed.test.ts`

**Interfaces:**
- Consumes: root domain types.
- Produces:
  - `MasjidDisplayFeedV1`
  - `validateMasjidDisplayFeed(value: unknown): MasjidDisplayFeedV1`.

- [ ] **Step 1: Write the failing shape/allowlist test**

```ts
it("accepts only Feed v1 public fields", () => {
  const feed = validFeedFixture();
  expect(validateMasjidDisplayFeed(feed).schemaVersion).toBe(1);
  const json = JSON.stringify(feed);
  for (const forbidden of ["service_role", "admin_users", "audit_logs", "latitude", "fajrAngle", "fajrIqama"]) {
    expect(json).not.toContain(forbidden);
  }
});
```

Add rejection cases for unsupported schema, duplicate prayer dates, invalid `HH:MM`, missing/negative Iqama delay, out-of-range display duration, duplicate content IDs, invalid `publicAppUrl`/`donationUrl`, and incomplete AR/DE dynamic content.

- [ ] **Step 2: Run and verify failure**

Run: `npx vitest run lib/masjid-display/feed-contract.test.ts lib/masjid-display/validate-feed.test.ts`

Expected: FAIL.

- [ ] **Step 3: Define the DTO boundary**

Use a serializable type whose top level is exactly:

```ts
export interface MasjidDisplayFeedV1 {
  schemaVersion: 1;
  snapshotRevision: string;
  generatedAt: string;
  timezone: string;
  mosque: { nameAr: string; nameDe: string; address: string; publicAppUrl: string };
  prayers: { schedule: DisplayPrayerDay[]; iqamaDelays: DisplayIqamaDelays; additionalJumuah: DisplayJumuahService[] };
  displaySettings: DisplaySettingsDto;
  azkar: DisplayAzkarDto[];
  announcements: DisplayAnnouncementDto[];
  events: DisplayEventDto[];
  campaigns: DisplayCampaignDto[];
}
```

`DisplayPrayerDay` contains date, six prayer `HH:MM` values, published Maghrib Program informational fields, and no absolute-Iqama properties.

- [ ] **Step 4: Implement strict validation**

Validate all required fields/types and explicit constraints. Throw a typed `DisplayFeedValidationError` listing path/reason. Required religious/settings corruption is fatal. The builder in Task 5 will pre-filter invalid dynamic items before this final whole-feed validation.

- [ ] **Step 5: Run tests and commit**

Run: `npx vitest run lib/masjid-display/feed-contract.test.ts lib/masjid-display/validate-feed.test.ts`

Expected: PASS.

```bash
git add lib/masjid-display/feed-contract.ts lib/masjid-display/validate-feed.ts lib/masjid-display/feed-contract.test.ts lib/masjid-display/validate-feed.test.ts
git commit -m "feat: define masjid display feed v1 contract"
```

### Task 3: Implement shared content inclusion/runtime-eligibility and Azkar projection

**Files:**
- Create: `lib/masjid-display/content-eligibility.ts`
- Create: `lib/masjid-display/content-eligibility.test.ts`
- Create: `lib/masjid-display/azkar-selection.ts`
- Create: `lib/masjid-display/azkar-selection.test.ts`
- Reuse: `lib/data/azkar.ts`
- Reuse: `lib/azkar-routine.ts`

**Interfaces:**
- Consumes: published Announcement/Event/Campaign data, `now`, timezone, feed horizon, selected Azkar IDs.
- Produces:
  - `isAnnouncementActive(item, now): boolean`
  - `includeAnnouncementInFeed(item, now, horizonEnd): boolean`
  - equivalent Event/Campaign helpers
  - `selectDisplayAzkar(all, playlistIds): DisplayAzkarDto[]`.

- [ ] **Step 1: Write failing scheduling tests**

```ts
it("includes a future announcement that activates inside the offline horizon", () => {
  const item = announcement({ displayFrom: "2026-09-20T08:00:00Z", displayUntil: "2026-09-21T08:00:00Z" });
  expect(isAnnouncementActive(item, new Date("2026-09-15T08:00:00Z"))).toBe(false);
  expect(includeAnnouncementInFeed(item, new Date("2026-09-15T08:00:00Z"), new Date("2026-10-20T23:59:59Z"))).toBe(true);
});

it("drops irreversibly expired announcements", () => {
  const item = announcement({ displayUntil: "2026-09-14T08:00:00Z" });
  expect(includeAnnouncementInFeed(item, new Date("2026-09-15T08:00:00Z"), new Date("2026-10-20T23:59:59Z"))).toBe(false);
});
```

Add Event end/end-of-date tests and Campaign active/start/optional-end tests.

- [ ] **Step 2: Write failing Azkar projection tests**

```ts
it("projects all selected published Azkar needed for offline category changes", () => {
  const result = selectDisplayAzkar(allAzkar, ["morning-a", "evening-b", "unknown"]);
  expect(result.map((item) => item.id)).toEqual(["morning-a", "evening-b"]);
});
```

- [ ] **Step 3: Run and verify failure**

Run: `npx vitest run lib/masjid-display/content-eligibility.test.ts lib/masjid-display/azkar-selection.test.ts`

Expected: FAIL.

- [ ] **Step 4: Implement pure helpers**

Runtime-active functions use exact scheduling bounds. Feed-inclusion functions include published content capable of becoming active before `horizonEnd`; they exclude content already expired before `now`. Event without endTime expires at mosque-local `23:59:59.999` of its event date. Campaign without endDate has no upper bound while `isActive` is true.

`selectDisplayAzkar` intersects playlist IDs with canonical published items and returns category, Arabic, German, source, repeatCount, sortOrder, and stable ID; it does not filter by current category at feed-build time.

- [ ] **Step 5: Run tests and commit**

Run: `npx vitest run lib/masjid-display/content-eligibility.test.ts lib/masjid-display/azkar-selection.test.ts`

Expected: PASS.

```bash
git add lib/masjid-display/content-eligibility.ts lib/masjid-display/content-eligibility.test.ts lib/masjid-display/azkar-selection.ts lib/masjid-display/azkar-selection.test.ts
git commit -m "feat: add display content scheduling projection"
```

### Task 4: Assemble one atomic deterministic snapshot

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

**Interfaces:**
- Consumes: existing data functions + `now`.
- Produces: `buildMasjidDisplayFeed(now?: Date): Promise<Omit<MasjidDisplayFeedV1,"snapshotRevision">>` with deterministic content for the local-date operating window.

- [ ] **Step 1: Write the failing assembler test**

```ts
it("builds previous-day plus 35-day prayer coverage and preserves future scheduled content", async () => {
  const feed = await buildMasjidDisplayFeed(new Date("2026-09-15T10:00:00Z"), deps);
  expect(feed.prayers.schedule[0].date).toBe("2026-09-14");
  expect(feed.prayers.schedule.at(-1)?.date).toBe("2026-10-20");
  expect(feed.announcements.some((item) => item.displayFrom === "2026-09-20T08:00:00Z")).toBe(true);
  expect(JSON.stringify(feed.prayers.schedule)).not.toContain("Iqama");
});
```

Also assert first Friday service is not duplicated into `additionalJumuah` and primary semantic time equals that Friday’s Dhuhr.

- [ ] **Step 2: Run and verify failure**

Run: `npx vitest run lib/masjid-display/build-feed.test.ts`

Expected: FAIL.

- [ ] **Step 3: Implement deterministic operating-window calculation**

Use mosque-local `todayIso(now)`; start = previous local date; end = local date +35 days. Query published prayer rows within that range, plus additional Jumuah rows in range. Use existing Friday resolver semantics rather than creating a second primary-service record.

- [ ] **Step 4: Assemble only allowlisted fields and pre-filter bad dynamic legacy rows**

If prayer settings or display settings are missing/invalid, throw a typed build error. For each dynamic item, run bilingual/shape validation; omit invalid legacy items and emit a server diagnostic through the repository’s normal logging mechanism. Include future schedulable items via Task 3 inclusion functions.

- [ ] **Step 5: Make `generatedAt` deterministic**

Set it from the latest relevant included source `updatedAt/createdAt` timestamp, falling back to the local-day window anchor timestamp when included sources expose no update timestamp. It must not equal request-time `new Date()` solely because a request occurred.

- [ ] **Step 6: Run tests and commit**

Run: `npx vitest run lib/masjid-display/build-feed.test.ts`

Expected: PASS.

```bash
git add lib/masjid-display/build-feed.ts lib/masjid-display/build-feed.test.ts
git commit -m "feat: assemble atomic masjid display snapshot"
```

### Task 5: Add canonical serialization, snapshot revision, and ETag

**Files:**
- Create: `lib/masjid-display/feed-etag.ts`
- Create: `lib/masjid-display/feed-etag.test.ts`
- Modify: `lib/masjid-display/build-feed.ts`

**Interfaces:**
- Consumes: validated feed body without revision.
- Produces:
  - `canonicalJson(value: unknown): string`
  - `finalizeFeed(body): MasjidDisplayFeedV1`
  - `etagForFeed(feed): string`.

- [ ] **Step 1: Write failing stability tests**

```ts
it("gives the same revision and ETag for the same semantic representation", () => {
  const a = finalizeFeed(feedBody({ mosque: { nameAr: "أ", nameDe: "A" } }));
  const b = finalizeFeed(feedBody({ mosque: { nameDe: "A", nameAr: "أ" } }));
  expect(a.snapshotRevision).toBe(b.snapshotRevision);
  expect(etagForFeed(a)).toBe(etagForFeed(b));
});

it("changes revision when content changes", () => {
  const a = finalizeFeed(feedBody({ mosque: { nameDe: "A" } }));
  const b = finalizeFeed(feedBody({ mosque: { nameDe: "B" } }));
  expect(a.snapshotRevision).not.toBe(b.snapshotRevision);
});
```

- [ ] **Step 2: Run and verify failure**

Run: `npx vitest run lib/masjid-display/feed-etag.test.ts`

Expected: FAIL.

- [ ] **Step 3: Implement canonical JSON and hash**

Recursively sort object keys while preserving array order, stringify, and hash with SHA-256:

```ts
import { createHash } from "node:crypto";

export function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export function etagForFeed(feed: MasjidDisplayFeedV1) {
  return `"${sha256(canonicalJson(feed))}"`;
}
```

Derive `snapshotRevision` from the canonical body before inserting the revision field, then validate the finalized feed. Because `generatedAt` is deterministic, the strong ETag covers the entire representation.

- [ ] **Step 4: Run tests and commit**

Run: `npx vitest run lib/masjid-display/feed-etag.test.ts lib/masjid-display/validate-feed.test.ts`

Expected: PASS.

```bash
git add lib/masjid-display/feed-etag.ts lib/masjid-display/feed-etag.test.ts lib/masjid-display/build-feed.ts
git commit -m "feat: add stable display feed revision and etag"
```

### Task 6: Expose GET-only public feed with conditional requests

**Files:**
- Create: `app/api/public/masjid-display/route.ts`
- Create: `app/api/public/masjid-display/route.test.ts`

**Interfaces:**
- Consumes: `buildMasjidDisplayFeed`, `finalizeFeed`, `etagForFeed`.
- Produces: `GET /api/public/masjid-display` with `200` or conditional `304`.

- [ ] **Step 1: Write failing route tests**

```ts
it("returns 304 for matching If-None-Match", async () => {
  const first = await GET(new Request("https://app.test/api/public/masjid-display"));
  const etag = first.headers.get("etag")!;
  const second = await GET(new Request("https://app.test/api/public/masjid-display", {
    headers: { "if-none-match": etag },
  }));
  expect(second.status).toBe(304);
  expect(await second.text()).toBe("");
  expect(second.headers.get("date")).toBeTruthy();
});
```

Add tests for public no-auth GET, safe 5xx body, allowlisted output, same body/ETag one second later with unchanged source/window, and absence of exported mutation handlers.

- [ ] **Step 2: Run and verify failure**

Run: `npx vitest run app/api/public/masjid-display/route.test.ts`

Expected: FAIL.

- [ ] **Step 3: Implement the route**

Build/finalize/validate once per request; calculate ETag; compare `If-None-Match`; return `304` with ETag/Date when matched. For `200`, return JSON plus ETag and a cache policy that allows revalidation. Catch internal errors and return a generic error identifier/status without raw Supabase/stack details.

Only export `GET`; Next automatically returns method-not-allowed/not-found behavior for unimplemented verbs according to the route handler runtime.

- [ ] **Step 4: Run tests and commit**

Run: `npx vitest run app/api/public/masjid-display/route.test.ts`

Expected: PASS.

```bash
git add app/api/public/masjid-display/route.ts app/api/public/masjid-display/route.test.ts
git commit -m "feat: expose public masjid display feed"
```

### Task 7: Add producer golden fixture, security tests, and verify Plan 3

**Files:**
- Create: `lib/masjid-display/__fixtures__/feed-v1.json`
- Create: `lib/masjid-display/feed-golden.test.ts`
- Create: `lib/__tests__/masjid-display-feed-security.test.ts`

**Interfaces:**
- Consumes: final producer validator/route.
- Produces: stable Feed v1 fixture used by Plan 4 consumer compatibility tests.

- [ ] **Step 1: Create a deterministic synthetic golden fixture**

Include: 35-day-capable prayer sample window, extra Jumuah, active + future-scheduled Announcements including urgent/special, current/upcoming Event, active/future Campaign with and without URL, selected Morning/Evening Azkar, display settings, five delays, mosque/public app URL. Use synthetic IDs/content only.

- [ ] **Step 2: Write the golden/security tests**

```ts
it("accepts the producer golden fixture", () => {
  const fixture = JSON.parse(readFileSync("lib/masjid-display/__fixtures__/feed-v1.json", "utf8"));
  expect(validateMasjidDisplayFeed(fixture).schemaVersion).toBe(1);
});

it("contains no private/admin/calculation fields", () => {
  const json = readFileSync("lib/masjid-display/__fixtures__/feed-v1.json", "utf8");
  for (const forbidden of ["admin_users", "audit_logs", "service_role", "latitude", "longitude", "fajr_iqama"]) {
    expect(json).not.toContain(forbidden);
  }
});
```

- [ ] **Step 3: Run focused Plan 3 tests**

Run: `npx vitest run lib/masjid-display app/api/public/masjid-display lib/__tests__/masjid-display-feed-security.test.ts`

Expected: PASS.

- [ ] **Step 4: Run full root verification**

```bash
npm test
npm run lint
npx tsc --noEmit
npm run build
```

Expected: all exit 0.

- [ ] **Step 5: Manually verify conditional representation stability**

With the local app running:

```bash
curl -sS -D /tmp/feed-h1 -o /tmp/feed-b1 http://localhost:3000/api/public/masjid-display
sleep 1
curl -sS -D /tmp/feed-h2 -o /tmp/feed-b2 http://localhost:3000/api/public/masjid-display
cmp /tmp/feed-b1 /tmp/feed-b2
```

Expected: `cmp` exits 0 when data/local-date window did not change. Capture ETag from the first headers and send it in `If-None-Match`; expected `304`.

- [ ] **Step 6: Commit**

```bash
git add lib/masjid-display/__fixtures__/feed-v1.json lib/masjid-display/feed-golden.test.ts lib/__tests__/masjid-display-feed-security.test.ts
git commit -m "test: certify masjid display feed v1 producer"
```

## Exit Criteria

- Feed v1 is one atomic validated read-only projection.
- Future scheduled content needed for offline activation remains in the feed with explicit timing metadata.
- Feed body/revision/ETag are stable for unchanged semantic content/window.
- Prayer/settings corruption cannot become a partially valid religious snapshot.
- Calculation internals, secrets, accounts, admin data, and absolute Iqama are absent.
- Producer golden fixture exists and root tests/build are green.

**Next plan:** `docs/superpowers/plans/2026-09-15-masjid-display-plan-4-tv-runtime-ui.md`
