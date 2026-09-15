# Masjid Display Plan 1 — Prayer Engine and Database Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the deterministic internal Prayer Time Engine, canonical `prayer_settings`, atomic schedule generation/recalculation, calibration, and shared delay-derived Iqama foundation while keeping existing Prayerapp consumers operational until Plan 2.

**Architecture:** Prayerapp stays the source of truth. Exact-pinned `adhan@4.4.6` is isolated behind one server/domain adapter configured with `CalculationMethod.Other()` and `Rounding.None`; explicit settings are validated before calculation; wrapper-owned minute offsets and final ceiling happen after raw second-precision instants. Generation previews are pure; approved writes go through transaction-safe PostgreSQL RPCs with calculation-revision and mosque-local-date race checks. This plan is additive and does not drop legacy absolute-Iqama columns.

**Tech Stack:** Next.js 16.3.3, React 19.2.8, TypeScript 5, Supabase/PostgreSQL, Vitest 4.1.9, exact `adhan@4.4.6`, existing `lib/date-utils.ts` helpers.

**Spec:** `docs/superpowers/specs/2026-09-15-masjid-display-design.md`

## Global Constraints

- No external prayer-time API at runtime.
- `adhan@4.4.6` is exact-pinned and may be imported only by `lib/prayer-engine/calculate.ts`.
- Stored explicit parameters, not a preset name, are authoritative.
- Initial timezone is IANA `Europe/Berlin`; DST is never implemented with manual `+1/+2` offsets.
- Stored high-latitude values are exactly `middle_of_night`, `seventh_of_night`, or `twilight_angle` and map to Adhan’s three `HighLatitudeRule` values.
- Calculation offsets exist for Fajr, Sunrise, Dhuhr, Asr, Maghrib, and Isha and are applied by Prayerapp after Adhan returns unrounded raw instants.
- Adhan rounding must be `Rounding.None`; final stored `HH:MM` uses wrapper-owned ceiling when seconds/milliseconds are non-zero.
- All five Iqama delays are mandatory; `0` is valid.
- Saving settings never modifies live `prayer_times` automatically.
- `Extend Schedule +1 Year` never overwrites an existing date and is blocked while calculation revisions differ.
- `Recalculate Future Schedule` may insert missing future rows or overwrite existing future rows inside the explicitly approved range; it never changes dates before mosque-local today.
- Preview/calibration paths are side-effect free; persistence is atomic.
- Database commit logic receives mosque-local `today` from the server; it must not use PostgreSQL `current_date` as the religious scheduling authority.
- Do not remove legacy `*_iqama` columns in this plan.

---

### Task 1: Pin Adhan and enforce the single-adapter boundary

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `lib/prayer-engine/dependency-boundary.test.ts`
- Create: `lib/prayer-engine/calculate.ts`

**Interfaces:**
- Consumes: repository source tree.
- Produces: exact `adhan@4.4.6`; only `lib/prayer-engine/calculate.ts` may import it.

- [ ] **Step 1: Write the failing boundary test**

```ts
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

function sourceFiles(root: string): string[] {
  return readdirSync(root).flatMap((name) => {
    const path = join(root, name);
    return statSync(path).isDirectory() ? sourceFiles(path) : [path];
  });
}

describe("Adhan dependency boundary", () => {
  it("allows exactly one production import", () => {
    const matches = ["app", "components", "lib"]
      .flatMap(sourceFiles)
      .filter((path) => /\.(ts|tsx)$/.test(path))
      .filter((path) => /from ["']adhan["']/.test(readFileSync(path, "utf8")))
      .map((path) => relative(process.cwd(), path).replaceAll("\\", "/"));
    expect(matches).toEqual(["lib/prayer-engine/calculate.ts"]);
  });
});
```

- [ ] **Step 2: Run the test and verify the precondition fails**

Run: `npx vitest run lib/prayer-engine/dependency-boundary.test.ts`

Expected: FAIL because the adapter/import does not exist.

- [ ] **Step 3: Install the exact dependency and create the boundary import**

Run: `npm install --save-exact adhan@4.4.6`

```ts
import {
  CalculationMethod,
  Coordinates,
  HighLatitudeRule,
  Madhab,
  PrayerTimes,
  Rounding,
} from "adhan";
```

Do not re-export Adhan types for UI/Admin consumers; the adapter will expose only Prayerapp domain functions in Task 3.

- [ ] **Step 4: Verify package and test**

Run: `npm ls adhan && npx vitest run lib/prayer-engine/dependency-boundary.test.ts`

Expected: `adhan@4.4.6`; PASS.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json lib/prayer-engine/calculate.ts lib/prayer-engine/dependency-boundary.test.ts
git commit -m "chore: pin prayer calculation dependency"
```

### Task 2: Add `prayer_settings` and timezone-safe atomic persistence RPCs

**Files:**
- Create: `supabase/migrations/20260915220000_masjid_display_prayer_settings.sql`
- Create: `supabase/migrations/20260915221000_prayer_schedule_atomic_generation.sql`
- Create: `lib/prayer-engine/settings-schema.test.ts`
- Create: `lib/prayer-engine/persistence-contract.test.ts`

**Interfaces:**
- Consumes: existing `public.prayer_times` unique `date` rows.
- Produces:
  - singleton `public.prayer_settings`;
  - `commit_prayer_schedule_extension(p_rows jsonb, p_expected_revision bigint, p_today date, p_expected_first_missing date)`;
  - `commit_prayer_schedule_recalculation(p_rows jsonb, p_expected_revision bigint, p_today date, p_start_date date, p_end_date date)`.

- [ ] **Step 1: Write failing migration tests**

```ts
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const settingsSql = () => readFileSync("supabase/migrations/20260915220000_masjid_display_prayer_settings.sql", "utf8").toLowerCase();
const persistenceSql = () => readFileSync("supabase/migrations/20260915221000_prayer_schedule_atomic_generation.sql", "utf8").toLowerCase();

describe("prayer settings migration", () => {
  it("contains canonical settings, revisions, and five delays", () => {
    for (const token of [
      "create table public.prayer_settings",
      "high_latitude_rule",
      "calculation_revision",
      "applied_calculation_revision",
      "fajr_iqama_delay_minutes",
      "dhuhr_iqama_delay_minutes",
      "asr_iqama_delay_minutes",
      "maghrib_iqama_delay_minutes",
      "isha_iqama_delay_minutes",
    ]) expect(settingsSql()).toContain(token);
  });
});

describe("prayer persistence migration", () => {
  it("requires caller-supplied mosque-local today", () => {
    expect(persistenceSql()).toContain("p_today date");
    expect(persistenceSql()).not.toContain("current_date");
  });
});
```

- [ ] **Step 2: Run and verify failure**

Run: `npx vitest run lib/prayer-engine/settings-schema.test.ts lib/prayer-engine/persistence-contract.test.ts`

Expected: FAIL because migrations are missing.

- [ ] **Step 3: Create the canonical settings schema**

```sql
create table public.prayer_settings (
  id text primary key check (id = '1'),
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  timezone text not null,
  fajr_angle numeric not null check (fajr_angle > 0 and fajr_angle <= 30),
  isha_rule text not null check (isha_rule in ('angle','fixed_minutes')),
  isha_angle numeric check (isha_angle is null or (isha_angle > 0 and isha_angle <= 30)),
  isha_minutes_after_maghrib integer check (isha_minutes_after_maghrib is null or isha_minutes_after_maghrib between 0 and 240),
  asr_shadow_factor integer not null check (asr_shadow_factor in (1,2)),
  high_latitude_rule text not null check (high_latitude_rule in ('middle_of_night','seventh_of_night','twilight_angle')),
  fajr_offset_minutes integer not null default 0 check (fajr_offset_minutes between -60 and 60),
  sunrise_offset_minutes integer not null default 0 check (sunrise_offset_minutes between -60 and 60),
  dhuhr_offset_minutes integer not null default 0 check (dhuhr_offset_minutes between -60 and 60),
  asr_offset_minutes integer not null default 0 check (asr_offset_minutes between -60 and 60),
  maghrib_offset_minutes integer not null default 0 check (maghrib_offset_minutes between -60 and 60),
  isha_offset_minutes integer not null default 0 check (isha_offset_minutes between -60 and 60),
  fajr_iqama_delay_minutes integer not null check (fajr_iqama_delay_minutes between 0 and 180),
  dhuhr_iqama_delay_minutes integer not null check (dhuhr_iqama_delay_minutes between 0 and 180),
  asr_iqama_delay_minutes integer not null check (asr_iqama_delay_minutes between 0 and 180),
  maghrib_iqama_delay_minutes integer not null check (maghrib_iqama_delay_minutes between 0 and 180),
  isha_iqama_delay_minutes integer not null check (isha_iqama_delay_minutes between 0 and 180),
  calculation_revision bigint not null default 1 check (calculation_revision >= 1),
  applied_calculation_revision bigint not null default 0 check (applied_calculation_revision >= 0),
  updated_at timestamptz not null default now(),
  check (
    (isha_rule = 'angle' and isha_angle is not null and isha_minutes_after_maghrib is null)
    or (isha_rule = 'fixed_minutes' and isha_angle is null and isha_minutes_after_maghrib is not null)
  )
);

alter table public.prayer_settings enable row level security;
```

Do not seed invented religious/calculation values.

- [ ] **Step 4: Create atomic extension RPC with `p_today`**

```sql
create or replace function public.commit_prayer_schedule_extension(
  p_rows jsonb,
  p_expected_revision bigint,
  p_today date,
  p_expected_first_missing date
) returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_settings public.prayer_settings%rowtype;
  v_first_missing date;
  v_count integer;
begin
  select * into strict v_settings from public.prayer_settings where id = '1' for update;
  if v_settings.calculation_revision <> p_expected_revision
     or v_settings.applied_calculation_revision <> p_expected_revision then
    raise exception 'calculation revision mismatch';
  end if;

  select d::date into v_first_missing
  from generate_series(p_today, p_today + interval '10 years', interval '1 day') d
  where not exists (select 1 from public.prayer_times p where p.date = d::date)
  order by d limit 1;

  if v_first_missing is distinct from p_expected_first_missing then
    raise exception 'first missing date changed';
  end if;

  if exists (
    select 1 from jsonb_to_recordset(p_rows) as r(date date)
    join public.prayer_times p on p.date = r.date
  ) then raise exception 'extension would overwrite existing schedule'; end if;

  insert into public.prayer_times(date,fajr,sunrise,dhuhr,asr,maghrib,isha,published)
  select date,fajr,sunrise,dhuhr,asr,maghrib,isha,true
  from jsonb_to_recordset(p_rows)
    as r(date date,fajr text,sunrise text,dhuhr text,asr text,maghrib text,isha text);
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;
```

- [ ] **Step 5: Create atomic recalculation/upsert RPC**

The function must lock the singleton settings row, require `calculation_revision = p_expected_revision`, reject `p_start_date < p_today`, reject rows outside `[p_start_date,p_end_date]`, require the approved payload to contain exactly the intended continuous date range, then `insert ... on conflict (date) do update` only six prayer start fields + `published=true`. Preserve notes and Maghrib Program columns. Only after all row writes succeed:

```sql
update public.prayer_settings
set applied_calculation_revision = calculation_revision,
    updated_at = now()
where id = '1';
```

Revoke execution from public roles for both RPC signatures.

- [ ] **Step 6: Run migration tests and reset local DB**

Run: `npx vitest run lib/prayer-engine/settings-schema.test.ts lib/prayer-engine/persistence-contract.test.ts && supabase db reset`

Expected: PASS and reset exits 0.

- [ ] **Step 7: Commit**

```bash
git add supabase/migrations/20260915220000_masjid_display_prayer_settings.sql supabase/migrations/20260915221000_prayer_schedule_atomic_generation.sql lib/prayer-engine/settings-schema.test.ts lib/prayer-engine/persistence-contract.test.ts
git commit -m "feat: add prayer engine persistence foundation"
```

### Task 3: Define types/validation and implement raw-second Adhan calculation

**Files:**
- Create: `lib/prayer-engine/types.ts`
- Create: `lib/prayer-engine/test-settings.ts`
- Create: `lib/prayer-engine/validate-settings.ts`
- Create: `lib/prayer-engine/validate-settings.test.ts`
- Modify: `lib/prayer-engine/calculate.ts`
- Create: `lib/prayer-engine/calculate.test.ts`
- Create: `lib/prayer-engine/rounding.ts`
- Create: `lib/prayer-engine/rounding.test.ts`

**Interfaces:**
- Consumes: `PrayerCalculationSettings`.
- Produces:
  - `validatePrayerCalculationSettings(value: unknown): PrayerCalculationSettings`
  - `calculatePrayerTimes(date: string, settings: PrayerCalculationSettings): PrayerCalculationResult`
  - `ceilInstantToLocalMinute(instant: Date, timeZone: string): string`.

- [ ] **Step 1: Define exact domain types**

```ts
export type PrayerKey = "fajr" | "sunrise" | "dhuhr" | "asr" | "maghrib" | "isha";
export type ObligatoryPrayerKey = Exclude<PrayerKey, "sunrise">;
export type HighLatitudeSetting = "middle_of_night" | "seventh_of_night" | "twilight_angle";
export type PrayerIqamaDelays = Record<ObligatoryPrayerKey, number>;
export type PrayerOffsets = Record<PrayerKey, number>;

export interface PrayerCalculationSettings {
  latitude: number;
  longitude: number;
  timezone: string;
  fajrAngle: number;
  ishaRule: "angle" | "fixed_minutes";
  ishaAngle: number | null;
  ishaMinutesAfterMaghrib: number | null;
  asrShadowFactor: 1 | 2;
  highLatitudeRule: HighLatitudeSetting;
  offsets: PrayerOffsets;
  iqamaDelays: PrayerIqamaDelays;
  calculationRevision: number;
  appliedCalculationRevision: number;
}

export type PrayerCalculationResult = { date: string } & Record<PrayerKey, string>;
```

- [ ] **Step 2: Write failing validation/ceiling tests**

```ts
it("accepts zero Iqama delay and rejects unknown high-latitude rule", () => {
  expect(validatePrayerCalculationSettings(validSettings).iqamaDelays.fajr).toBe(0);
  expect(() => validatePrayerCalculationSettings({ ...validSettings, highLatitudeRule: "unknown" })).toThrow();
});

it.each([
  ["2026-01-15T15:42:00.000Z", "16:42"],
  ["2026-01-15T15:42:01.000Z", "16:43"],
  ["2026-01-15T15:42:59.999Z", "16:43"],
])("ceil %s", (iso, expected) => {
  expect(ceilInstantToLocalMinute(new Date(iso), "Europe/Berlin")).toBe(expected);
});
```

Run: `npx vitest run lib/prayer-engine/validate-settings.test.ts lib/prayer-engine/rounding.test.ts`

Expected: FAIL.

- [ ] **Step 3: Implement settings validation and final ceiling**

Use finite/range checks matching SQL. Validate IANA timezone by constructing `Intl.DateTimeFormat` with the supplied timezone. Ceiling first adds the remainder to the next minute only when seconds/milliseconds are non-zero, then formats `HH:MM` with `hourCycle: "h23"` and explicit timezone.

- [ ] **Step 4: Write failing calculation tests**

```ts
it("is deterministic and emits six HH:MM values", () => {
  const first = calculatePrayerTimes("2026-07-15", validSettings);
  const second = calculatePrayerTimes("2026-07-15", validSettings);
  expect(first).toEqual(second);
  for (const key of ["fajr","sunrise","dhuhr","asr","maghrib","isha"] as const) {
    expect(first[key]).toMatch(/^([01]\d|2[0-3]):[0-5]\d$/);
  }
});
```

Run: `npx vitest run lib/prayer-engine/calculate.test.ts`

Expected: FAIL until adapter logic exists.

- [ ] **Step 5: Implement exact Adhan parameter mapping**

```ts
const coordinates = new Coordinates(settings.latitude, settings.longitude);
const params = CalculationMethod.Other();
params.fajrAngle = settings.fajrAngle;
params.ishaAngle = settings.ishaRule === "angle" ? settings.ishaAngle! : 0;
params.ishaInterval = settings.ishaRule === "fixed_minutes" ? settings.ishaMinutesAfterMaghrib! : 0;
params.madhab = settings.asrShadowFactor === 2 ? Madhab.Hanafi : Madhab.Shafi;
params.highLatitudeRule = {
  middle_of_night: HighLatitudeRule.MiddleOfTheNight,
  seventh_of_night: HighLatitudeRule.SeventhOfTheNight,
  twilight_angle: HighLatitudeRule.TwilightAngle,
}[settings.highLatitudeRule];
params.rounding = Rounding.None;
```

Create the Gregorian Adhan date from the requested ISO date at noon UTC so Germany’s local year/month/day cannot cross due to server timezone. Construct `new PrayerTimes(coordinates, adhanDate, params)`. For each raw prayer `Date`, add the wrapper-owned `settings.offsets[key] * 60_000`, then call `ceilInstantToLocalMinute`. Do not set `params.adjustments`; keep method/wrapper offsets from being applied twice.

- [ ] **Step 6: Run Task 3 tests and import-boundary test**

Run: `npx vitest run lib/prayer-engine/validate-settings.test.ts lib/prayer-engine/rounding.test.ts lib/prayer-engine/calculate.test.ts lib/prayer-engine/dependency-boundary.test.ts`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add lib/prayer-engine
git commit -m "feat: implement deterministic prayer calculation"
```

### Task 4: Implement gap generation, recalculation diff, and calibration

**Files:**
- Create: `lib/prayer-engine/generate.ts`
- Create: `lib/prayer-engine/generate.test.ts`
- Create: `lib/prayer-engine/calibration.ts`
- Create: `lib/prayer-engine/calibration.test.ts`

**Interfaces:**
- Produces:
  - `buildExtensionPreview(existingDates, today, settings): PrayerSchedulePreview`
  - `buildRecalculationPreview(existing, startDate, endDate, settings): PrayerScheduleDiff`
  - `calibrateSchedule(existing, settings): CalibrationReport`.

- [ ] **Step 1: Write failing extension tests**

```ts
it("starts at the first internal missing date without overwriting later existing rows", () => {
  const preview = buildExtensionPreview(
    ["2026-09-15", "2026-09-16", "2026-09-18"],
    "2026-09-15",
    validSettings,
  );
  expect(preview.startDate).toBe("2026-09-17");
  expect(preview.rows.some((row) => row.date === "2026-09-18")).toBe(false);
});

it("uses one calendar year from a leap-day start", () => {
  const preview = buildExtensionPreview([], "2028-02-29", validSettings);
  expect(preview.startDate).toBe("2028-02-29");
  expect(preview.endDate).toBe("2029-02-28");
});
```

- [ ] **Step 2: Implement pure extension/recalculation preview**

Extension finds the first missing ISO date from `today`, calculates through the day before the same calendar date one year later, and filters all dates already present. Recalculation emits a complete continuous row for every approved date in `[startDate,endDate]`, regardless of whether the current table row exists, so the later atomic upsert can initialize missing future rows.

- [ ] **Step 3: Write failing calibration tests**

```ts
it("flags an unexplained delta above one minute", () => {
  const result = comparePrayerDay(
    { date: "2026-01-15", fajr: "06:00", sunrise: "08:00", dhuhr: "12:15", asr: "14:30", maghrib: "16:45", isha: "18:15" },
    { date: "2026-01-15", fajr: "06:02", sunrise: "08:00", dhuhr: "12:15", asr: "14:30", maghrib: "16:45", isha: "18:15" },
  );
  expect(result.fajr.deltaMinutes).toBe(2);
  expect(result.fajr.requiresInvestigation).toBe(true);
});
```

- [ ] **Step 4: Implement calibration using existing `zonedDateTime`**

Convert each existing/generated `date + HH:MM` to an instant with the existing Prayerapp helper and compute signed minute delta. Mark `Math.abs(deltaMinutes) > 1`. Diff results carry old/new six prayer values, changed prayer count, changed row count, date range, and settings revision.

- [ ] **Step 5: Run tests and commit**

Run: `npx vitest run lib/prayer-engine/generate.test.ts lib/prayer-engine/calibration.test.ts`

Expected: PASS.

```bash
git add lib/prayer-engine/generate.ts lib/prayer-engine/generate.test.ts lib/prayer-engine/calibration.ts lib/prayer-engine/calibration.test.ts
git commit -m "feat: add prayer schedule previews and calibration"
```

### Task 5: Wire settings and engine operations through the server data layer

**Files:**
- Create: `lib/data/prayer-settings.ts`
- Create: `lib/prayer-engine/server.ts`
- Create: `lib/prayer-engine/server.test.ts`
- Reuse: `lib/supabase/server.ts`
- Reuse: `lib/data/prayer-times.ts`

**Interfaces:**
- Produces:
  - `getPrayerSettings(): Promise<PrayerCalculationSettings | null>`
  - `savePrayerSettings(next): Promise<PrayerCalculationSettings>`
  - `previewScheduleExtension(today = todayIso()): Promise<PrayerSchedulePreview>`
  - `commitScheduleExtension(preview): Promise<number>`
  - `previewFutureRecalculation(startDate,endDate): Promise<PrayerScheduleDiff>`
  - `commitFutureRecalculation(preview): Promise<number>`
  - `calibrateAgainstHistoricalSchedule(startDate,endDate): Promise<CalibrationReport>`.

- [ ] **Step 1: Write failing orchestration tests**

```ts
it("preview performs no RPC write", async () => {
  const rpc = vi.fn();
  await previewScheduleExtension("2026-09-15", deps({ rpc }));
  expect(rpc).not.toHaveBeenCalled();
});

it("delay-only edits do not bump calculation revision", () => {
  const next = { ...validSettings, iqamaDelays: { ...validSettings.iqamaDelays, fajr: 5 } };
  expect(nextCalculationRevision(validSettings, next)).toBe(validSettings.calculationRevision);
});
```

- [ ] **Step 2: Implement settings mapping/revision semantics**

Centralize snake_case mapping. Increment `calculation_revision` only when coordinates, timezone, Fajr/Isha, Asr, high-latitude rule, or six calculation offsets change. Never update `applied_calculation_revision` on settings save.

- [ ] **Step 3: Implement preview/commit orchestration**

Preview calls pure modules only. Commit re-reads settings, verifies preview revision/range basis, computes `p_today = todayIso()` in Prayerapp’s canonical timezone, and calls the corresponding RPC. Invalidate prayer caches only after success.

- [ ] **Step 4: Run tests and commit**

Run: `npx vitest run lib/prayer-engine/server.test.ts`

Expected: PASS.

```bash
git add lib/data/prayer-settings.ts lib/prayer-engine/server.ts lib/prayer-engine/server.test.ts
git commit -m "feat: wire prayer engine server operations"
```

### Task 6: Add delay-derived Iqama and reviewed regression fixtures

**Files:**
- Modify: `lib/prayer-utils.ts`
- Create/Modify: `lib/__tests__/prayer-utils.test.ts`
- Create: `lib/prayer-engine/fixtures/degendorf-reference.ts`
- Create: `lib/prayer-engine/regression.test.ts`

**Interfaces:**
- Produces: `deriveIqamaInstant(prayerDate: string, prayerTime: string, delayMinutes: number): Date`.

- [ ] **Step 1: Write failing Iqama tests**

```ts
it("supports zero delay and midnight crossing", () => {
  expect(deriveIqamaInstant("2026-09-15", "18:00", 0).getTime())
    .toBe(zonedDateTime("2026-09-15", "18:00").getTime());
  expect(deriveIqamaInstant("2026-09-15", "23:58", 5).getTime())
    .toBe(zonedDateTime("2026-09-15", "23:58").getTime() + 5 * 60_000);
});
```

- [ ] **Step 2: Implement the pure helper**

```ts
export function deriveIqamaInstant(prayerDate: string, prayerTime: string, delayMinutes: number) {
  if (!Number.isInteger(delayMinutes) || delayMinutes < 0) throw new Error("Invalid Iqama delay");
  return new Date(zonedDateTime(prayerDate, prayerTime).getTime() + delayMinutes * 60_000);
}
```

Do not use legacy `PrayerTime.*Iqama` as fallback.

- [ ] **Step 3: Build reviewed regression fixtures from actual historical/reference data**

Each fixture must contain date, exact settings, six expected final `HH:MM` values, and a source description identifying the reviewed Prayerapp/reference record. Include representative winter, summer, DST-start, DST-end, solstice-adjacent, and year-boundary examples. Never invent expected religious times to make tests pass.

- [ ] **Step 4: Add fixture tests**

```ts
for (const fixture of degendorfReferenceFixtures) {
  it(`matches reviewed schedule ${fixture.date}`, () => {
    expect(calculatePrayerTimes(fixture.date, fixture.settings)).toEqual({ date: fixture.date, ...fixture.expected });
  });
}
```

Run: `npx vitest run lib/__tests__/prayer-utils.test.ts lib/prayer-engine/regression.test.ts`

Expected: PASS only after calibration/review; stop and investigate mismatches rather than changing expected times blindly.

- [ ] **Step 5: Commit**

```bash
git add lib/prayer-utils.ts lib/__tests__/prayer-utils.test.ts lib/prayer-engine/fixtures/degendorf-reference.ts lib/prayer-engine/regression.test.ts
git commit -m "test: lock prayer engine and iqama foundations"
```

### Task 7: Verify Plan 1 as an additive deliverable

**Files:**
- Review: all Task 1–6 changes.

**Interfaces:**
- Consumes: completed Plan 1 branch state.
- Produces: green Prayer Engine foundation ready for Admin/root cutover.

- [ ] **Step 1: Run focused engine tests**

Run: `npx vitest run lib/prayer-engine lib/__tests__/prayer-utils.test.ts`

Expected: PASS.

- [ ] **Step 2: Run full root verification and DB reset**

```bash
npm test
npm run lint
npx tsc --noEmit
npm run build
supabase db reset
```

Expected: all exit 0; existing prayer rows/Maghrib Program schema still exist because this plan is additive.

- [ ] **Step 3: Verify boundaries and non-mutating Preview**

```bash
git grep -n "from ['\"]adhan['\"]" -- app components lib
```

Expected: only `lib/prayer-engine/calculate.ts`. Exercise extension/recalculation Preview against local Supabase and compare prayer row count/content before/after; expected unchanged.

- [ ] **Step 4: Commit stabilization only when a verification failure required a fix**

```bash
git add -A
git commit -m "fix: stabilize prayer engine foundation"
```

Skip this commit when no correction was required.

## Exit Criteria

- `adhan@4.4.6` is exact-pinned, configured with `Other()`/`Rounding.None`, and isolated behind one adapter.
- Canonical settings constrain high-latitude/Isha/delay values and keep calculation/applied revisions distinct.
- Atomic RPCs use caller-supplied mosque-local `today`, never database `current_date`.
- Recalculation can safely initialize/update a continuous future range while preserving past rows, notes, and Maghrib Program metadata.
- Calculation/rounding/generation/diff/calibration/Iqama tests pass and reviewed fixture mismatches are investigated.
- Existing Prayerapp still builds with legacy absolute-Iqama columns temporarily present.

**Next plan:** `docs/superpowers/plans/2026-09-15-masjid-display-plan-2-admin-test-control.md`
