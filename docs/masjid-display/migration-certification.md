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

Actual GitHub Actions evidence on strengthened implementation HEAD `dbd2145a60dd866a7c55a88e6762ce26ccadf6b9`:

- Root CI run `35415341665`: SUCCESS.
- Step `Certify Masjid Display legacy-Iqama migration safety`: SUCCESS.
- Gate probe: destructive removal was rejected when validated shared delays were absent.
- BEFORE prayer row count: `2`.
- BEFORE/AFTER representative prayer schedule hash: `72f7c4f396bc2aed735f5e2a363d5090`.
- BEFORE/AFTER Jumuah count: `1`.
- BEFORE/AFTER Jumuah hash: `9cc14930e312b5952309d02eda89768c`.
- BEFORE/AFTER canonical shared delays: `11,12,13,14,15`.
- AFTER legacy absolute-Iqama columns: `0`.
- The successful exercise was rollback-only.

GitHub Codex Plan 5 review found two migration-certification integrity gaps across its first two rounds.

1. The first version compared Jumuah rows through an inner join, which could miss deletion. The script now asserts the certified Jumuah row count and uses a `NOT EXISTS` anti-join. RED: root CI `35413351843`. GREEN: root CI `35413523120`.
2. The prayer-row preservation check also used an inner join by date, which could miss a date/identity mutation. Every certified `plan5_before_prayer` row is now checked through a `NOT EXISTS` anti-join requiring the original date and identical six-prayer/Maghrib-program hash. RED: root CI `35414872550` failed only this new integrity guard with 831 tests passing. GREEN: root CI `35415341665` passed the strengthened migration certification.

Deletion, date mutation, replacement, or represented value drift in either the certified prayer rows or Jumuah row now blocks PASS.

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
