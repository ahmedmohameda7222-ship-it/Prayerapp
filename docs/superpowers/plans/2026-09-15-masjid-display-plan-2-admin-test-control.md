# Masjid Display Plan 2 — Admin, Content Extensions, Iqama Cutover, and TV Test Control Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expose Prayer Engine controls in Prayerapp Admin, add display/content settings, convert root Prayerapp to shared delay-derived Iqama, add a real-TV synthetic Test Mode control plane, then remove legacy absolute-Iqama storage behind an explicit cutover gate.

**Architecture:** Admin remains in the root Prayerapp and follows existing authenticated server-action/data-layer patterns. `masjid_display_settings` owns display-only behavior; existing content tables gain only display scheduling/URL fields; a dedicated singleton `masjid_display_test_state` stores temporary synthetic scenarios. Legacy absolute Iqama fields are removed only after every root consumer has been converted and target-environment shared delays are verified.

**Tech Stack:** Next.js 16.3.3 Admin pages/server actions, TypeScript 5, Supabase/PostgreSQL, Vitest/Testing Library, Plan 1 prayer-engine modules.

**Spec:** `docs/superpowers/specs/2026-09-15-masjid-display-design.md`

## Global Constraints

- No `show_on_masjid_display` opt-in: published display-relevant content is automatically eligible when contextually valid.
- Published Announcements, Events, and Donation Campaigns must have complete Arabic + German display fields.
- Never auto-translate or copy one language into another.
- `masjid_display_settings` contains only five prayer-in-progress durations and Azkar playlist IDs; no calculation settings or Iqama delays.
- Prayer-in-progress durations are 2–120 minutes inclusive.
- All five Iqama delays stay in `prayer_settings`; `0` is valid.
- Final root Prayerapp must not read/write absolute daily Iqama times.
- Maghrib Program keeps `enabled`, lesson title, lesson duration, and manual `combinedIshaTime`; it loses absolute Maghrib Iqama.
- First Friday Jumuah remains Friday Dhuhr; additional Jumuah stays manual per date.
- Test Mode controls the real TV, uses synthetic data only, default TTL is 15 minutes, and never inserts fake rows into production prayer/content tables.
- Test Control public endpoint is GET-only/read-only and `no-store`.
- Persistent Prayerapp QR source is canonical `mosque_settings.public_app_url`; do not store QR images.

---

### Task 1: Add display settings, content scheduling, app URL, and test-state schema

**Files:**
- Create: `supabase/migrations/20260915222000_masjid_display_admin_schema.sql`
- Create: `lib/__tests__/masjid-display-admin-schema.test.ts`

**Interfaces:**
- Consumes: existing `announcements`, `donation_campaigns`, `mosque_settings` tables.
- Produces: `masjid_display_settings`, `masjid_display_test_state`, Announcement scheduling/style fields, nullable Campaign end/URL, mosque `public_app_url`.

- [ ] **Step 1: Write the failing schema contract test**

```ts
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const sql = () => readFileSync(
  "supabase/migrations/20260915222000_masjid_display_admin_schema.sql",
  "utf8",
).toLowerCase();

describe("masjid display admin schema", () => {
  it("adds the two singleton control tables and content fields", () => {
    const migration = sql();
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
    ]) expect(migration).toContain(token);
  });

  it("makes campaign end_date nullable", () => {
    expect(sql()).toMatch(/alter column end_date drop not null/);
  });
});
```

- [ ] **Step 2: Run the test and verify failure**

Run: `npx vitest run lib/__tests__/masjid-display-admin-schema.test.ts`

Expected: FAIL because the migration is missing.

- [ ] **Step 3: Create the migration with exact constraints**

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
```

Enable RLS on both new singleton tables and do not grant anonymous/authenticated writes.

- [ ] **Step 4: Verify schema locally**

Run: `npx vitest run lib/__tests__/masjid-display-admin-schema.test.ts && supabase db reset`

Expected: PASS and local database reset exits 0.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260915222000_masjid_display_admin_schema.sql lib/__tests__/masjid-display-admin-schema.test.ts
git commit -m "feat: add masjid display admin schema"
```

### Task 2: Extend root domain/data contracts and enforce bilingual publication

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
- Consumes: existing localized content types/data mappers.
- Produces:
  - `AnnouncementDisplayStyle = "normal" | "special"`
  - `MasjidDisplaySettings`
  - discriminated `MasjidDisplayTestScenario`/`MasjidDisplayTestState`
  - `validateDisplayPublishableContent(kind, item): string[]`.

- [ ] **Step 1: Write failing publication-validation tests**

```ts
import { describe, expect, it } from "vitest";
import { validateDisplayPublishableContent } from "./content-validation";

describe("display bilingual publication", () => {
  it("rejects a published announcement missing German message", () => {
    const errors = validateDisplayPublishableContent("announcement", {
      published: true,
      titleAr: "تنبيه",
      messageAr: "نص",
      titleDe: "Hinweis",
      messageDe: "",
    });
    expect(errors).toContain("German message is required for published display content");
  });

  it("allows incomplete unpublished drafts", () => {
    expect(validateDisplayPublishableContent("announcement", { published: false })).toEqual([]);
  });
});
```

Add corresponding Event cases for AR+DE title/description/location and Campaign cases for AR+DE title/description.

- [ ] **Step 2: Run tests and verify failure**

Run: `npx vitest run lib/masjid-display/content-validation.test.ts lib/__tests__/masjid-display-data-contract.test.ts`

Expected: FAIL because types/mappers/validator are missing.

- [ ] **Step 3: Add the exact type surface**

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

Extend existing interfaces with `displayStyle`, `displayFrom`, `displayUntil`, optional Campaign `endDate`/`donationUrl`, and MosqueSettings `publicAppUrl`.

- [ ] **Step 4: Implement centralized mappers and validator**

Use existing `localizedFieldsFromDb/localizedFieldsToDb` conventions. `validateDisplayPublishableContent` returns exact human-readable field errors only when the item is being published/active for display. It must not mutate content.

- [ ] **Step 5: Wire the validator into existing Admin actions**

Before create/update results in a published Announcement/Event or active published Campaign, run the validator and return/rethrow the repository's normal Admin validation result format. Do not duplicate field rules inside page components.

- [ ] **Step 6: Run targeted tests**

Run: `npx vitest run lib/masjid-display/content-validation.test.ts lib/__tests__/masjid-display-data-contract.test.ts`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add lib/types.ts lib/data/announcements.ts lib/data/donations.ts lib/data/mosque-settings.ts lib/data/masjid-display-settings.ts lib/data/masjid-display-test-state.ts lib/masjid-display/content-validation.ts lib/masjid-display/content-validation.test.ts lib/__tests__/masjid-display-data-contract.test.ts app/admin/announcements/actions.ts app/admin/events/actions.ts app/admin/donations/actions.ts
git commit -m "feat: extend masjid display data contracts"
```

### Task 3: Build Prayer Engine Admin with Preview-before-commit workflows

**Files:**
- Create: `app/admin/prayer-engine/page.tsx`
- Create: `app/admin/prayer-engine/actions.ts`
- Create: `app/admin/prayer-engine/__tests__/page.test.tsx`
- Modify: `app/admin/page.tsx`
- Reuse: `lib/prayer-engine/server.ts`
- Reuse: `lib/auth/admin-actions.ts`

**Interfaces:**
- Consumes: Plan 1 settings/calibration/preview/commit functions.
- Produces Admin actions:
  - `saveSettingsAction(input)`
  - `calibrateAction(startDate, endDate)`
  - `previewExtensionAction()` / `commitExtensionAction(previewBasis)`
  - `previewRecalculationAction(startDate, endDate)` / `commitRecalculationAction(previewBasis)`.

- [ ] **Step 1: Write the failing page test**

```tsx
it("shows explicit settings, sync warning, and guarded schedule actions", async () => {
  render(<PrayerEnginePageForTest settings={outOfSyncSettings} />);
  expect(screen.getByLabelText(/Fajr angle/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/Fajr Iqama delay/i)).toHaveValue(0);
  expect(screen.getByText(/Needs Recalculation/i)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /Extend Schedule \+1 Year/i })).toBeDisabled();
  expect(screen.getByRole("button", { name: /Preview Recalculation/i })).toBeEnabled();
});
```

- [ ] **Step 2: Run and verify failure**

Run: `npx vitest run app/admin/prayer-engine/__tests__/page.test.tsx`

Expected: FAIL because the page does not exist.

- [ ] **Step 3: Implement Admin actions as thin authenticated wrappers**

Each action validates Admin auth using existing patterns, parses form data into Plan 1 domain input, and calls exactly one domain function. Preview actions must not call commit functions. Commit actions require the revision/date basis returned by the preview.

- [ ] **Step 4: Implement the page**

Render explicit coordinates/timezone/Fajr/Isha/Asr/high-latitude fields, six calculation offsets, five Iqama delays, revision status, Calibration range/action, Extend Preview/confirmation, and Recalculate Preview/Diff/confirmation. Preview output must show exact range, row count, and representative old/new values.

- [ ] **Step 5: Add Admin home navigation and run tests**

Run: `npx vitest run app/admin/prayer-engine/__tests__/page.test.tsx && npm test -- --run app/admin/prayer-engine`

Expected: PASS; if the second filter form is unsupported by the current script, run the first command plus `npm test`.

- [ ] **Step 6: Commit**

```bash
git add app/admin/prayer-engine app/admin/page.tsx
git commit -m "feat: add prayer engine admin workflow"
```

### Task 4: Convert Prayer Times and public root consumers to delay-derived Iqama

**Files:**
- Modify: `app/admin/prayer-times/page.tsx`
- Modify: `app/admin/prayer-times/new/page.tsx`
- Modify: `app/admin/prayer-times/edit/[id]/page.tsx`
- Modify: `app/admin/prayer-times/__tests__/page.test.tsx`
- Modify: `lib/types.ts`
- Modify: `lib/data/prayer-times.ts`
- Modify: `lib/prayer-utils.ts`
- Modify: exact root consumers returned by grep.
- Stop linking to: `app/admin/prayer-times/import/page.tsx`

**Interfaces:**
- Consumes: `PrayerTime` six stored times + shared `PrayerIqamaDelays`.
- Produces: all root public/admin Iqama presentation through `deriveIqamaInstant`; no active `getIqama`/absolute-Iqama consumer.

- [ ] **Step 1: Inventory legacy consumers before editing**

Run:

```bash
git grep -nE 'fajrIqama|dhuhrIqama|asrIqama|maghribIqama|ishaIqama|getIqama\(' -- app components lib
```

Expected: non-empty current legacy consumer list. Save this list in the task/PR notes.

- [ ] **Step 2: Write failing Admin and public Iqama tests**

```tsx
it("does not render absolute Iqama inputs", async () => {
  render(<PrayerTimeEditForTest prayer={prayer} />);
  expect(screen.queryByLabelText(/Fajr Iqama time/i)).not.toBeInTheDocument();
  expect(screen.getByLabelText(/Fajr/i)).toHaveValue(prayer.fajr);
});
```

For a public consumer:

```ts
it("uses the shared delay including zero", () => {
  expect(formatHm(deriveIqamaInstant("2026-09-15", "18:00", 0))).toBe("18:00");
  expect(formatHm(deriveIqamaInstant("2026-09-15", "18:00", 10))).toBe("18:10");
});
```

- [ ] **Step 3: Run targeted tests and verify failure**

Run: `npx vitest run app/admin/prayer-times/__tests__/page.test.tsx lib/__tests__/prayer-utils.test.ts`

Expected: at least the new UI assertion fails before cutover.

- [ ] **Step 4: Remove absolute-Iqama domain mapping**

Remove `fajrIqama/dhuhrIqama/asrIqama/maghribIqama/ishaIqama` from final `PrayerTime`, remove `maghribIqamaTime` from `MaghribProgram`, and remove corresponding map reads/writes from `lib/data/prayer-times.ts`. Preserve Maghrib `enabled`, lesson title/duration, `combinedIshaTime`, notes, published status, and all six prayer times.

- [ ] **Step 5: Convert all root consumers through one shared-settings boundary**

Fetch `prayer_settings` once in the page/domain data path and pass the five delay values to view-model/component logic. Do not query settings independently from every child component. Friday primary Jumuah suppresses normal Dhuhr Iqama.

- [ ] **Step 6: Remove old helper and CSV primary navigation**

After grep shows no caller, delete legacy `getIqama(prayer,name)` semantics. Remove links/buttons that make CSV import the primary Prayer Times workflow; leave unrelated CSV utilities/files until a separate grep confirms no other feature uses them.

- [ ] **Step 7: Run cutover tests and grep**

Run:

```bash
npx vitest run app/admin/prayer-times/__tests__/page.test.tsx lib/__tests__/prayer-utils.test.ts lib/admin-jumuah-validation.test.ts lib/__tests__/admin-jumuah-ui-cleanup.test.ts
git grep -nE 'fajrIqama|dhuhrIqama|asrIqama|maghribIqama|ishaIqama|getIqama\(' -- app components lib || true
```

Expected: tests PASS and grep returns no active application matches.

- [ ] **Step 8: Commit**

```bash
git add app/admin/prayer-times lib/types.ts lib/data/prayer-times.ts lib/prayer-utils.ts app components lib
git commit -m "refactor: derive prayerapp iqama from shared delays"
```

### Task 5: Add Display Settings and extend existing content/settings Admin UI

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
- Consumes: Task 2 data mappers/validators and canonical hardcoded Azkar IDs.
- Produces: Admin-editable display durations/playlist, Announcement style/window, Campaign URL/optional end date, `public_app_url`.

- [ ] **Step 1: Write failing UI tests**

```tsx
it("edits only display-specific settings", () => {
  render(<MasjidDisplaySettingsForTest settings={displaySettings} azkar={azkarItems} />);
  expect(screen.getByLabelText(/Fajr prayer duration/i)).toHaveValue(10);
  expect(screen.getByText(/morning-praise-allah-alone/i)).toBeInTheDocument();
  expect(screen.queryByLabelText(/Fajr Iqama delay/i)).not.toBeInTheDocument();
});

it("allows campaign without end date and optional URL", () => {
  render(<DonationAdminForTest />);
  expect(screen.getByLabelText(/End date/i)).not.toBeRequired();
  expect(screen.getByLabelText(/Donation URL/i)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run tests and verify failure**

Run: `npx vitest run app/admin/masjid-display/__tests__/page.test.tsx lib/__tests__/admin-masjid-display-content.test.ts lib/__tests__/mosque-public-app-url.test.ts`

Expected: FAIL.

- [ ] **Step 3: Implement display settings actions/page**

Validate durations as integers 2–120. Validate every `azkarPlaylistId` against canonical `getAzkarItems(true)` IDs; reject unknown IDs. The page contains no Iqama/calculation/Jumuah editor.

- [ ] **Step 4: Extend existing content pages**

Announcement page adds Normal/Special style and optional start/end datetime inputs. Event page preserves/labels required AR+DE fields. Donation Campaign UI permits blank end date and optional HTTP(S) URL; never adds a QR-image upload.

- [ ] **Step 5: Add `public_app_url` to existing Settings page**

Validation rule:

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

- [ ] **Step 6: Add Admin cards and run tests**

Run: `npx vitest run app/admin/masjid-display/__tests__/page.test.tsx lib/__tests__/admin-masjid-display-content.test.ts lib/__tests__/mosque-public-app-url.test.ts`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add app/admin/masjid-display app/admin/announcements/page.tsx app/admin/events/page.tsx app/admin/donations/page.tsx app/admin/settings app/admin/page.tsx lib/__tests__/admin-masjid-display-content.test.ts lib/__tests__/mosque-public-app-url.test.ts
git commit -m "feat: add masjid display admin controls"
```

### Task 6: Implement synthetic fixtures and the real-TV Test Mode control plane

**Files:**
- Create: `lib/masjid-display/test-fixtures.ts`
- Create: `lib/masjid-display/test-fixtures.test.ts`
- Create: `app/admin/masjid-display-test/page.tsx`
- Create: `app/admin/masjid-display-test/actions.ts`
- Create: `app/admin/masjid-display-test/__tests__/page.test.tsx`
- Create: `app/api/public/masjid-display-test-control/route.ts`
- Create: `app/api/public/masjid-display-test-control/route.test.ts`
- Modify: `app/admin/page.tsx`

**Interfaces:**
- Consumes: `MasjidDisplayTestScenario`, `masjid_display_test_state` data layer.
- Produces:
  - `buildTestFixture(scenario, startedAt): MasjidDisplaySyntheticPayload`
  - Admin `startTestScenario`, `stopTestScenario`, `extendTestScenario`
  - GET `/api/public/masjid-display-test-control` returning `{ active: false } | { active: true, scenario, startedAt, expiresAt, payload }`.

- [ ] **Step 1: Write failing synthetic-fixture tests**

```ts
it("builds a ticking ten-minute prayer-approaching fixture", () => {
  const startedAt = new Date("2026-09-15T18:00:00Z");
  const fixture = buildTestFixture("prayer_approaching", startedAt);
  expect(fixture.targetAt).toBe("2026-09-15T18:10:00.000Z");
  expect(JSON.stringify(fixture)).toContain("test-");
});

it("never uses production row IDs", () => {
  for (const scenario of TEST_SCENARIOS) {
    expect(JSON.stringify(buildTestFixture(scenario, new Date(0)))).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-/i);
  }
});
```

- [ ] **Step 2: Implement every approved scenario explicitly**

The fixture switch must cover: Normal, Prayer Approaching 10m, Prayer Time Now, Waiting for Iqama 5m, Iqama Now, Prayer In Progress, first Jumuah 60m, next Jumuah 10m, Jumuah Now, Urgent AR/DE, Special Display, Event, Campaign+QR, Azkar, Offline/LKG, stale horizon, missing settings, long bilingual. Unknown scenario throws.

- [ ] **Step 3: Write failing Admin action/page tests**

```ts
it("starts a scenario for exactly fifteen minutes", async () => {
  const now = new Date("2026-09-15T18:00:00Z");
  const result = await startTestScenarioForTest("iqama_now", now);
  expect(result.expiresAt).toBe("2026-09-15T18:15:00.000Z");
  expect(result.storageTarget).toBe("masjid_display_test_state");
});
```

Also assert Stop disables the singleton and Extend adds exactly 15 minutes without modifying payload/content tables.

- [ ] **Step 4: Implement authenticated remote-control page/actions**

Use existing Admin auth. Starting writes only the singleton test-state row, with fixture payload, `started_at`, and `expires_at = started_at + 15m`. The page has scenario buttons, active state, Stop, Extend +15. It does not render an embedded TV preview.

- [ ] **Step 5: Write failing public route tests and implement the route**

```ts
it("returns inactive for expired test state", async () => {
  mockTestState({ enabled: true, expiresAt: "2026-09-15T18:00:00Z" });
  setNow("2026-09-15T18:00:01Z");
  const response = await GET(new Request("https://app.test/api/public/masjid-display-test-control"));
  expect(await response.json()).toEqual({ active: false });
  expect(response.headers.get("cache-control")).toContain("no-store");
});
```

GET returns only allowlisted synthetic fields. No POST/PUT/PATCH/DELETE handler is exported.

- [ ] **Step 6: Run all Test Mode tests**

Run: `npx vitest run lib/masjid-display/test-fixtures.test.ts app/admin/masjid-display-test/__tests__/page.test.tsx app/api/public/masjid-display-test-control/route.test.ts`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add lib/masjid-display/test-fixtures.ts lib/masjid-display/test-fixtures.test.ts app/admin/masjid-display-test app/api/public/masjid-display-test-control app/admin/page.tsx
git commit -m "feat: add real tv masjid display test control"
```

### Task 7: Execute the absolute-Iqama removal gate and migration

**Files:**
- Create: `docs/masjid-display/iqama-cutover-checklist.md`
- Create: `supabase/migrations/20260915223000_remove_absolute_iqama_columns.sql`
- Create: `lib/__tests__/absolute-iqama-removal-contract.test.ts`

**Interfaces:**
- Consumes: fully converted root Prayerapp from Task 4 and configured target `prayer_settings` delays.
- Produces: final schema with no `fajr_iqama`, `dhuhr_iqama`, `asr_iqama`, `maghrib_iqama`, `isha_iqama`.

- [ ] **Step 1: Verify code cutover before creating the destructive migration**

Run:

```bash
git grep -nE 'fajr_iqama|dhuhr_iqama|asr_iqama|maghrib_iqama|isha_iqama|fajrIqama|dhuhrIqama|asrIqama|maghribIqama|ishaIqama' -- app components lib || true
npm test
npm run build
```

Expected: no active code matches; tests/build PASS.

- [ ] **Step 2: Verify target-environment delays and record the gate**

The checklist must record a query/result confirming one `prayer_settings` row with all five delay columns non-null; zero is accepted. If the target environment cannot be queried/verified, mark the deployment step `BLOCKED` and do not apply the destructive migration there.

- [ ] **Step 3: Write failing migration test**

```ts
it("drops all five absolute Iqama columns but preserves Maghrib Program", () => {
  const sql = readFileSync("supabase/migrations/20260915223000_remove_absolute_iqama_columns.sql", "utf8").toLowerCase();
  for (const name of ["fajr_iqama","dhuhr_iqama","asr_iqama","maghrib_iqama","isha_iqama"]) {
    expect(sql).toContain(`drop column if exists ${name}`);
  }
  expect(sql).not.toContain("drop column if exists maghrib_combined_isha_time");
});
```

- [ ] **Step 4: Create and verify the drop migration**

```sql
alter table public.prayer_times
  drop column if exists fajr_iqama,
  drop column if exists dhuhr_iqama,
  drop column if exists asr_iqama,
  drop column if exists maghrib_iqama,
  drop column if exists isha_iqama;
```

Run: `npx vitest run lib/__tests__/absolute-iqama-removal-contract.test.ts && supabase db reset`

Expected: PASS. Fresh environments without configured singleton settings remain “setup incomplete”; they do not restore legacy Iqama.

- [ ] **Step 5: Commit**

```bash
git add docs/masjid-display/iqama-cutover-checklist.md supabase/migrations/20260915223000_remove_absolute_iqama_columns.sql lib/__tests__/absolute-iqama-removal-contract.test.ts
git commit -m "refactor: remove absolute iqama storage"
```

### Task 8: Verify Plan 2

**Files:**
- Review: all Plan 2 changes.

**Interfaces:**
- Consumes: completed Admin, content, Iqama cutover, Test Control.
- Produces: root Prayerapp ready to serve Feed v1 in Plan 3.

- [ ] **Step 1: Run focused regression suites**

Run:

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

- [ ] **Step 3: Prove no production-data pollution from Test Mode**

Against local Supabase, capture counts/checksums for `prayer_times`, `announcements`, `events`, `donation_campaigns`; start/extend/stop one synthetic test; compare again. Expected: only `masjid_display_test_state` changed.

- [ ] **Step 4: Final legacy grep**

Run:

```bash
git grep -nE 'fajr_iqama|dhuhr_iqama|asr_iqama|maghrib_iqama|isha_iqama|fajrIqama|dhuhrIqama|asrIqama|maghribIqama|ishaIqama' -- app components lib || true
```

Expected: no active application/domain matches.

- [ ] **Step 5: Commit stabilization only if verification required a fix**

```bash
git add -A
git commit -m "fix: stabilize masjid display admin foundation"
```

Skip if no fix was needed.

## Exit Criteria

- Root Admin exposes prayer-engine generation/calibration with explicit preview/confirmation.
- Root Prayerapp uses only shared delay-derived Iqama and final schema has no absolute-Iqama source.
- Display settings, AR+DE content rules, scheduling fields, donation URL, and public Prayerapp URL are configured through existing Admin surfaces.
- Synthetic Test Mode is Admin-write/public-read-only, 15-minute TTL, and does not pollute production data.
- First Jumuah remains Friday Dhuhr and additional Jumuah remains manual.
- Root tests, typecheck, build, and local DB reset are green.

**Next plan:** `docs/superpowers/plans/2026-09-15-masjid-display-plan-3-display-feed.md`
