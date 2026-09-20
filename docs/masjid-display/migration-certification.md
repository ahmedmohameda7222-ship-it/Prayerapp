# Masjid Display — Migration Certification

Status: PASS FOR LOCAL/STAGING FULL-CHAIN CERTIFICATION — REAL TARGET CUTOVER BLOCKED

## Scope separation

This document distinguishes a disposable local/staging certification exercise from any real-target destructive cutover. A passing local exercise does **not** authorize production mutation.

## Reviewed starting point

Executable certification: `scripts/verify-masjid-display-migration.sh`.

The certification reconstructs the reviewed pre-cutover state rather than fabricating legacy columns on the final schema. It exercises the **full pending migration chain** from:

- reviewed cutoff migration: `20260902223939_admin_audit_hardening`;
- production-like fixture: `supabase/tests/fixtures/plan5-precutover-production-like.sql`;
- fixture source: authorized read-only evidence from the Prayerapp target;
- prayer rows: **81**, preserving original UUIDs and retained public fields;
- Jumuah rows: **3**, preserving original UUIDs and base/localized retained fields.

The local Supabase database is disposable. The successful full-chain exercise is **not** wrapped in a rollback transaction: the script resets the local database back to the reviewed cutoff, loads the fixture, applies the pending migrations, verifies the resulting final schema/data, and leaves that local database at the migrated state.

## Gate probe

The script first resets to the reviewed cutoff, loads the same 81/3 fixture, applies the first three pending Plan 5 migrations, and then attempts `20260915223000_remove_absolute_iqama_columns.sql` without validated shared delays.

Expected and observed result:

`PLAN5_GATE_RESULT=PASS destructive legacy-Iqama cutover rejected without validated shared delays`

This proves the destructive migration refuses populated legacy Iqama data when the required shared-delay prerequisite has not been supplied.

## Full pending migration chain

After the gate probe, the script resets again to the same reviewed cutoff/fixture, captures BEFORE evidence, and applies these nine pending migrations in repository order:

1. `20260915220000_masjid_display_prayer_settings.sql`
2. `20260915221000_prayer_schedule_atomic_generation.sql`
3. `20260915222000_masjid_display_admin_schema.sql`
4. `20260915223000_remove_absolute_iqama_columns.sql`
5. `20260917041000_masjid_display_feed_revision.sql`
6. `20260917233500_masjid_display_bounded_generated_at.sql`
7. `20260918001500_masjid_display_semantic_source_timestamps.sql`
8. `20260918015000_masjid_display_snapshot_window_readers.sql`
9. `20260919023000_masjid_display_feed_bounds.sql`

For this **local certification exercise only**, after the prayer-settings schema exists, the script supplies explicit canonical shared delays:

`20,15,15,5,10`

That local prerequisite permits the gated destructive migration to be exercised. It is not evidence that the real production target currently has those settings.

## Preserved data certified

The BEFORE/AFTER hashes include the retained prayer/Jumuah identities and values, including:

- prayer row UUID and date;
- Fajr, Sunrise, Dhuhr, Asr, Maghrib, Isha;
- `note`, `note_ar`, `note_en`, `note_de`, `note_tr`;
- publication/update metadata represented by the certification hash;
- Maghrib Program enabled/title/duration/combined-Isha fields;
- Jumuah UUID/date/khutbah/prayer/location/khateeb;
- Jumuah base + Arabic/English/German/Turkish language fields;
- Jumuah base + Arabic/English/German/Turkish notes;
- canonical shared delays;
- absence of legacy absolute-Iqama columns after the gated cutover.

## Actual GitHub Actions evidence

Implementation/evidence HEAD:

`3f6f3b440d15130a230fcb4c7b536efad12f5f9f`

Root CI:

`35521914361` — SUCCESS.

Migration certification step:

`Certify Masjid Display legacy-Iqama migration safety` — SUCCESS.

Recorded output:

- `PLAN5_CHAIN_BEFORE prayer_times_count=81`
- `PLAN5_CHAIN_AFTER prayer_times_count=81`
- prayer hash BEFORE/AFTER: `a611e20d391dc7c306fc0f2a41a66b67`
- `PLAN5_CHAIN_BEFORE jumuah_times_count=3`
- `PLAN5_CHAIN_AFTER jumuah_times_count=3`
- Jumuah hash BEFORE/AFTER: `aabc1b96fe44f8ca8c29ff2e0b087764`
- Maghrib Program enabled rows BEFORE/AFTER: `8`
- `PLAN5_CHAIN_PREREQUISITE shared_delays=20,15,15,5,10`
- `PLAN5_CHAIN_AFTER shared_delays=20,15,15,5,10`
- `PLAN5_CHAIN_AFTER legacy_iqama_columns=0`
- `PLAN5_PENDING_CHAIN=PASS`
- `PLAN5_MIGRATION_DRY_RUN=PASS full pending-chain local certification completed`

**LOCAL/STAGING FULL PENDING-CHAIN CERTIFICATION: PASS**

## Codex migration-certification integrity loop

GitHub Codex identified and Plan 5 fixed these migration-certification gaps:

1. deleted Jumuah rows could evade the original inner-join check;
2. prayer-row deletion/date mutation could evade the original inner join;
3. prayer-row UUID identity was initially omitted;
4. prayer base/localized note fields were initially omitted from the hash;
5. Jumuah localized language/notes were initially omitted from the hash;
6. the original local exercise did not restore a reviewed pre-cutover production-like snapshot or apply the complete pending migration chain;
7. the certification document itself later remained stale and still described the obsolete 2-prayer/1-Jumuah rollback-only exercise after the full-chain gate had replaced it.

The executable gate and this evidence record now agree on the reviewed cutoff, 81/3 fixture, nine-migration chain, prerequisite probe, preserved fields, and actual local reset/apply semantics.

## Real target destructive cutover

Authorized read-only inspection of the Prayerapp Supabase target identified the current real-target state:

- `prayer_times`: 81 rows;
- `jumuah_times`: 3 rows;
- legacy absolute-Iqama columns present: all 5;
- `public.prayer_settings`: not present;
- latest applied repository migration visible on target during Plan 5 inspection: `20260902223939_admin_audit_hardening`.

Therefore the destructive cutover prerequisite is **not** satisfied. No schema or production-data mutation was performed on the real target by Plan 5.

**REAL TARGET DESTRUCTIVE CUTOVER: BLOCKED — `prayer_settings`/validated shared-delay prerequisite absent on the real target and destructive execution not authorized.**

To turn this row into PASS, an authorized operator must capture current real-target read-only evidence showing the singleton and five validated shared delays, approve the cutover, execute the migration through the normal release path, and record before/after counts and representative hashes/values.
