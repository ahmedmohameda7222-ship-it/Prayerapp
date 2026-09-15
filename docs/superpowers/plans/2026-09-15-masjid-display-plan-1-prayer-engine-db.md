# Masjid Display Plan 1 — Prayer Engine and Database Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the deterministic internal Prayer Time Engine, canonical `prayer_settings`, atomic schedule generation/recalculation, calibration, and shared delay-derived Iqama foundation while keeping existing Prayerapp consumers operational until Plan 2.

**Architecture:** Prayerapp stays the source of truth. Exact-pinned `adhan@4.4.6` is isolated behind one server/domain adapter; explicit settings are validated before calculation; generation previews are pure; approved writes go through transaction-safe PostgreSQL RPCs with calculation-revision checks. This plan is additive and intentionally does not drop legacy absolute-Iqama columns.

**Tech Stack:** Next.js 16.3.3, React 19.2.8, TypeScript 5, Supabase/PostgreSQL, Vitest 4.1.9, exact `adhan@4.4.6`, existing `lib/date-utils.ts` timezone helpers.

**Spec:** `docs/superpowers/specs/2026-09-15-masjid-display-design.md`

## Global Constraints

- No external prayer-time API at runtime.
- `adhan@4.4.6` is exact-pinned and may be imported only by the prayer-engine calculation adapter.
- Stored calculation parameters, not a preset name, are authoritative.
- Timezone is IANA `Europe/Berlin` initially; DST is never implemented with manual `+1/+2` offsets.
- Calculation offsets exist for Fajr, Sunrise, Dhuhr, Asr, Maghrib, and Isha.
- Final stored `HH:MM` uses ceiling: non-zero seconds round to the next minute.
- All five Iqama delays are mandatory; `0` is valid.
- Saving calculation settings never modifies live `prayer_times` automatically.
- `Extend Schedule +1 Year` never overwrites an existing date and is blocked while calculation revisions differ.
- `Recalculate Future Schedule` never changes historical dates.
- Preview/calibration paths are side-effect free; persistence is atomic.
- Do not remove legacy `*_iqama` columns in this plan.

---

### Task 1: Pin the astronomy dependency and define the import boundary

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `lib/prayer-engine/dependency-boundary.test.ts`
- Create: `lib/prayer-engine/calculate.ts`

**Interfaces:**
- Consumes: repository source tree.
- Produces: one allowed `adhan` import at `lib/prayer-engine/calculate.ts`; exact dependency `adhan@4.4.6`.

- [ ] **Step 1: Write the failing dependency-boundary test**

```ts
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

function files(root: string): string[] {
  return readdirSync(root).flatMap((name) => {
    const path = join(root, name);
    return statSync(path).isDirectory() ? files(path) : [path];
  });
}

describe("prayer engine dependency boundary", () => {
  it("imports adhan only from the calculation adapter", () => {
    const imports = ["app", "components", "lib"]
      .flatMap(files)
      .filter((path) => /\.(ts|tsx)$/.test(path))
      .filter((path) => /from ["']adhan["']/.test(readFileSync(path, "utf8")))
      .map((path) => relative(process.cwd(), path).replaceAll("\\", "/"));

    expect(imports).toEqual(["lib/prayer-engine/calculate.ts"]);
  });
});
```

- [ ] **Step 2: Run the test and verify the precondition fails**

Run: `npx vitest run lib/prayer-engine/dependency-boundary.test.ts`

Expected: FAIL because `lib/prayer-engine/calculate.ts` does not yet exist or no allowed import exists.

- [ ] **Step 3: Pin the package and create the adapter module**

Run: `npm install --save-exact adhan@4.4.6`

Create the initial adapter boundary:

```ts
import { CalculationMethod, Coordinates, Madhab, PrayerTimes } from "adhan";

export { CalculationMethod, Coordinates, Madhab, PrayerTimes };
```

- [ ] **Step 4: Verify exact dependency and boundary**

Run: `npm ls adhan && npx vitest run lib/prayer-engine/dependency-boundary.test.ts`

Expected: `adhan@4.4.6` and PASS.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json lib/prayer-engine/calculate.ts lib/prayer-engine/dependency-boundary.test.ts
git commit -m "chore: pin prayer calculation dependency"
```

### Task 2: Add canonical `prayer_settings` and atomic persistence RPCs

**Files:**
- Create: `supabase/migrations/20260915220000_masjid_display_prayer_settings.sql`
- Create: `supabase/migrations/20260915221000_prayer_schedule_atomic_generation.sql`
- Create: `lib/prayer-engine/settings-schema.test.ts`
- Create: `lib/prayer-engine/persistence-contract.test.ts`

**Interfaces:**
- Consumes: existing `public.prayer_times(date unique, fajr, sunrise, dhuhr, asr, maghrib, isha, published)`.
- Produces: singleton `public.prayer_settings`; RPCs `commit_prayer_schedule_extension(jsonb,bigint,date)` and `commit_prayer_schedule_recalculation(jsonb,bigint,date,date)`.

- [ ] **Step 1: Write failing migration-contract tests**

```ts
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const settingsSql = () => readFileSync(
  "supabase/migrations/20260915220000_masjid_display_prayer_settings.sql",
  "utf8",
);
const persistenceSql = () => readFileSync(
  "supabase/migrations/20260915221000_prayer_schedule_atomic_generation.sql",
  "utf8",
);

describe("prayer settings schema", () => {
  it("defines the singleton settings and five required delays", () => {
    const sql = settingsSql();
    for (const token of [
      "create table public.prayer_settings",
      "calculation_revision",
      "applied_calculation_revision",
      "fajr_iqama_delay_minutes",
      "dhuhr_iqama_delay_minutes",
      "asr_iqama_delay_minutes",
      "maghrib_iqama_delay_minutes",
      "isha_iqama_delay_minutes",
    ]) expect(sql.toLowerCase()).toContain(token);
  });
});

describe("prayer schedule persistence", () => {
  it("defines both privileged atomic RPCs", () => {
    const sql = persistenceSql().toLowerCase();
    expect(sql).toContain("commit_prayer_schedule_extension");
    expect(sql).toContain("commit_prayer_schedule_recalculation");
    expect(sql).toContain("revoke execute");
  });
});
```

- [ ] **Step 2: Run tests and verify they fail**

Run: `npx vitest run lib/prayer-engine/settings-schema.test.ts lib/prayer-engine/persistence-contract.test.ts`

Expected: FAIL because both migrations are missing.

- [ ] **Step 3: Create the singleton settings migration**

Use this schema shape and constraints:

```sql
create table public.prayer_settings (
  id text primary key check (id = '1'),
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  timezone text not null,
  fajr_angle numeric not null check (fajr_angle > 0 and fajr_angle <= 30),
  isha_rule text not null check (isha_rule in ('angle','fixed_minutes')),
  isha_angle numeric,
  isha_minutes_after_maghrib integer,
  asr_shadow_factor integer not null check (asr_shadow_factor in (1,2)),
  high_latitude_rule text not null,
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
  calculation_revision bigint not null default 1,
  applied_calculation_revision bigint not null default 0,
  updated_at timestamptz not null default now(),
  check (
    (isha_rule = 'angle' and isha_angle is not null and isha_minutes_after_maghrib is null)
    or
    (isha_rule = 'fixed_minutes' and isha_angle is null and isha_minutes_after_maghrib between 0 and 240)
  )
);

alter table public.prayer_settings enable row level security;
```

Do not insert invented calculation values.

- [ ] **Step 4: Create the RPC migration with transaction-safe guards**

The extension function must lock settings and reject revision/date races before inserting JSON rows:

```sql
create or replace function public.commit_prayer_schedule_extension(
  p_rows jsonb,
  p_expected_revision bigint,
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
  select * into v_settings from public.prayer_settings where id = '1' for update;
  if v_settings.calculation_revision <> p_expected_revision
     or v_settings.applied_calculation_revision <> p_expected_revision then
    raise exception 'calculation revision mismatch';
  end if;

  select d::date into v_first_missing
  from generate_series(current_date, current_date + interval '10 years', interval '1 day') d
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

Implement recalculation with the same locked revision check, explicit `p_start_date/p_end_date`, rejection of dates before `current_date`, full-range updates in one function call, then set `applied_calculation_revision = calculation_revision` only after all updates succeed. Revoke public execution:

```sql
revoke execute on function public.commit_prayer_schedule_extension(jsonb,bigint,date) from public, anon, authenticated;
revoke execute on function public.commit_prayer_schedule_recalculation(jsonb,bigint,date,date) from public, anon, authenticated;
```

- [ ] **Step 5: Run migration tests and local database reset**

Run: `npx vitest run lib/prayer-engine/settings-schema.test.ts lib/prayer-engine/persistence-contract.test.ts && supabase db reset`

Expected: PASS; local database rebuilds from all migrations.

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/20260915220000_masjid_display_prayer_settings.sql supabase/migrations/20260915221000_prayer_schedule_atomic_generation.sql lib/prayer-engine/settings-schema.test.ts lib/prayer-engine/persistence-contract.test.ts
git commit -m "feat: add prayer engine persistence foundation"
```

### Task 3: Define settings types, validation, calculation, and rounding

**Files:**
- Create: `lib/prayer-engine/types.ts`
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
  - `ceilInstantToLocalMinute(date: Date, timeZone: string): string`.

- [ ] **Step 1: Write failing validation and rounding tests**

```ts
import { describe, expect, it } from "vitest";
import { ceilInstantToLocalMinute } from "./rounding";
import { validatePrayerCalculationSettings } from "./validate-settings";

const valid = {
  latitude: 48.84,
  longitude: 12.96,
  timezone: "Europe/Berlin",
  fajrAngle: 18,
  ishaRule: "angle" as const,
  ishaAngle: 17,
  ishaMinutesAfterMaghrib: null,
  asrShadowFactor: 1 as const,
  highLatitudeRule: "seventh_of_night",
  offsets: { fajr: 0, sunrise: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 },
  iqamaDelays: { fajr: 0, dhuhr: 10, asr: 10, maghrib: 5, isha: 10 },
  calculationRevision: 1,
  appliedCalculationRevision: 1,
};

describe("settings validation", () => {
  it("accepts zero Iqama delay", () => expect(validatePrayerCalculationSettings(valid).iqamaDelays.fajr).toBe(0));
  it("rejects invalid timezone", () => expect(() => validatePrayerCalculationSettings({ ...valid, timezone: "Mars/Olympus" })).toThrow());
  it("rejects both Isha modes at once", () => expect(() => validatePrayerCalculationSettings({ ...valid, ishaMinutesAfterMaghrib: 90 })).toThrow());
});

describe("minute ceiling", () => {
  it.each([
    ["2026-01-15T15:42:00.000Z", "16:42"],
    ["2026-01-15T15:42:01.000Z", "16:43"],
    ["2026-01-15T15:42:59.000Z", "16:43"],
  ])("ceil %s", (instant, expected) => {
    expect(ceilInstantToLocalMinute(new Date(instant), "Europe/Berlin")).toBe(expected);
  });
});
```

- [ ] **Step 2: Run tests and verify failure**

Run: `npx vitest run lib/prayer-engine/validate-settings.test.ts lib/prayer-engine/rounding.test.ts`

Expected: FAIL with missing modules/functions.

- [ ] **Step 3: Define the exact domain types**

```ts
export type PrayerKey = "fajr" | "sunrise" | "dhuhr" | "asr" | "maghrib" | "isha";
export type ObligatoryPrayerKey = Exclude<PrayerKey, "sunrise">;
export type IshaRule = "angle" | "fixed_minutes";

export type PrayerIqamaDelays = Record<ObligatoryPrayerKey, number>;
export type PrayerOffsets = Record<PrayerKey, number>;

export interface PrayerCalculationSettings {
  latitude: number;
  longitude: number;
  timezone: string;
  fajrAngle: number;
  ishaRule: IshaRule;
  ishaAngle: number | null;
  ishaMinutesAfterMaghrib: number | null;
  asrShadowFactor: 1 | 2;
  highLatitudeRule: string;
  offsets: PrayerOffsets;
  iqamaDelays: PrayerIqamaDelays;
  calculationRevision: number;
  appliedCalculationRevision: number;
}

export interface PrayerCalculationResult extends Record<PrayerKey, string> {
  date: string;
}
```

- [ ] **Step 4: Implement validation and ceiling**

Validation must check finite numeric ranges, required five delays `0..180`, offsets `-60..60`, Isha-mode exclusivity, and timezone validity with:

```ts
new Intl.DateTimeFormat("en-US", { timeZone: value.timezone }).format(new Date());
```

Implement ceiling by adding `60_000 - millisecondsIntoMinute` only when seconds/milliseconds are non-zero, then format with `Intl.DateTimeFormat(..., { timeZone, hourCycle: "h23", hour: "2-digit", minute: "2-digit" })`.

- [ ] **Step 5: Write calculation tests before implementing the adapter**

```ts
import { describe, expect, it } from "vitest";
import { calculatePrayerTimes } from "./calculate";
import { validSettings } from "./test-settings";

describe("calculatePrayerTimes", () => {
  it("is deterministic for a winter date", () => {
    expect(calculatePrayerTimes("2026-01-15", validSettings))
      .toEqual(calculatePrayerTimes("2026-01-15", validSettings));
  });
  it("returns six HH:MM values", () => {
    const result = calculatePrayerTimes("2026-07-15", validSettings);
    for (const key of ["fajr","sunrise","dhuhr","asr","maghrib","isha"] as const) {
      expect(result[key]).toMatch(/^([01]\d|2[0-3]):[0-5]\d$/);
    }
  });
});
```

Run: `npx vitest run lib/prayer-engine/calculate.test.ts`

Expected: FAIL until `calculatePrayerTimes` is implemented.

- [ ] **Step 6: Implement the adapter**

Map explicit settings onto Adhan parameters, then apply minute offsets to returned `Date` instants and call the final ceiling helper. For fixed-minute Isha, derive Isha from the final raw Maghrib instant plus configured minutes before applying the Isha calculation offset. Map `asrShadowFactor` to `Madhab.Shafi` for `1` and `Madhab.Hanafi` for `2`. Keep high-latitude mapping in one switch that throws on unsupported stored values.

- [ ] **Step 7: Run all Task 3 tests and boundary test**

Run: `npx vitest run lib/prayer-engine/validate-settings.test.ts lib/prayer-engine/rounding.test.ts lib/prayer-engine/calculate.test.ts lib/prayer-engine/dependency-boundary.test.ts`

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add lib/prayer-engine
git commit -m "feat: implement deterministic prayer calculation"
```

### Task 4: Implement extension generation, recalculation diff, and calibration

**Files:**
- Create: `lib/prayer-engine/generate.ts`
- Create: `lib/prayer-engine/generate.test.ts`
- Create: `lib/prayer-engine/calibration.ts`
- Create: `lib/prayer-engine/calibration.test.ts`

**Interfaces:**
- Consumes: existing schedule dates/rows + calculation settings.
- Produces:
  - `buildExtensionPreview(existingDates: string[], today: string, settings: PrayerCalculationSettings): PrayerSchedulePreview`
  - `buildRecalculationPreview(existing: PrayerTime[], startDate: string, endDate: string, settings: PrayerCalculationSettings): PrayerScheduleDiff`
  - `calibrateSchedule(existing: PrayerTime[], settings: PrayerCalculationSettings): CalibrationReport`.

- [ ] **Step 1: Write failing gap-generation tests**

```ts
it("starts at the first internal missing date", () => {
  const preview = buildExtensionPreview(
    ["2026-09-15", "2026-09-16", "2026-09-18"],
    "2026-09-15",
    settings,
  );
  expect(preview.startDate).toBe("2026-09-17");
  expect(preview.rows.some((row) => row.date === "2026-09-18")).toBe(false);
});

it("produces one calendar year from the resolved gap", () => {
  const preview = buildExtensionPreview([], "2028-02-29", settings);
  expect(preview.startDate).toBe("2028-02-29");
  expect(preview.endDate).toBe("2029-02-28");
});
```

Run: `npx vitest run lib/prayer-engine/generate.test.ts`

Expected: FAIL.

- [ ] **Step 2: Implement pure generation**

Resolve the first missing ISO date from `today`, generate dates through the day before the same calendar date one year later, omit any existing date defensively, and call `calculatePrayerTimes` for each emitted row. Do not import Supabase in this module.

- [ ] **Step 3: Write failing calibration/diff tests**

```ts
it("flags an unexplained delta above one minute", () => {
  const report = calibrateRows(
    { date: "2026-01-15", fajr: "06:00", sunrise: "08:00", dhuhr: "12:15", asr: "14:30", maghrib: "16:45", isha: "18:15" },
    { date: "2026-01-15", fajr: "06:02", sunrise: "08:00", dhuhr: "12:15", asr: "14:30", maghrib: "16:45", isha: "18:15" },
    "Europe/Berlin",
  );
  expect(report.fajr.deltaMinutes).toBe(2);
  expect(report.fajr.requiresInvestigation).toBe(true);
});
```

Run: `npx vitest run lib/prayer-engine/calibration.test.ts`

Expected: FAIL.

- [ ] **Step 4: Implement calibration with local scheduled instants**

Use `zonedDateTime(date, hhmm)` for both stored and generated values, compute signed minute deltas, and mark `Math.abs(deltaMinutes) > 1`. Recalculation diff returns old/new six times per changed date and aggregate changed row/prayer counts.

- [ ] **Step 5: Run tests**

Run: `npx vitest run lib/prayer-engine/generate.test.ts lib/prayer-engine/calibration.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add lib/prayer-engine/generate.ts lib/prayer-engine/generate.test.ts lib/prayer-engine/calibration.ts lib/prayer-engine/calibration.test.ts
git commit -m "feat: add prayer schedule previews and calibration"
```

### Task 5: Add server-side settings and engine orchestration

**Files:**
- Create: `lib/data/prayer-settings.ts`
- Create: `lib/prayer-engine/server.ts`
- Create: `lib/prayer-engine/server.test.ts`
- Reuse: `lib/supabase/server.ts`
- Reuse: `lib/data/prayer-times.ts`

**Interfaces:**
- Consumes: data-layer Supabase client, pure calculation/generation/calibration modules.
- Produces:
  - `getPrayerSettings(): Promise<PrayerCalculationSettings | null>`
  - `savePrayerSettings(next: PrayerCalculationSettings): Promise<PrayerCalculationSettings>`
  - `previewScheduleExtension(today?: string): Promise<PrayerSchedulePreview>`
  - `commitScheduleExtension(preview: PrayerSchedulePreview): Promise<number>`
  - `previewFutureRecalculation(startDate: string, endDate: string): Promise<PrayerScheduleDiff>`
  - `commitFutureRecalculation(preview: PrayerScheduleDiff): Promise<number>`
  - `calibrateAgainstHistoricalSchedule(startDate: string, endDate: string): Promise<CalibrationReport>`.

- [ ] **Step 1: Write failing orchestration tests with mocked data functions**

```ts
it("does not persist during extension preview", async () => {
  const rpc = vi.fn();
  const preview = await previewScheduleExtension("2026-09-15", deps({ rpc }));
  expect(preview.rows.length).toBeGreaterThan(300);
  expect(rpc).not.toHaveBeenCalled();
});

it("does not increment calculation revision for delay-only edits", async () => {
  const current = settings;
  const next = { ...settings, iqamaDelays: { ...settings.iqamaDelays, fajr: 5 } };
  expect(nextCalculationRevision(current, next)).toBe(current.calculationRevision);
});
```

Run: `npx vitest run lib/prayer-engine/server.test.ts`

Expected: FAIL.

- [ ] **Step 2: Implement settings mapping and revision semantics**

Map snake_case database fields centrally. Compare only coordinates, timezone, Fajr/Isha/Asr/high-latitude values, and six offsets to decide whether to increment `calculation_revision`; delay-only changes leave it unchanged. Never set `applied_calculation_revision` on save.

- [ ] **Step 3: Implement orchestration**

Preview reads current settings/schedule and calls pure functions only. Commit re-reads settings, verifies preview revision/date basis, then calls the corresponding RPC via the server Supabase client. Cache invalidation happens only after RPC success.

- [ ] **Step 4: Run tests**

Run: `npx vitest run lib/prayer-engine/server.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/data/prayer-settings.ts lib/prayer-engine/server.ts lib/prayer-engine/server.test.ts
git commit -m "feat: wire prayer engine server operations"
```

### Task 6: Add delay-derived Iqama helper and reviewed regression fixtures

**Files:**
- Modify: `lib/prayer-utils.ts`
- Modify/Create: `lib/__tests__/prayer-utils.test.ts`
- Create: `lib/prayer-engine/fixtures/degendorf-reference.ts`
- Create: `lib/prayer-engine/regression.test.ts`

**Interfaces:**
- Consumes: `date`, stored prayer `HH:MM`, mandatory delay minutes.
- Produces: `deriveIqamaInstant(prayerDate: string, prayerTime: string, delayMinutes: number): Date`.

- [ ] **Step 1: Write the failing Iqama helper test**

```ts
it.each([
  [0, "2026-09-15T18:00:00"],
  [1, "2026-09-15T18:01:00"],
  [10, "2026-09-15T18:10:00"],
])("derives iqama with %i minute delay", (delay, expectedLocalPrefix) => {
  const instant = deriveIqamaInstant("2026-09-15", "18:00", delay);
  expect(formatInAppTimeZone(instant)).toContain(expectedLocalPrefix.slice(11));
});
```

Also add a `23:58 + 5` crossing-midnight case.

Run: `npx vitest run lib/__tests__/prayer-utils.test.ts`

Expected: FAIL.

- [ ] **Step 2: Implement `deriveIqamaInstant`**

```ts
export function deriveIqamaInstant(prayerDate: string, prayerTime: string, delayMinutes: number) {
  if (!Number.isInteger(delayMinutes) || delayMinutes < 0) throw new Error("Invalid Iqama delay");
  return new Date(zonedDateTime(prayerDate, prayerTime).getTime() + delayMinutes * 60_000);
}
```

Do not call or fall back to legacy absolute `*Iqama` fields.

- [ ] **Step 3: Add reviewed regression fixtures**

Create fixture entries only after reviewing actual historical Prayerapp/reference values. Each entry must contain date, exact explicit calculation settings, six expected `HH:MM` values, and a `source` string identifying the reviewed source. Do not fabricate expected times.

- [ ] **Step 4: Write and run the fixture regression test**

```ts
for (const fixture of degendorfReferenceFixtures) {
  it(`matches reviewed schedule ${fixture.date}`, () => {
    expect(calculatePrayerTimes(fixture.date, fixture.settings)).toEqual({
      date: fixture.date,
      ...fixture.expected,
    });
  });
}
```

Run: `npx vitest run lib/prayer-engine/regression.test.ts lib/__tests__/prayer-utils.test.ts`

Expected: PASS after reviewed fixtures/settings are calibrated; if not, stop and investigate rather than changing expectations blindly.

- [ ] **Step 5: Commit**

```bash
git add lib/prayer-utils.ts lib/__tests__/prayer-utils.test.ts lib/prayer-engine/fixtures/degendorf-reference.ts lib/prayer-engine/regression.test.ts
git commit -m "test: lock prayer engine and iqama foundations"
```

### Task 7: Verify Plan 1 as an additive deliverable

**Files:**
- Review: all files changed by Tasks 1–6.

**Interfaces:**
- Consumes: complete Plan 1 branch state.
- Produces: green additive Prayer Engine foundation ready for Plan 2.

- [ ] **Step 1: Run focused engine tests**

Run: `npx vitest run lib/prayer-engine lib/__tests__/prayer-utils.test.ts`

Expected: PASS.

- [ ] **Step 2: Run full root verification**

Run:

```bash
npm test
npm run lint
npx tsc --noEmit
npm run build
supabase db reset
```

Expected: all commands exit 0.

- [ ] **Step 3: Verify architecture boundaries**

Run:

```bash
git grep -n "from ['\"]adhan['\"]" -- app components lib
git grep -nE "latitude|fajr_angle|isha_angle" -- app/api || true
```

Expected: only `lib/prayer-engine/calculate.ts` imports `adhan`; no new public API exposes calculation internals.

- [ ] **Step 4: Verify Preview is non-mutating**

Run the extension/recalculation Preview test paths against local Supabase and compare `select count(*) from prayer_times` before/after. Expected: unchanged count/content.

- [ ] **Step 5: Commit any verification correction only after rerunning the failed gate**

```bash
git add -A
git commit -m "fix: stabilize prayer engine foundation"
```

Skip this commit if no correction was required.

## Exit Criteria

- Exact-pinned astronomy dependency is isolated behind one adapter.
- Canonical settings/revision schema and atomic RPCs exist.
- Calculation, rounding, generation, diff, calibration, and Iqama helper tests are green.
- Historical fixture mismatches greater than one minute are investigated rather than normalized away.
- Existing Prayerapp still builds with legacy absolute-Iqama columns temporarily present.

**Next plan:** `docs/superpowers/plans/2026-09-15-masjid-display-plan-2-admin-test-control.md`
