# Masjid Display — Migration Certification

Status: **PLAN 6 PRE-MERGE PRODUCTION SCHEMA REMEDIATION APPLIED — FINAL RECERTIFICATION PENDING**

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

### Destructive feature-branch draft explicitly deferred before production

The independent Planner review identified that the real production database
still serves the currently deployed `main` application, which actively reads
the five legacy absolute-Iqama column names. A draft strategy that temporarily
renamed those columns around the old destructive migration would therefore
create an observable production compatibility window even if the values were
restored immediately afterward.

Before any Plan 6 migration was applied to the real production project, the
feature-branch migration sequence was corrected explicitly:

- `20260915222500_plan6_preserve_legacy_iqama_columns.sql` is now a
  non-mutating safety guard and does **not** rename the production columns;
- `20260915223000_remove_absolute_iqama_columns.sql` retains its migration
  version/path for deterministic ordering but is an explicit **Plan 6 no-op**;
  it contains no `DROP COLUMN` statements;
- destructive removal is deferred to a **new migration version** in an
  explicitly approved Plan 7 or later;
- `20260915223500_plan6_restore_legacy_iqama_columns.sql` is
  compatibility/repair logic only. It can recover an older disposable/staging
  feature-branch draft that was interrupted after a transitional rename or
  recreate nullable compatibility columns where an older draft had already
  removed them. On the real Plan 6 production path it leaves the existing
  columns and values untouched.

This is an intentional pre-production migration-history remediation, not a
silent post-production rewrite: production migration history currently stops at
`20260902223939_admin_audit_hardening`, so none of the affected Plan 5/6
migration versions had been applied to the real Prayerapp project when this
change was made.

The resulting production path keeps the five legacy column names continuously
available to the currently deployed `main` runtime while the feature branch is
being prepared for merge. Their values remain compatibility data only; the new
branch runtime does not use them as Iqama authority.

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
6. Leaves mosque-specific calculation fields unconfigured/`NULL` with
   `profile_configured=false`; it does not invent latitude, angles, Asr
   method, or high-latitude policy.
7. Does **not** recalculate or rewrite any canonical `prayer_times` row.
8. Creates Masjid Display settings only when absent using the existing Admin
   defaults: five 10-minute prayer-in-progress durations and an empty Azkar
   playlist.
9. Sets the canonical public Prayerapp URL to
   `https://donaumoschee.vercel.app` only when the singleton value is blank.
10. Verifies the required singleton/runtime state and all five retained legacy
   columns before the migration completes.

The bootstrap deliberately contains **no mosque-specific calculation profile**.
Prayer Engine calculation/generation stays unavailable until an operator saves
a reviewed profile through Admin. Runtime consumers that only need the applied
timezone and shared Iqama delays use that narrower authority without requiring
or inventing calculation parameters.

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
4. `20260915222500_plan6_preserve_legacy_iqama_columns.sql`
5. `20260915223000_remove_absolute_iqama_columns.sql` — explicit Plan 6 no-op; destructive removal is deferred to a new Plan 7-or-later migration
6. `20260915223500_plan6_restore_legacy_iqama_columns.sql`
7. `20260917041000_masjid_display_feed_revision.sql`
8. `20260917233500_masjid_display_bounded_generated_at.sql`
9. `20260918001500_masjid_display_semantic_source_timestamps.sql`
10. `20260918015000_masjid_display_snapshot_window_readers.sql`
11. `20260919023000_masjid_display_feed_bounds.sql`
12. `20260922060000_prayer_event_v3.sql`
13. `20260922061000_applied_timezone.sql`
14. `20260922062000_masjid_display_dynamic_budget_timezone.sql`
15. `20260923030000_published_prayer_schedule_snapshot.sql`
16. `20260923100000_prayer_schedule_midnight_write_guards.sql`
17. `20260924060000_certified_prayer_timezones.sql`
18. `20260924070000_plan6_premerge_runtime_bootstrap.sql`

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
- `PLAN6_CHAIN_AFTER profile_state=false,true,true,true,true,true,true`;
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

**APPLIED AND DIRECTLY VERIFIED — 2026-09-25.**

Real Prayerapp production Supabase project/ref:

`dbqbzvkleqzbgufllgca`

The authorized non-destructive Plan 5/6 chain was applied to the real production
database. The five legacy absolute-Iqama columns were never dropped.

Production migration history now contains, in order:

1. `20260915220000_masjid_display_prayer_settings`
2. `20260915221000_prayer_schedule_atomic_generation`
3. `20260915222000_masjid_display_admin_schema`
4. `20260915222500_plan6_preserve_legacy_iqama_columns`
5. `20260915223000_remove_absolute_iqama_columns` — explicit no-op
6. `20260915223500_plan6_restore_legacy_iqama_columns`
7. `20260917041000_masjid_display_feed_revision`
8. `20260917233500_masjid_display_bounded_generated_at`
9. `20260918001500_masjid_display_semantic_source_timestamps`
10. `20260918015000_masjid_display_snapshot_window_readers`
11. `20260919023000_masjid_display_feed_bounds`
12. `20260922060000_prayer_event_v3`
13. `20260922061000_applied_timezone`
14. `20260922062000_masjid_display_dynamic_budget_timezone`
15. `20260923030000_published_prayer_schedule_snapshot`
16. `20260923100000_prayer_schedule_midnight_write_guards`
17. `20260924060000_certified_prayer_timezones`
18. `20260924070000_plan6_premerge_runtime_bootstrap`
19. `20260925045344_plan6_snapshot_rpc_privileges`

Current production migration head:

`20260925045344_plan6_snapshot_rpc_privileges`

### Direct before/after preservation evidence

The exact same read-only row serialization query was executed before the first
production migration and after the complete production apply:

- `prayer_times`: **81 → 81**;
- raw full-row hash:
  `80ed0064dfbd1f55a76f2546575adfd4 → 80ed0064dfbd1f55a76f2546575adfd4`;
- `jumuah_times`: **3 → 3**;
- raw full-row hash:
  `2787578d3e3241d15e473b35f49506f3 → 2787578d3e3241d15e473b35f49506f3`;
- all five legacy absolute-Iqama columns remain present;
- non-null legacy coverage remains **11,11,11,11,11**.

The current certification-field hashes are also:

- prayer core:
  `a611e20d391dc7c306fc0f2a41a66b67`;
- Jumuah core:
  `aabc1b96fe44f8ca8c29ff2e0b087764`;
- legacy absolute-Iqama values:
  `6f3fde0064cea4ffffd760ca4a96193b`.

The Prayer Engine / Masjid Display migrations do not rewrite existing mosque
identity/contact/banking fields. The only intentional production
`mosque_settings` data mutation in this remediation is filling the previously
blank `public_app_url` with the canonical Prayerapp URL. The deterministic
production-like migration harness separately verifies that all pre-existing
mosque settings fields included in its preservation projection remain
unchanged.

### Required runtime singleton state

Direct production verification after apply confirms:

- `prayer_settings.id='1'` exists;
- `timezone='Europe/Berlin'`;
- `applied_timezone='Europe/Berlin'`;
- shared Iqama delays are **20,15,15,5,10**;
- `profile_configured=false`;
- mosque-specific calculation fields remain `NULL`;
- `calculation_revision=1`;
- `applied_calculation_revision=0`;
- `row_revision=1`;
- `masjid_display_settings.id='1'` exists;
- five prayer-in-progress durations are **10,10,10,10,10**;
- selected Azkar playlist is empty;
- `mosque_settings.public_app_url='https://donaumoschee.vercel.app'`.

No canonical `prayer_times` row was recalculated or rewritten by the bootstrap.
The live timetable remains the existing canonical schedule. An operator must
explicitly configure a Prayer Engine calculation profile before calculation,
extension, or recalculation can be used.

### Runtime object / contract verification

Direct read-only production verification confirms:

- `prayer_settings`, `masjid_display_settings`, and
  `masjid_display_test_state` exist;
- bounded Masjid Display Jumuah/announcement/event/campaign RPCs exist;
- `get_published_prayer_schedule_snapshot(...)` exists and returns a valid
  atomic `Europe/Berlin` schedule snapshot over the live published timetable;
- the tested current snapshot returned published rows spanning
  **2026-09-24 through 2026-10-30** for the requested live window;
- current announcement window projection succeeds;
- empty Jumuah/event/campaign windows return valid empty arrays rather than
  schema/runtime failures;
- certified timezone constraints exist on `prayer_settings`.

A post-apply Supabase security-advisor check identified that Supabase default
function privileges had left the `SECURITY DEFINER` atomic snapshot RPC
explicitly executable by `anon` and `authenticated` even though the
historical migration revoked `public`. This was converged with the new
`20260925045344_plan6_snapshot_rpc_privileges` migration.

Direct post-convergence ACL evidence:

- `anon EXECUTE = false`;
- `authenticated EXECUTE = false`;
- `service_role EXECUTE = true`.

The corresponding advisor warnings are no longer present. Remaining advisor
items are pre-existing/general INFO or Auth configuration findings and are not
introduced by this Plan 6 runtime schema apply.

### Plan boundary after production apply

The real production database is now forward-compatible with the Plan 6 branch
without activating a new religious calculation profile and without destructive
legacy-Iqama removal.

The five physical legacy columns remain transition compatibility data only:

- `fajr_iqama`
- `dhuhr_iqama`
- `asr_iqama`
- `maghrib_iqama`
- `isha_iqama`

The feature-branch runtime authority remains:

`Iqama = final canonical prayer start + configured shared delay`

Destructive removal remains explicitly deferred to Plan 7 or later.

Because repository files changed during this remediation, the branch still
requires one final exact-head workflow set and a fresh exact-head Codex review
before it can be returned to the independent Planner.

