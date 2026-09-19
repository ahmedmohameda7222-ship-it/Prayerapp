# Masjid Display — Migration Certification

Status: PENDING FINAL CI EVIDENCE

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

Final GitHub Actions run ID and PASS/BLOCKED result are recorded after the script executes on the finalized Plan 5 implementation commit.

**LOCAL/STAGING MIGRATION DRY RUN: PENDING FINAL CI EVIDENCE**

## Real target destructive cutover

Plan 5 has not been given verified, read-only evidence proving that the real target currently contains the required validated `prayer_settings` singleton/shared delays, nor authorization to manufacture those prerequisites merely for certification.

No destructive real-target change was applied by this certification work.

**REAL TARGET DESTRUCTIVE CUTOVER: BLOCKED — production prerequisites/authorization not proven.**

To turn this row into PASS, an authorized operator must capture current real-target read-only evidence showing the singleton and five validated shared delays, approve the cutover, execute the migration through the normal release path, and record before/after counts and representative hashes/values.
