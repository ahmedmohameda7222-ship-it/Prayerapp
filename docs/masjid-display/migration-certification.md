# Masjid Display — Migration Certification

Status: **PLAN 6 PRE-MERGE PRODUCTION SCHEMA + FINAL-REVIEW SAFETY REMEDIATION APPLIED — FINAL EXACT-HEAD RECERTIFICATION PENDING**

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


## Direct production re-verification — 2026-09-25

A fresh read-only verification was run against the real Prayerapp production
Supabase project after the remediation was already applied:

`dbqbzvkleqzbgufllgca`

Current production migration head remains:

`20260925045344_plan6_snapshot_rpc_privileges`

Direct database verification confirms:

- `prayer_times`: 81 rows;
- retained-prayer preservation hash:
  `a611e20d391dc7c306fc0f2a41a66b67`, matching the recorded preflight;
- `jumuah_times`: 3 rows;
- Jumuah preservation hash:
  `aabc1b96fe44f8ca8c29ff2e0b087764`, matching the recorded preflight;
- legacy absolute-Iqama hash:
  `6f3fde0064cea4ffffd760ca4a96193b`, matching the recorded preflight;
- all five legacy columns remain physically present;
- each legacy column still has 11 non-null values;
- `prayer_settings` singleton exists with applied/runtime timezone
  `Europe/Berlin`, shared delays `20/15/15/5/10`, revisions `1/0`, and
  `profile_configured = false`;
- mosque-specific calculation parameters remain NULL rather than invented;
- `masjid_display_settings` singleton exists with prayer durations
  `10/10/10/10/10` and an empty Azkar playlist;
- `mosque_settings.public_app_url` is
  `https://donaumoschee.vercel.app`;
- the certified-timezone and setup-incomplete profile constraints are present;
- the atomic snapshot and schedule-write SECURITY DEFINER RPCs are not
  executable by `anon` or `authenticated` and remain executable by
  `service_role`;
- the atomic published prayer snapshot executed successfully and returned 37
  rows for `2026-09-24` through `2026-10-30` in `Europe/Berlin`;
- the bounded Jumuah, announcement, event, and campaign Feed window RPCs all
  executed successfully and returned valid JSON arrays.

The post-apply Supabase security advisor no longer reports the previously found
snapshot-RPC EXECUTE privilege issue. Remaining advisor entries are pre-existing
or general INFO/WARN items (for example service-role-only RLS tables with no
client policies, leaked-password protection, and performance advisories) and
are not a Plan 6 migration merge-safety regression.

### Mosque-settings preflight hash clarification

The previously recorded preflight core `mosque_settings` hash
`742a34e2f48ad5977c6d575eb339a701` does not equal the current direct
core hash `95a597ca180c98fd05e82e3c744b2df1`.

This discrepancy must not be presented as a verified before/after equality.
The applied Plan 6 migration statements were re-inspected directly from both
the repository and production migration history. They add
`public_app_url`, install triggers/metadata, and populate
`public_app_url` only when blank; no applied Plan 6 migration writes the
legacy mosque core fields included in that hash
(`mosque_name*`, address/contact/social/bank fields).

The production row's `updated_at` advanced when the runtime bootstrap filled
`public_app_url`, which is expected, but `updated_at` and
`public_app_url` are both outside the recorded core-hash expression.
Because no row-history source is available to reconstruct the exact earlier
core values, the old core-hash equality is treated as non-conclusive evidence
rather than silently asserted as preserved. Prayer/Jumuah/legacy-Iqama
preservation remains directly and deterministically verified as above.

No production data was modified as part of this re-verification.

## Final-review production safety convergence — 2026-09-25

A fresh Codex review after the first production-schema remediation identified
three additional legitimate issues. These are findings **39–41** in the
cumulative Plan 6 Codex review history:

39. **P1:** the source assertion in
    `20260924070000_plan6_premerge_runtime_bootstrap.sql` accepted only the
    freshly seeded unconfigured Berlin singleton and could reject a valid
    preconfigured Prayer Engine singleton;
40. **P1:** a same-day timezone promotion could occur after native alarms or
    reminder deliveries for the old schedule had already become actionable;
41. **P2:** Donation Campaign Admin accepted a plaintext `http://` donation
    URL that could become a payment-related Campaign QR destination.

The branch corrections are:

- the runtime-bootstrap assertion now validates generalized configured-or-
  bootstrap singleton invariants rather than exact seeded values;
- `20260925073810_plan6_final_review_safety.sql` reasserts those generalized
  invariants and replaces the atomic recalculation RPC with fail-closed
  timezone-cutover guards;
- timezone promotion is rejected while any non-revoked native prayer
  installation exists;
- timezone promotion is rejected at or after the earliest old/new current-day
  Fajr-minus-15-minute reminder boundary and must instead be deferred to an
  unstarted schedule date;
- Donation Campaign Admin now accepts only optional **HTTPS** donation URLs.

### Exact-head certification before production apply

Repository HEAD used to certify the final-review safety migration:

`0a75219435aeb7e8c744f8361cc6d692a855dec2`

All required workflow families succeeded:

- Root CI `36107788925`: **SUCCESS**;
- Masjid Display Verification `36107788874`: **SUCCESS**;
- Plan 3 Display Feed Verification `36107788854`: **SUCCESS**;
- Security Scanners `36107788912`: **SUCCESS**;
- Android TWA `36107788909`: **SUCCESS**, including API 23 and API 37
  instrumentation.

Root CI specifically certified clean Supabase bootstrap, legacy-Iqama migration
safety, restoration of the final migration head, reconciliation/data-
preservation behavior, admin-audit migration behavior, TV verification, and the
root production build.

### Production apply

Real Prayerapp production Supabase project/ref:

`dbqbzvkleqzbgufllgca`

Repository migration source:

`supabase/migrations/20260925073810_plan6_final_review_safety.sql`

The connected Supabase migration API applied that exact non-destructive SQL as:

`20260925073810_plan6_final_review_safety`

The repository migration version is aligned with the already-applied production history; the rename changed only migration bookkeeping, not SQL or production state.

The production migration head is therefore now:

`20260925073810_plan6_final_review_safety`

The migration contains no legacy-Iqama DROP and does not rewrite canonical
prayer/Jumuah rows.

### Same-query pre/post preservation proof

Immediately before and after the final-review safety migration, the same
read-only deterministic projections produced identical results:

- `prayer_times`: **81 → 81**;
- prayer projection hash:
  `d3a1191a3042cb651fc647c304b32f15 → d3a1191a3042cb651fc647c304b32f15`;
- `jumuah_times`: **3 → 3**;
- Jumuah projection hash:
  `581a1f764e4d56096b074b5ac27e9a48 → 581a1f764e4d56096b074b5ac27e9a48`;
- legacy absolute-Iqama non-null coverage:
  **11/11/11/11/11 → 11/11/11/11/11**;
- all five legacy columns remain physically present.

The Prayer Engine singleton also remained unchanged by this convergence:

- pending/applied timezone: `Europe/Berlin / Europe/Berlin`;
- revisions: calculation `1`, applied `0`, row `1`;
- `profile_configured=false`;
- shared Iqama delays: `20/15/15/5/10`;
- mosque-specific calculation parameters remain NULL.

The Masjid Display singleton remains five 10-minute prayer durations with an
empty Azkar playlist, and the public Prayerapp URL remains
`https://donaumoschee.vercel.app`.

### Direct runtime verification after apply

Direct production inspection confirms:

- the effective recalculation RPC contains the active-native-installation
  guard;
- it contains the Fajr-minus-15-minute cutover boundary;
- it requires late cutovers to be deferred to an unstarted schedule date;
- current active native installations are **0**;
- recalculation RPC EXECUTE is denied to `anon` and `authenticated` and
  granted to `service_role`;
- snapshot RPC EXECUTE remains denied to `anon` and `authenticated` and
  granted to `service_role`;
- the atomic published schedule snapshot returns a valid object with **37**
  rows in `Europe/Berlin`, spanning **2026-09-24 through 2026-10-30** for the
  tested window;
- bounded Jumuah, announcement, event, and campaign Feed-window RPCs all
  execute successfully against production data;
- the current tested windows returned 1 Jumuah, 1 announcement, 1 event, and
  1 campaign row;
- required Prayer Engine, Masjid Display, and mosque-settings singleton rows
  exist.

Post-DDL Supabase security/performance advisors introduced no new finding
attributable to this migration. The remaining advisor items are the same
pre-existing/general INFO/WARN items already outside this Plan 6 merge-safety
change.

### Plan boundary

The five legacy columns are still physically present:

- `fajr_iqama`
- `dhuhr_iqama`
- `asr_iqama`
- `maghrib_iqama`
- `isha_iqama`

They remain compatibility data only. Active runtime authority is still:

`Iqama = final canonical prayer start + configured shared delay`

No destructive legacy-Iqama cutover was performed and Plan 7 has not started.
Final live TV/Vercel/browser/Admin Test Mode verification remains post-merge.

Because this evidence update changes repository documentation, a fresh complete
exact-head workflow set and final exact-head Codex review are still required
after this commit before independent Planner handoff.
