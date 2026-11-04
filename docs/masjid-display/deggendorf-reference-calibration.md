# Deggendorf prayer timetable reference calibration

Status: **candidate; not approved or applied to production**.

## Evidence

Reference: user-supplied screenshot, Deggendorf, from 2026-10-12 to
2026-11-09 (27 fully legible daily rows, omitting obscured rows).
**The five prayer times are the calibration target:** Fajr, Dhuhr, Asr,
Maghrib (Iftar in the image), and Isha. Sunrise is checked as an
astronomical helper, not an obligatory prayer. Sahur Ends/Imsak is not
used to calibrate the regular five-prayer schedule.

- Columns: Sahur Ends, Fajr, Sunrise, Zuhr, Asr, Iftar, Isha.
- **Sahur Ends** is a separate Ramadan feature. It is not mapped to Fajr,
  is not used as a test input, and does not cause a 20-minute shift.
- **Iftar** is compared to canonical `maghrib`.
- The 2026-10-25 Europe/Berlin DST transition is included.
- A reference example (2026-11-03) is Fajr 05:19, Sunrise 06:54,
  Dhuhr 11:59, Asr 14:24, Maghrib 16:53, Isha 18:32.
- All 27 expected daily rows (without Sahur data) exist **only** in
  `lib/prayer-engine/deggendorf-reference-profile.test.ts`. They must
  never be copied to production DB by seed/import/migration.

## Inferred astronomical settings (candidate)

`lib/prayer-engine/deggendorf-reference-profile.ts` exports the explicit,
date-independent settings:

| Input | Value |
| --- | --- |
| Latitude | 48.833 |
| Longitude | 12.967 |
| Timezone | Europe/Berlin |
| Fajr twilight angle | 19.2° (empirical displayed-Fajr fit) |
| Isha twilight angle | 17° |
| Optional Maghrib depression angle | 1.33° |
| Asr shadow factor | 1 |
| High-latitude rule | Twilight angle (night-fraction safety cap) |
| Prayer offsets in minutes | Fajr +15.15833; Sunrise -4.18333; Dhuhr +6.51667; Asr +5.86667; Maghrib +3.99167; Isha +5.23333 |


The production database previously stored six minute offsets as integers and
had no independent Maghrib solar-angle field. The migration
`20261103220000_prayer_engine_fractional_offsets_maghrib_angle.sql`
converts these existing integer offsets into `numeric(9,5)` without changing
their values, and adds a Maghrib angle with a zero-degree backward-compatible
default. **It contains no seeded prayer days and is not applied to production
by creating this PR.** Angular settings and sub-minute minute offsets are
persisted as operator-controlled calculation parameters, not date overrides.

Exact matches against 27 photographed autumn dates establish only a fit on
that sample. They do **not** demonstrate the reference provider's hidden
method, ritual approval, or a full-year exact match. Even with seasonal
continuity checks, the computed times must be reviewed independently in winter
and summer before the profile is used for a mosque timetable.

The candidate was initially estimated from the photograph and an astronomical
cross-check, then calibrated against output of the exact pinned Adhan engine.
The Fajr angle is an empirical fit to the screenshot's displayed Fajr, **not**
a claim about its source's true astronomical dawn angle or religious method.
The photographed app's **actual internal algorithm and source authority are
not known**. Even when the numerical test passes, it does not
prove the source's original method or religious authorization.

Engine: existing pinned `adhan@4.4.6`, `CalculationMethod.Other()`,
`Rounding.None`, minute offsets before Prayerapp's final ceiling to local
HH:MM. The twilight-angle high-latitude rule is required to prevent Isha from
crossing the local midnight boundary in short summer nights, as detected
by the full-year regression test. No per-date special cases, no manual DST
hour changes, no external
API calls at runtime.

## Verification

`npx vitest run lib/prayer-engine/deggendorf-reference-profile.test.ts`
compares the five prayer times plus the supplementary Sunrise value with the
photographed reference for all 27 dates, with a calibration tolerance of
**exact HH:mm equality (zero-minute tolerance)**. Verification MUST run against the pinned actual Adhan
engine; a separate approximation cannot establish a passing result.

Use `.github/workflows/prayer-reference-calibration.yml` for an independent
GitHub Actions check if the repository's general CI gets blocked at an earlier
dependency-audit stage.

## Operator / deployment boundary

The Admin prayer-engine page includes **Load Deggendorf reference calculation
(review only)**. It loads calculation parameters into the form; it does **not**
save settings, overwrite mosque schedules, or modify shared Iqama delays.

If independent tests pass and a mosque operator approves the reference
methodology:

1. Review/change coordinates, all calculation values, and five existing Iqama
   delays. Save the `prayer_settings` profile through the authorized Admin.
2. Use **Preview Recalculation** for an explicitly chosen future date range;
   review the full generated prayer-time diff.
3. Use the separate authorized **Commit Recalculation** action. It checks
   calculation revision, source changes, and mosque-local future date boundary
   and writes through the existing atomic RPC.
4. When the profile is applied and synchronized, future yearly extensions are
   generated by the same engine. Do not write the screenshot rows to Supabase.
5. Independently validate dates outside the October–November sample, including
   winter/summer solstice, DST start, and whole-year behavior before broad
   production approval.

The GitHub feature branch / PR by itself does not update production, and a
passing screenshot test does not approve the underlying religious methodology.
