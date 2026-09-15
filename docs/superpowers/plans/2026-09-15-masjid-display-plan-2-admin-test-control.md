# Masjid Display Plan 2 — Admin, Content Extensions, Iqama Cutover, and TV Test Control Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expose Prayer Engine controls in Prayerapp Admin, add display/content settings, convert root Prayerapp to shared delay-derived Iqama, add a real-TV synthetic Test Mode that works before real prayer/content data exists, then remove legacy absolute-Iqama storage behind an explicit cutover gate.

**Architecture:** Admin remains in root Prayerapp using existing authenticated server-action/data-layer patterns. `masjid_display_settings` owns only TV behavior. Existing content tables gain only display scheduling/URL fields. A dedicated singleton `masjid_display_test_state` stores temporary synthetic scenarios. The public Test Control projection is independent of the production Display Feed so the real TV can be demonstrated before prayer/content setup; it needs only a configured canonical Prayerapp public URL for the persistent QR. Legacy absolute Iqama is removed only after all root consumers are converted and target shared delays are verified.

**Tech Stack:** Next.js 16.3.3 Admin pages/server actions, TypeScript 5, Supabase/PostgreSQL, Vitest/Testing Library, Plan 1 prayer-engine modules.

**Spec:** `docs/superpowers/specs/2026-09-15-masjid-display-design.md`

## Global Constraints

- No `show_on_masjid_display` opt-in: published display-relevant content is automatically eligible when contextually valid.
- Published Announcements, Events, and Donation Campaigns require complete Arabic + German display fields; never auto-translate/copy languages.
- `masjid_display_settings` contains only five prayer-in-progress durations (2–120 minutes inclusive) and Azkar playlist IDs.
- All five Iqama delays stay in `prayer_settings`; `0` is valid.
- Final root Prayerapp must not read/write absolute daily Iqama times.
- Maghrib Program keeps enabled/title/duration/manual `combinedIshaTime`; it loses absolute Maghrib Iqama.
- First Friday Jumuah remains Friday Dhuhr; additional Jumuah stays manual per date.
- Test Mode controls the real TV, uses synthetic data only, default TTL exactly 15 minutes, and never inserts fake prayer/content rows.
- Test Mode must remain usable when no valid production Feed/LKG exists; starting it requires a valid `mosque_settings.public_app_url` so the persistent real Prayerapp QR can still render.
- Test Control public endpoint is GET-only/read-only, `no-store`, and must not depend on valid prayer settings/display feed construction.
- Persistent Prayerapp QR source is `mosque_settings.public_app_url`; do not store QR images.

---

### Task 1: Add display/content/test-control schema

**Files:**
- Create: `supabase/migrations/20260915222000_masjid_display_admin_schema.sql`
- Create: `lib/__tests__/masjid-display-admin-schema.test.ts`

**Interfaces:**
- Consumes: existing `announcements`, `donation_campaigns`, `mosque_settings`.
- Produces: `masjid_display_settings`, `masjid_display_test_state`, Announcement scheduling/style fields, nullable Campaign end/URL, `public_app_url`.

- [ ] **Step 1: Write the failing schema test**

```ts
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const sql = () => readFileSync("supabase/migrations/20260915222000_masjid_display_admin_schema.sql", "utf8").toLowerCase();

describe("masjid display admin schema", () => {
  it("adds display settings, test state, scheduling, donation URL, and app URL", () => {
    for (const token of [
      "create table public.masjid_display_settings",
      "fajr_prayer_duration_minutes",
      "azkar_playlist_ids",
      "create table public.masjid_display_test_state",
      "display_style",
      "display_from",
      "display_until",
      "donation_url",
      "public_app_url",
    ]) expect(sql()).toContain(token);
  });
  it("makes campaign end_date nullable", () => {
    expect(sql()).toMatch(/alter column end_date drop not null/);
  });
});
```

- [ ] **Step 2: Run and verify failure**

Run: `npx vitest run lib/__tests__/masjid-display-admin-schema.test.ts`

Expected: FAIL.

- [ ] **Step 3: Create the migration**

```sql
create table public.masjid_display_settings (
  id text primary key check (id = '1'),
  fajr_prayer_duration_minutes integer not null check (fajr_prayer_duration_minutes between 2 and 120),
  dhuhr_prayer_duration_minutes integer not null check (dhuhr_prayer_duration_minutes between 2 and 120),
  asr_prayer_duration_minutes integer not null check (asr_prayer_duration_minutes between 2 and 120),
  maghrib_prayer_duration_minutes integer not null check (maghrib_prayer_duration_minutes between 2 and 120),
  isha_prayer_duration_minutes integer not null check (isha_prayer_duration_minutes between 2 and 120),
  azkar_playlist_ids text[] not null default '{}',
  updated_at timestamptz not null default now()
);

create table public.masjid_display_test_state (
  id text primary key check (id = '1'),
  enabled boolean not null default false,
  scenario text,
  payload jsonb,
  started_at timestamptz,
  expires_at timestamptz,
  updated_at timestamptz not null default now(),
  check (not enabled or (scenario is not null and payload is not null and started_at is not null and expires_at > started_at))
);

alter table public.announcements
  add column display_style text not null default 'normal' check (display_style in ('normal','special')),
  add column display_from timestamptz,
  add column display_until timestamptz,
  add constraint announcements_display_window check (
    display_from is null or display_until is null or display_until > display_from
  );

alter table public.donation_campaigns alter column end_date drop not null;
alter table public.donation_campaigns add column donation_url text;
alter table public.mosque_settings add column public_app_url text;

alter table public.masjid_display_settings enable row level security;
alter table public.masjid_display_test_state enable row level security;
```

Do not create anonymous/authenticated write policies for either new singleton table.

- [ ] **Step 4: Verify and commit**

Run: `npx vitest run lib/__tests__/masjid-display-admin-schema.test.ts && supabase db reset`

Expected: PASS.

```bash
git add supabase/migrations/20260915222000_masjid_display_admin_schema.sql lib/__tests__/masjid-display-admin-schema.test.ts
git commit -m "feat: add masjid display admin schema"
```

### Task 2: Extend data contracts and enforce AR+DE publication

**Files:**
- Modify: `lib/types.ts`
- Modify: `lib/data/announcements.ts`
- Modify: `lib/data/donations.ts`
- Modify: `lib/data/mosque-settings.ts`
- Create: `lib/data/masjid-display-settings.ts`
- Create: `lib/data/masjid-display-test-state.ts`
- Create: `lib/masjid-display/content-validation.ts`
- Create: `lib/masjid-display/content-validation.test.ts`
- Create: `lib/__tests__/masjid-display-data-contract.test.ts`
- Modify: `app/admin/announcements/actions.ts`
- Modify: `app/admin/events/actions.ts`
- Modify: `app/admin/donations/actions.ts`

**Interfaces:**
- Produces `AnnouncementDisplayStyle`, `MasjidDisplaySettings`, discriminated Test Scenario/State types, and `validateDisplayPublishableContent(kind,item): string[]`.

- [ ] **Step 1: Write failing bilingual tests**

```ts
it("rejects a published announcement missing German message", () => {
  expect(validateDisplayPublishableContent("announcement", {
    published: true,
    titleAr: "تنبيه",
    messageAr: "نص",
    titleDe: "Hinweis",
    messageDe: "",
  })).toContain("German message is required for published display content");
});

it("allows incomplete unpublished drafts", () => {
  expect(validateDisplayPublishableContent("announcement", { published: false })).toEqual([]);
});
```

Add Event AR+DE title/description/location and Campaign AR+DE title/description cases.

- [ ] **Step 2: Define exact types**

```ts
export type AnnouncementDisplayStyle = "normal" | "special";

export interface MasjidDisplaySettings {
  fajrPrayerDurationMinutes: number;
  dhuhrPrayerDurationMinutes: number;
  asrPrayerDurationMinutes: number;
  maghribPrayerDurationMinutes: number;
  ishaPrayerDurationMinutes: number;
  azkarPlaylistIds: string[];
}

export type MasjidDisplayTestScenario =
  | "normal"
  | "prayer_approaching"
  | "prayer_time_now"
  | "waiting_for_iqama"
  | "iqama_now"
  | "prayer_in_progress"
  | "friday_first_countdown"
  | "friday_next_countdown"
  | "jumuah_now"
  | "urgent"
  | "special_display"
  | "event"
  | "campaign"
  | "azkar"
  | "offline"
  | "stale_prayer_data"
  | "missing_settings"
  | "long_bilingual";
```

Extend Announcement with style/from/until, Campaign with optional endDate/donationUrl, MosqueSettings with `publicAppUrl`.

- [ ] **Step 3: Implement mappers and validator**

Reuse existing `localizedFieldsFromDb/localizedFieldsToDb`; drafts may be incomplete. Published Announcement requires AR+DE title/message, Event requires AR+DE title/description/location, active display Campaign requires AR+DE title/description. Validator returns field errors and never mutates/translates content.

- [ ] **Step 4: Wire existing Admin actions and run tests**

Run: `npx vitest run lib/masjid-display/content-validation.test.ts lib/__tests__/masjid-display-data-contract.test.ts`

Expected: PASS after action/data integration.

- [ ] **Step 5: Commit**

```bash
git add lib/types.ts lib/data/announcements.ts lib/data/donations.ts lib/data/mosque-settings.ts lib/data/masjid-display-settings.ts lib/data/masjid-display-test-state.ts lib/masjid-display/content-validation.ts lib/masjid-display/content-validation.test.ts lib/__tests__/masjid-display-data-contract.test.ts app/admin/announcements/actions.ts app/admin/events/actions.ts app/admin/donations/actions.ts
git commit -m "feat: extend masjid display data contracts"
```

### Task 3: Build Prayer Engine Admin

**Files:**
- Create: `app/admin/prayer-engine/page.tsx`
- Create: `app/admin/prayer-engine/actions.ts`
- Create: `app/admin/prayer-engine/__tests__/page.test.tsx`
- Modify: `app/admin/page.tsx`
- Reuse: `lib/prayer-engine/server.ts`
- Reuse: `lib/auth/admin-actions.ts`

**Interfaces:**
- Produces authenticated settings save, calibration, extension Preview/Commit, and recalculation Preview/Commit actions.

- [ ] **Step 1: Write failing UI tests**

```tsx
it("shows explicit settings and blocks extension while revisions differ", () => {
  render(<PrayerEnginePageForTest settings={outOfSyncSettings} />);
  expect(screen.getByLabelText(/Fajr angle/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/Fajr Iqama delay/i)).toHaveValue(0);
  expect(screen.getByText(/Needs Recalculation/i)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /Extend Schedule \+1 Year/i })).toBeDisabled();
});
```

- [ ] **Step 2: Run and verify failure**

Run: `npx vitest run app/admin/prayer-engine/__tests__/page.test.tsx`

Expected: FAIL.

- [ ] **Step 3: Implement authenticated thin actions**

Preview actions call only Plan 1 preview/calibration functions. Commit actions require the exact revision/date-range basis returned by Preview. Saving calculation settings never calls a schedule commit.

- [ ] **Step 4: Implement page**

Render coordinates/timezone, Fajr/Isha mode fields, Asr/high-latitude, six offsets, five delays, revision status, Calibration range, Extend Preview/confirmation, Recalculate Preview/Diff/confirmation. Preview shows exact range, row count, changed count and representative rows.

- [ ] **Step 5: Add Admin home card, run, commit**

Run: `npx vitest run app/admin/prayer-engine/__tests__/page.test.tsx && npm test`

Expected: PASS.

```bash
git add app/admin/prayer-engine app/admin/page.tsx
git commit -m "feat: add prayer engine admin workflow"
```

### Task 4: Cut root Prayer Times/Iqama consumers to shared delays

**Files:**
- Modify: `app/admin/prayer-times/page.tsx`
- Modify: `app/admin/prayer-times/new/page.tsx`
- Modify: `app/admin/prayer-times/edit/[id]/page.tsx`
- Modify: `app/admin/prayer-times/__tests__/page.test.tsx`
- Modify: `lib/types.ts`
- Modify: `lib/data/prayer-times.ts`
- Modify: `lib/prayer-utils.ts`
- Modify: exact consumers returned by grep.
- Stop linking to: `app/admin/prayer-times/import/page.tsx`

**Interfaces:**
- Consumes: six stored prayer times + shared `PrayerIqamaDelays`.
- Produces: root Prayerapp Iqama presentation exclusively through `deriveIqamaInstant`.

- [ ] **Step 1: Inventory legacy references**

Run:

```bash
git grep -nE 'fajrIqama|dhuhrIqama|asrIqama|maghribIqama|ishaIqama|getIqama\(' -- app components lib
```

Expected: current legacy list; record it in PR notes.

- [ ] **Step 2: Write failing cutover tests**

```tsx
it("does not render absolute Iqama inputs", () => {
  render(<PrayerTimeEditForTest prayer={prayer} />);
  expect(screen.queryByLabelText(/Fajr Iqama time/i)).not.toBeInTheDocument();
});
```

Add public tests that delay `0` yields prayer time itself and delay `10` yields +10 minutes; Friday Dhuhr does not show normal Dhuhr Iqama.

- [ ] **Step 3: Remove absolute fields from root domain/new writes**

Remove `fajrIqama/dhuhrIqama/asrIqama/maghribIqama/ishaIqama` from final `PrayerTime`; remove `maghribIqamaTime`; stop mapping DB absolute fields in `lib/data/prayer-times.ts`. Preserve six times, published/notes, and Maghrib Program enabled/title/duration/combinedIshaTime.

- [ ] **Step 4: Convert consumers through one shared-settings boundary**

Fetch shared delays once in the owning page/data view-model boundary and pass them downward; child components do not query settings individually. Remove legacy `getIqama` after final caller disappears. Remove CSV import navigation as the primary schedule workflow without deleting unrelated utilities still referenced elsewhere.

- [ ] **Step 5: Verify and commit**

Run:

```bash
npx vitest run app/admin/prayer-times/__tests__/page.test.tsx lib/__tests__/prayer-utils.test.ts lib/admin-jumuah-validation.test.ts lib/__tests__/admin-jumuah-ui-cleanup.test.ts
git grep -nE 'fajrIqama|dhuhrIqama|asrIqama|maghribIqama|ishaIqama|getIqama\(' -- app components lib || true
```

Expected: tests PASS; no active application match.

```bash
git add app/admin/prayer-times lib/types.ts lib/data/prayer-times.ts lib/prayer-utils.ts app components lib
git commit -m "refactor: derive prayerapp iqama from shared delays"
```

### Task 5: Add Display/content/settings Admin controls

**Files:**
- Create: `app/admin/masjid-display/page.tsx`
- Create: `app/admin/masjid-display/actions.ts`
- Create: `app/admin/masjid-display/__tests__/page.test.tsx`
- Modify: `app/admin/announcements/page.tsx`
- Modify: `app/admin/events/page.tsx`
- Modify: `app/admin/donations/page.tsx`
- Modify: `app/admin/settings/page.tsx`
- Modify: `app/admin/settings/actions.ts`
- Modify: `app/admin/page.tsx`
- Create: `lib/__tests__/admin-masjid-display-content.test.ts`
- Create: `lib/__tests__/mosque-public-app-url.test.ts`

**Interfaces:**
- Produces Admin-editable display durations/playlist, Announcement style/window, Campaign URL/optional end, `public_app_url`.

- [ ] **Step 1: Write failing UI/action tests**

```tsx
it("edits only display-specific settings", () => {
  render(<MasjidDisplaySettingsForTest settings={displaySettings} azkar={azkarItems} />);
  expect(screen.getByLabelText(/Fajr prayer duration/i)).toHaveValue(10);
  expect(screen.queryByLabelText(/Fajr Iqama delay/i)).not.toBeInTheDocument();
});
```

Also test: Announcement style + optional from/until and inverted-window rejection; Campaign blank end + optional URL; Settings public app URL.

- [ ] **Step 2: Implement Display Settings page/actions**

Validate each duration integer 2–120. Intersect saved Azkar playlist IDs with canonical `getAzkarItems(true)` IDs and reject unknown IDs. No calculation/Iqama/Jumuah editor belongs on this page.

- [ ] **Step 3: Extend existing content pages minimally**

Announcement gets Normal/Special + optional schedule; Event keeps required AR+DE fields; Campaign end date becomes optional and donation URL accepts only HTTP(S); never add QR image upload.

- [ ] **Step 4: Add canonical app URL with exact validation**

```ts
export function validatePublicAppUrl(value: string, env = process.env.NODE_ENV) {
  const url = new URL(value);
  const local = url.hostname === "localhost" || url.hostname === "127.0.0.1";
  if (url.protocol !== "https:" && !(env !== "production" && local && url.protocol === "http:")) {
    throw new Error("Prayerapp public URL must use HTTPS");
  }
  return url.toString();
}
```

- [ ] **Step 5: Run and commit**

Run: `npx vitest run app/admin/masjid-display/__tests__/page.test.tsx lib/__tests__/admin-masjid-display-content.test.ts lib/__tests__/mosque-public-app-url.test.ts`

Expected: PASS.

```bash
git add app/admin/masjid-display app/admin/announcements/page.tsx app/admin/events/page.tsx app/admin/donations/page.tsx app/admin/settings app/admin/page.tsx lib/__tests__/admin-masjid-display-content.test.ts lib/__tests__/mosque-public-app-url.test.ts
git commit -m "feat: add masjid display admin controls"
```

### Task 6: Implement synthetic fixtures and real-TV Test Control independent of production data

**Files:**
- Create: `lib/masjid-display/test-fixtures.ts`
- Create: `lib/masjid-display/test-fixtures.test.ts`
- Create: `app/admin/masjid-display-test/page.tsx`
- Create: `app/admin/masjid-display-test/actions.ts`
- Create: `app/admin/masjid-display-test/__tests__/page.test.tsx`
- Create: `app/api/public/masjid-display-test-control/route.ts`
- Create: `app/api/public/masjid-display-test-control/route.test.ts`
- Modify: `app/admin/page.tsx`
- Reuse: `lib/data/mosque-settings.ts`

**Interfaces:**
- Produces:
  - `buildTestFixture(scenario, startedAt): MasjidDisplaySyntheticPayload`
  - Admin `startTestScenario`, `stopTestScenario`, `extendTestScenario`
  - public GET response:

```ts
type TestControlResponse =
  | { active: false }
  | {
      active: true;
      scenario: MasjidDisplayTestScenario;
      startedAt: string;
      expiresAt: string;
      publicAppUrl: string;
      payload: MasjidDisplaySyntheticPayload;
    };
```

- [ ] **Step 1: Write failing fixture tests**

```ts
it("builds a real ticking ten-minute approaching target", () => {
  const startedAt = new Date("2026-09-15T18:00:00Z");
  const fixture = buildTestFixture("prayer_approaching", startedAt);
  expect(fixture.targetAt).toBe("2026-09-15T18:10:00.000Z");
});
```

Cover every approved scenario: Normal, Prayer Approaching 10m, Prayer Time Now, Waiting Iqama 5m, Iqama Now, Prayer In Progress, first Jumuah 60m, next Jumuah 10m, Jumuah Now, Urgent AR/DE, Special, Event, Campaign+QR, Azkar, Offline/LKG, stale horizon, missing settings, long bilingual. Synthetic IDs use a `test-` prefix and never production UUIDs.

- [ ] **Step 2: Write failing Admin-action tests**

```ts
it("starts for exactly fifteen minutes and requires the real public app URL", async () => {
  mockMosqueSettings({ publicAppUrl: "https://prayer.example.test" });
  const result = await startTestScenarioForTest("iqama_now", new Date("2026-09-15T18:00:00Z"));
  expect(result.expiresAt).toBe("2026-09-15T18:15:00.000Z");
});

it("rejects start when public_app_url is missing", async () => {
  mockMosqueSettings({ publicAppUrl: "" });
  await expect(startTestScenarioForTest("normal", new Date())).rejects.toThrow(/public app url/i);
});
```

Also assert Start/Extend/Stop writes only `masjid_display_test_state`; default TTL 15m; Extend adds exactly 15m to current expiry.

- [ ] **Step 3: Implement remote-control Admin page/actions**

Use existing Admin auth. Build the selected synthetic payload at `started_at`; store only the singleton test state. The page is a remote control, not an embedded preview. Add Admin home card.

- [ ] **Step 4: Write failing public endpoint independence test**

```ts
it("returns active synthetic test even when prayer settings are absent", async () => {
  mockPrayerSettings(null);
  mockMosqueSettings({ publicAppUrl: "https://prayer.example.test" });
  mockActiveTestState();
  const response = await GET(new Request("https://app.test/api/public/masjid-display-test-control"));
  expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({
    active: true,
    publicAppUrl: "https://prayer.example.test",
  });
});
```

Add expired → `{active:false}`, no private/Admin fields, and `Cache-Control: no-store` tests.

- [ ] **Step 5: Implement GET-only Test Control route**

Read only the singleton test state and mosque public URL; do not call `buildMasjidDisplayFeed`, `getPrayerSettings`, or require display settings. If enabled but expired, return inactive. If active, validate `publicAppUrl` and return the allowlisted response above. Export no mutation handler.

- [ ] **Step 6: Run and commit**

Run: `npx vitest run lib/masjid-display/test-fixtures.test.ts app/admin/masjid-display-test/__tests__/page.test.tsx app/api/public/masjid-display-test-control/route.test.ts`

Expected: PASS.

```bash
git add lib/masjid-display/test-fixtures.ts lib/masjid-display/test-fixtures.test.ts app/admin/masjid-display-test app/api/public/masjid-display-test-control app/admin/page.tsx
git commit -m "feat: add independent real tv test control"
```

### Task 7: Gate and remove legacy absolute-Iqama columns

**Files:**
- Create: `docs/masjid-display/iqama-cutover-checklist.md`
- Create: `supabase/migrations/20260915223000_remove_absolute_iqama_columns.sql`
- Create: `lib/__tests__/absolute-iqama-removal-contract.test.ts`

**Interfaces:**
- Consumes: completed root code cutover and verified target `prayer_settings` delays.
- Produces: final schema without five absolute-Iqama columns.

- [ ] **Step 1: Verify code cutover**

```bash
git grep -nE 'fajr_iqama|dhuhr_iqama|asr_iqama|maghrib_iqama|isha_iqama|fajrIqama|dhuhrIqama|asrIqama|maghribIqama|ishaIqama' -- app components lib || true
npm test
npm run build
```

Expected: no active application matches; tests/build PASS.

- [ ] **Step 2: Verify target delays and record gate**

Record an actual target-environment query/result showing one `prayer_settings` row with all five delay columns non-null. Zero is valid. If target access/evidence is unavailable, mark destructive deployment `BLOCKED` and do not apply it there.

- [ ] **Step 3: Write failing migration contract and implement drop**

```ts
it("drops five absolute Iqama columns only", () => {
  const sql = readFileSync("supabase/migrations/20260915223000_remove_absolute_iqama_columns.sql", "utf8").toLowerCase();
  for (const name of ["fajr_iqama","dhuhr_iqama","asr_iqama","maghrib_iqama","isha_iqama"]) {
    expect(sql).toContain(`drop column if exists ${name}`);
  }
  expect(sql).not.toContain("drop column if exists maghrib_combined_isha_time");
});
```

```sql
alter table public.prayer_times
  drop column if exists fajr_iqama,
  drop column if exists dhuhr_iqama,
  drop column if exists asr_iqama,
  drop column if exists maghrib_iqama,
  drop column if exists isha_iqama;
```

- [ ] **Step 4: Verify and commit**

Run: `npx vitest run lib/__tests__/absolute-iqama-removal-contract.test.ts && supabase db reset`

Expected: PASS; fresh environments without singleton settings remain setup-incomplete rather than restoring legacy Iqama.

```bash
git add docs/masjid-display/iqama-cutover-checklist.md supabase/migrations/20260915223000_remove_absolute_iqama_columns.sql lib/__tests__/absolute-iqama-removal-contract.test.ts
git commit -m "refactor: remove absolute iqama storage"
```

### Task 8: Verify Plan 2

**Files:**
- Review: all Plan 2 changes.

**Interfaces:**
- Produces: root Prayerapp ready for Feed v1 and independent TV test control.

- [ ] **Step 1: Run focused regressions**

```bash
npx vitest run app/admin/prayer-engine app/admin/prayer-times app/admin/masjid-display app/admin/masjid-display-test app/api/public/masjid-display-test-control lib/masjid-display lib/admin-jumuah-validation.test.ts lib/__tests__/admin-jumuah-ui-cleanup.test.ts
```

Expected: PASS.

- [ ] **Step 2: Run full root verification**

```bash
npm test
npm run lint
npx tsc --noEmit
npm run build
supabase db reset
```

Expected: all exit 0.

- [ ] **Step 3: Prove Test Mode causes no production data mutation**

Against local Supabase, record counts/checksums of `prayer_times`, `announcements`, `events`, and `donation_campaigns`; Start→Extend→Stop one synthetic test; compare again. Expected: only `masjid_display_test_state` changed.

- [ ] **Step 4: Prove Test Control works before production prayer data**

In a local fixture/database state with no `prayer_settings` row and no valid Display Feed, keep a valid `public_app_url`, start a synthetic scenario, call `/api/public/masjid-display-test-control`. Expected: active 200 response with synthetic payload and real `publicAppUrl`.

- [ ] **Step 5: Final legacy grep**

Run the Task 7 grep again. Expected: no active application/domain matches.

- [ ] **Step 6: Commit stabilization only if required**

```bash
git add -A
git commit -m "fix: stabilize masjid display admin foundation"
```

Skip if no fix was needed.

## Exit Criteria

- Admin safely configures/calibrates/generates/recalculates prayer schedules.
- Root Prayerapp uses only shared delay-derived Iqama; final schema has no absolute-Iqama source.
- Display settings, AR+DE content rules, scheduling fields, donation URL, and public Prayerapp URL are administered through existing root surfaces.
- Synthetic real-TV Test Mode is Admin-write/public-read-only, exact 15-minute TTL, works without production prayer/feed data, always carries the real configured Prayerapp URL, and never pollutes production tables.
- First Jumuah remains Friday Dhuhr and additional Jumuah remains manual.
- Root tests/typecheck/build/DB reset are green.

**Next plan:** `docs/superpowers/plans/2026-09-15-masjid-display-plan-3-display-feed.md`
