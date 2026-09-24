# Masjid Display — Migration Certification

Status: **PLAN 6 PRE-MERGE REMEDIATION IMPLEMENTED — PRODUCTION APPLY PENDING**

## Scope

Plan 6 must make the real Prayerapp production database forward-compatible
with the feature branch before the branch can be merged to `main`.

The authorized Plan 6 operation is **non-destructive**:

- apply the required Prayer Engine / Masjid Display / Feed / Android schema;
- initialize the required singleton runtime rows safely;
- preserve existing production data;
- preserve all five legacy absolute-Iqama columns physically;
- keep those legacy columns outside active application/runtime authority;
- defer their destructive removal to an explicitly approved Plan 7 or later.

Executable certification:

`scripts/verify-masjid-display-migration.sh`

## Reviewed production starting point — 2026-09-24

Prayerapp production Supabase project/ref:

`dbqbzvkleqzbgufllgca`

Applied migration head before Plan 6 remediation:

`20260902223939_admin_audit_hardening`

Read-only production preflight:

- `prayer_times`: **81** rows;
- `jumuah_times`: **3** rows;
- `announcements`: **3** rows;
- `events`: **0** rows;
- `donation_campaigns`: **0** rows;
- `mosque_settings`: **1** row;
- `push_subscriptions`: **12** rows;
- `user_prayer_reminders`: **4** rows;
- `native_prayer_installations`: **0** rows;
- `native_prayer_delivery_receipts`: **0** rows;
- `prayer_settings`: absent;
- `masjid_display_settings`: absent;
- `get_published_prayer_schedule_snapshot(...)`: absent.

Legacy absolute-Iqama state:

- all five columns physically exist;
- `fajr_iqama`: 11 non-null values;
- `dhuhr_iqama`: 11 non-null values;
- `asr_iqama`: 11 non-null values;
- `maghrib_iqama`: 11 non-null values;
- `isha_iqama`: 11 non-null values.

Deterministic preservation baseline:

- retained prayer hash:
  `a611e20d391dc7c306fc0f2a41a66b67`;
- Jumuah hash:
  `aabc1b96fe44f8ca8c29ff2e0b087764`;
- legacy absolute-Iqama hash:
  `6f3fde0064cea4ffffd760ca4a96193b`;
- announcements core hash:
  `45ed5dbc82a490aa9e99308e574f5e6a`;
- mosque settings core hash:
  `742a34e2f48ad5977c6d575eb339a701`.

Production is therefore confirmed to be at the exact historical migration level
represented by the existing 81-prayer / 3-Jumuah production-like fixture.

## Plan 6 sequencing remediation

### Historical migration version retained, destructive action removed

The repository keeps the historical migration path:

`20260915223000_remove_absolute_iqama_columns.sql`

but its Plan 6 implementation is intentionally **non-destructive**.

At that historical boundary it:

- requires all five legacy absolute-Iqama columns to still exist;
- performs no `DROP COLUMN`;
- labels those fields as physical compatibility data only;
- explicitly states that they are not runtime Iqama authority.

This avoids renumbering/reordering already reviewed migration history while
honoring the Plan 6 production boundary.

### Explicit compatibility/bootstrap migration

Plan 6 adds:

`20260924070000_plan6_premerge_runtime_bootstrap.sql`

It performs only additive/idempotent compatibility/bootstrap work:

1. Re-adds any missing legacy Iqama columns with
   `ADD COLUMN IF NOT EXISTS` for environments that previously executed the
   old destructive form. A production target where the columns still exist is
   not rewritten.
2. Creates the missing Prayer Engine singleton only when absent.
3. Keeps the calculation profile **pending**:
   `calculation_revision=1`,
   `applied_calculation_revision=0`.
4. Keeps the live applied schedule timezone at
   `Europe/Berlin`.
5. Initializes shared Iqama delays to
   `20,15,15,5,10`, the already-certified migration prerequisite and the
   values represented by the most recent populated legacy production rows.
6. Does **not** recalculate or rewrite any canonical `prayer_times` row.
7. Creates Masjid Display settings only when absent using the existing Admin
   defaults: five 10-minute prayer-in-progress durations and an empty Azkar
   playlist.
8. Sets the canonical public Prayerapp URL to
   `https://donaumoschee.vercel.app` only when the singleton value is blank.
9. Verifies the required singleton/runtime state and all five retained legacy
   columns before the migration completes.

The calculation fields used to make the Prayer Engine row structurally valid
reuse the repository's existing editable migration-harness profile. They are
**not** promoted to applied calculation authority. An operator must review a
future recalculation preview and explicitly commit it before those parameters
can rewrite future schedule rows.

## Full non-destructive production-like chain

The deterministic harness resets local Supabase to:

`20260902223939`

then loads:

`supabase/tests/fixtures/plan5-precutover-production-like.sql`

This fixture preserves the reviewed real-target snapshot of 81 prayer rows and
3 Jumuah rows.

The harness applies, in repository order:

1. `20260915220000_masjid_display_prayer_settings.sql`
2. `20260915221000_prayer_schedule_atomic_generation.sql`
3. `20260915222000_masjid_display_admin_schema.sql`
4. `20260915223000_remove_absolute_iqama_columns.sql` — Plan 6 non-destructive form
5. `20260917041000_masjid_display_feed_revision.sql`
6. `20260917233500_masjid_display_bounded_generated_at.sql`
7. `20260918001500_masjid_display_semantic_source_timestamps.sql`
8. `20260918015000_masjid_display_snapshot_window_readers.sql`
9. `20260919023000_masjid_display_feed_bounds.sql`
10. `20260922060000_prayer_event_v3.sql`
11. `20260922061000_applied_timezone.sql`
12. `20260922062000_masjid_display_dynamic_budget_timezone.sql`
13. `20260923030000_published_prayer_schedule_snapshot.sql`
14. `20260923100000_prayer_schedule_midnight_write_guards.sql`
15. `20260924060000_certified_prayer_timezones.sql`
16. `20260924070000_plan6_premerge_runtime_bootstrap.sql`

Required harness success markers:

- `PLAN6_IQAMA_TRANSITION=PASS`
- `PLAN6_CONTENT_PREFLIGHT=PASS`
- `PLAN6_PREMERGE_CHAIN=PASS`
- `PLAN6_CONTENT_BUDGET=PASS`
- `PLAN6_MIGRATION_DRY_RUN=PASS`

The completed harness must emit and verify:

- `PLAN6_CHAIN_BEFORE prayer_times_count=81`
- `PLAN6_CHAIN_AFTER prayer_times_count=81`
- `PLAN6_CHAIN_BEFORE jumuah_times_count=3`
- `PLAN6_CHAIN_AFTER jumuah_times_count=3`
- unchanged retained prayer hash;
- unchanged Jumuah hash;
- unchanged legacy-Iqama hash;
- unchanged legacy-Iqama coverage;
- `PLAN6_CHAIN_AFTER shared_delays=20,15,15,5,10`;
- `PLAN6_CHAIN_AFTER revision_state=1,0,1`;
- `PLAN6_CHAIN_AFTER timezone_state=Europe/Berlin,Europe/Berlin`;
- `PLAN6_CHAIN_AFTER display_state=10,10,10,10,10,0`;
- `PLAN6_CHAIN_AFTER legacy_iqama_columns=5`;
- `PLAN6_CHAIN_AFTER public_app_url=https://donaumoschee.vercel.app`.

## Runtime authority boundary

Physical retention of the old fields is not a dual-runtime model.

Active root/TV/Android Iqama authority remains:

`Iqama = final canonical prayer start + configured delay`

Repository tests independently reject active production reads/writes of the five
legacy absolute-Iqama field names in `app/`, `components/`, and `lib/`.

The legacy DB values are preserved only for transition safety and later
explicitly authorized cleanup.

## Historical Plan 5 evidence

Plan 5 previously certified the then-approved destructive cutover locally and
recorded a target blocker because production lacked `prayer_settings`.
That historical evidence remains valid as history; Plan 6 supersedes the
production sequencing and explicitly does not execute the destructive cutover.

The historical production-like hashes used by Plan 5 match the current Plan 6
preflight:

- retained prayer hash:
  `a611e20d391dc7c306fc0f2a41a66b67`;
- Jumuah hash:
  `aabc1b96fe44f8ca8c29ff2e0b087764`.

## Production apply status

**PENDING.**

The production database must not be mutated until the new full
non-destructive production-like migration chain passes the required repository
and CI gates.

After successful application, this document must be updated with:

- the exact migrations actually applied;
- resulting production migration head;
- actual post-apply row counts and hashes;
- actual singleton values;
- actual retained legacy-column/value evidence;
- actual snapshot RPC result;
- actual required constraints/functions;
- production Feed dependency verification.

The destructive Plan 7 cutover remains outside this certification.
