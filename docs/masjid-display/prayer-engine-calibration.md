# Masjid Display — Prayer Engine Calibration Evidence

Status: BLOCKED

## Release gate

Production Prayer Engine approval requires a reviewed explicit calculation profile and reviewed Prayerapp timetable reference fixtures with no unexplained absolute difference greater than **1 minute** for any of Fajr, Sunrise, Dhuhr, Asr, Maghrib, or Isha.

The production gate in code remains:

`PRODUCTION_PRAYER_PROFILE_APPROVED = false`

No Plan 5 work changes that value.

## Calculation implementation under review

- Library: `adhan@4.4.6`.
- Adapter: `lib/prayer-engine/calculate.ts`.
- Final rounding: ceiling to the next local minute after calculation offset application.
- Timezone authority: IANA timezone behavior through `Intl.DateTimeFormat`; no manual CET/CEST patch is part of the adapter.
- Authoritative religious reference: the **existing published Prayerapp timetable**, not a library preset and not a newly invented timetable.

## Historical calibration evidence available to Plan 5

Earlier approved-plan investigation established that the existing published Prayerapp timetable could **not** be reproduced within the approved unexplained ±1-minute tolerance using the searched explicit Adhan-profile plus constant-offset model.

The following residual maxima were recorded approximately in that prior evidence:

| Prayer/value | Previously observed maximum residual | Gate interpretation |
| --- | ---: | --- |
| Maghrib | ~1 minute | Within threshold on the observed comparison |
| Asr, shadow factor 1 | ~1 minute | Within threshold on the observed comparison |
| Sunrise | ~2 minutes | BLOCKING |
| Dhuhr | ~2 minutes | BLOCKING |
| Fajr | ~5 minutes | BLOCKING |
| Isha | ~6+ minutes | BLOCKING |

These values are **historical evidence**, not a fresh Plan 5 re-execution. Plan 5 did not relabel them as newly measured.

## Exact rows/date coverage

Authorized read-only inspection of the current Prayerapp production timetable found:

- total `prayer_times` rows: **81**;
- total date range: **2026-08-12 through 2026-10-31**;
- published rows: **70**;
- published date range: **2026-08-23 through 2026-10-31**;
- published dates are contiguous across that range;
- published six-prayer reference hash: `1725481dd6c98c4017c42fec4e42bb22`;
- all-row six-prayer reference hash: `f93721141e2e6af24c6c98879853d8c4`.

This is fresh reference-data evidence, **not** a fresh Adhan-profile residual computation. The available published range includes the 2026 DST-end transition on October 25 but does not constitute the required reviewed seasonal production fixture matrix.

Required coverage still missing as an approved fixture set:

- representative winter dates;
- representative summer dates;
- DST start;
- DST end;
- dates near both solstices;
- year transition;
- leap-year coverage where applicable;
- reviewed known historical timetable rows.

## Exact candidate settings

The prior evidence establishes that an explicit Adhan-profile + constant-offset search occurred, but the **exact complete candidate parameter list is not retained in the accessible repository/PR evidence for Plan 5**. Plan 5 therefore does not reconstruct, infer, or invent those settings and does not call any preset (including Diyanet or MWL) approved.

Synthetic settings used by unit/certification tests are explicitly test-only and are not candidate production settings.

## Plan 5 automated calendar harness

`lib/prayer-engine/calendar-certification.test.ts` certifies only implementation invariants that do not require invented religious expected values:

- deterministic adapter output;
- final ceiling behavior;
- configured offset ordering;
- IANA Europe/Berlin DST mechanics;
- absence of manual CET/CEST patching;
- explicit preservation of the production-approval blocker.

`lib/prayer-engine/regression.test.ts` intentionally remains without fabricated production timetable fixtures.

## Result

**Prayer Engine production calendar certification: BLOCKED — approved calibrated profile unavailable.**

**Production calibration: BLOCKED.**

To turn this gate into PASS, a qualified reviewer/operator must provide or approve an authoritative fixture set from the existing published Prayerapp timetable covering the required calendar periods, the exact calculation settings under review must be recorded, and a fresh comparison must show no unexplained absolute difference greater than one minute for every reviewed prayer value.
