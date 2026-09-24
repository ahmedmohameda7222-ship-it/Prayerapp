# Absolute Iqama Cutover Checklist

Status: **DEFERRED TO PLAN 7 — NOT AUTHORIZED IN PLAN 6**

This checklist records the destructive removal boundary for the five legacy
absolute daily Iqama columns in `public.prayer_times`.

## Plan 6 boundary

During Plan 6:

1. The root application, Feed, TV runtime, Admin runtime, and Android runtime
   must not read or write the exact legacy fields
   `fajr_iqama`, `dhuhr_iqama`, `asr_iqama`, `maghrib_iqama`,
   `isha_iqama` or their camel-case equivalents.
2. Runtime Iqama authority is exclusively:
   `final canonical prayer start + configured shared delay`.
3. The five legacy absolute-Iqama columns **must remain physically present** in
   the real production database for the Plan 6 merge.
4. Existing production values in those columns must be preserved byte-for-byte
   through the Plan 6 production migration chain.
5. Their continued physical presence is compatibility only; they are **not runtime authority**.
6. Plan 6 must not execute a `DROP COLUMN` for any of the five fields.

The feature-branch migration
`20260915223000_remove_absolute_iqama_columns.sql` had not been applied to the
real production project when the Planner identified this sequencing blocker.
Before first production application, it was explicitly changed into a Plan 6
no-op and all `DROP COLUMN` statements were removed. Its version/path remains
in the ordered chain so migration ordering stays deterministic; destructive
removal must use a new, explicitly approved Plan 7-or-later migration version.

`20260915222500_plan6_preserve_legacy_iqama_columns.sql` is now a
non-mutating guard. It does not rename the production columns, because the
currently deployed `main` application still reads those exact names and even a
short rename window would be unsafe.

`20260915223500_plan6_restore_legacy_iqama_columns.sql` is convergence-only:
it repairs an older disposable/staging feature-branch draft if transitional
columns exist, or recreates missing nullable compatibility fields if an older
draft already removed them. On the real Plan 6 production path the existing
column names and values stay continuously present.

`20260924070000_plan6_premerge_runtime_bootstrap.sql` additionally normalizes
older disposable/staging states with `ADD COLUMN IF NOT EXISTS`. It does not
overwrite existing production legacy-Iqama values.

## Plan 6 production preflight evidence — 2026-09-24

Prayerapp production Supabase project/ref:

`dbqbzvkleqzbgufllgca`

Read-only preflight established:

- `prayer_times`: 81 rows;
- `jumuah_times`: 3 rows;
- all five legacy absolute-Iqama columns exist;
- each legacy Iqama column has 11 non-null values;
- retained prayer-row hash:
  `a611e20d391dc7c306fc0f2a41a66b67`;
- Jumuah hash:
  `aabc1b96fe44f8ca8c29ff2e0b087764`;
- legacy absolute-Iqama hash:
  `6f3fde0064cea4ffffd760ca4a96193b`;
- `prayer_settings`: absent before remediation;
- `masjid_display_settings`: absent before remediation;
- `get_published_prayer_schedule_snapshot(...)`: absent before remediation;
- production migration history ends at
  `20260902223939_admin_audit_hardening`.

This evidence is the preservation baseline for the authorized non-destructive
Plan 6 production migration work.

## Runtime settings bootstrap

The Plan 6 pre-merge bootstrap may create the missing runtime singletons, but it
must not reinterpret or rewrite existing canonical `prayer_times`.

Prayer Engine bootstrap rules:

- applied timezone remains `Europe/Berlin`, matching the existing application
  and canonical schedule authority;
- shared Iqama delays are `20,15,15,5,10`, matching the already-certified
  migration prerequisite and the most recent populated legacy production rows;
- mosque-specific calculation fields remain unconfigured/`NULL`;
- `profile_configured = false`, with `calculation_revision = 1` and
  `applied_calculation_revision = 0`;
- no generated/recalculated schedule row is committed by the bootstrap;
- an operator must review a future recalculation preview before those
  calculation parameters can become applied schedule authority.

Masjid Display bootstrap rules:

- five prayer-in-progress durations use the existing Admin default of 10
  minutes;
- Azkar playlist starts empty;
- the canonical production Prayerapp URL is
  `https://donaumoschee.vercel.app`;
- no synthetic content rows are inserted into prayer/content tables.

## Future destructive gate

The actual destructive removal of the five legacy columns is reserved for an
explicitly approved **Plan 7 or later**.

A later destructive plan must independently re-verify data preservation,
runtime cutover, backups/rollback, and target authorization before adding or
executing any `DROP COLUMN`.

Plan 6 approval or merge does **not** authorize that future destructive action.
