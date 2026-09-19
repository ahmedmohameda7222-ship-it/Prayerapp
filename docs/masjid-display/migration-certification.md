# Masjid Display — Migration Certification

Status: PASS FOR LOCAL/STAGING DRY RUN — REAL TARGET CUTOVER BLOCKED

## Scope separation

This document distinguishes a rollback-only local/staging certification exercise from any real-target destructive cutover. A passing local exercise does **not** authorize production mutation.

## Local/staging migration dry run

Executable certification: `scripts/verify-masjid-display-migration.sh`.

The script runs only against the local Supabase Docker database used by CI and wraps the successful cutover exercise in a transaction that is rolled back. It performs two independent checks.

First, it reconstructs populated legacy absolute-Iqama columns without a configured `prayer_settings` singleton and confirms that `20260915223000_remove_absolute_iqama_columns.sql` refuses the destructive cutover.

Second, with validated shared delays present, it records BEFORE evidence and applies the same migration inside a rollback-only transaction. It verifies AFTER evidence for:

- representative historical and future `prayer_times` rows;
- all six daily prayer values (Fajr, Sunrise, Dhuhr, Asr, Maghrib, Isha);
- representative schedule hashes;
- Jumuah row/count/hash;
- Maghrib Program enabled/title/duration/combined-Isha fields;
- the five canonical shared Iqama delays;
- removal of the five legacy absolute-Iqama columns only after the approved gate.

Actual GitHub Actions evidence on strengthened implementation HEAD `86ce2380f35651a0ebe23d5db0fab072069e0e3c`:

- Root CI run `35421280923`: SUCCESS.
- Step `Certify Masjid Display legacy-Iqama migration safety`: SUCCESS.
- Gate probe: destructive removal was rejected when validated shared delays were absent.
- BEFORE prayer row count: `2`.
- BEFORE/AFTER representative prayer schedule hash: `f9f16a6cab070324c14e95d0feeaf4e6`.
- BEFORE/AFTER Jumuah count: `1`.
- BEFORE/AFTER Jumuah hash: `9cc14930e312b5952309d02eda89768c`.
- BEFORE/AFTER canonical shared delays: `11,12,13,14,15`.
- AFTER legacy absolute-Iqama columns: `0`.
- The successful exercise was rollback-only.

GitHub Codex Plan 5 review found four migration-certification integrity gaps.

1. The first version compared Jumuah rows through an inner join, which could miss deletion. The script now asserts the certified Jumuah row count and uses a `NOT EXISTS` anti-join. RED: root CI `35413351843`. GREEN: root CI `35413523120`.
2. The prayer-row preservation check used an inner join by date, which could miss deletion/date mutation. It was changed to a `NOT EXISTS` anti-join. RED: root CI `35414872550`. GREEN: root CI `35415341665`.
3. The strengthened prayer-row snapshot still omitted the row UUID, so delete/reinsert under the same date and values could masquerade as preservation. `plan5_before_prayer` now snapshots `id`, and the anti-join requires original UUID + date + identical represented-value hash. RED: root CI `35417740571`. GREEN: root CI `35418592166`.
4. The preservation hash still omitted `note` and localized note columns. The certification fixtures now use distinct values for `note_ar`, `note_en`, `note_de`, and `note_tr`, and the BEFORE/AFTER hash includes all five note fields. RED: Plan 3 `35421192534` failed the new note-preservation guard while 68 other focused tests passed. GREEN: root CI `35421280923`, including the rollback-only migration certification.

Deletion, replacement under a new UUID, date mutation, represented-value drift, or note/localized-note corruption in either the certified prayer rows or Jumuah row now blocks PASS.

**LOCAL/STAGING MIGRATION DRY RUN: PASS**

## Real target destructive cutover

Authorized read-only inspection of the Prayerapp Supabase target identified the current real-target state:

- `prayer_times`: 81 rows;
- `jumuah_times`: 3 rows;
- legacy absolute-Iqama columns present: all 5;
- `public.prayer_settings`: not present;
- latest applied repository migration visible on target: `20260902223939_admin_audit_hardening`.

Therefore the destructive cutover prerequisite is not satisfied. No schema or production-data mutation was performed by Plan 5.

**REAL TARGET DESTRUCTIVE CUTOVER: BLOCKED — `prayer_settings`/validated shared-delay prerequisite absent on the real target and destructive execution not authorized.**

To turn this row into PASS, an authorized operator must capture current real-target read-only evidence showing the singleton and five validated shared delays, approve the cutover, execute the migration through the normal release path, and record before/after counts and representative hashes/values.
