# Absolute Iqama Cutover Checklist

This checklist governs the destructive removal of the five legacy absolute daily Iqama columns from `public.prayer_times`.

## Application cutover gate

Before considering the destructive migration deployable:

1. Confirm the root application has no active reads or writes of the exact legacy fields `fajr_iqama`, `dhuhr_iqama`, `asr_iqama`, `maghrib_iqama`, `isha_iqama` or their camel-case equivalents.
2. Preserve the canonical shared delay fields in `public.prayer_settings`; names such as `fajr_iqama_delay_minutes` are not legacy absolute fields.
3. Run the complete test suite and production build.
4. Run `supabase db reset` against the local disposable database and confirm all migrations apply from zero.

## Target-environment destructive deployment gate

Read the target environment before applying `20260915223000_remove_absolute_iqama_columns.sql`. The target must contain exactly one `public.prayer_settings` singleton row and all five delay columns are non-null. A delay value of `0` is valid.

Required read-only evidence should establish:

```sql
select
  id,
  fajr_iqama_delay_minutes,
  dhuhr_iqama_delay_minutes,
  asr_iqama_delay_minutes,
  maghrib_iqama_delay_minutes,
  isha_iqama_delay_minutes
from public.prayer_settings
where id = '1';
```

Deployment readiness is **BLOCKED** if that row is missing, if any delay is null, or if the target query cannot be executed and reviewed.

### Current target evidence — 2026-09-16

A read-only target query confirmed `public.prayer_times` exists but `public.prayer_settings` does not exist. A separate read of `public.mosque_settings` identified the target as the Deggendorf mosque project. Therefore the target deployment gate is **BLOCKED**. No destructive target migration was applied.

Do not apply the destructive migration to the target environment while this gate is BLOCKED. Creating and validating the migration locally does not authorize a production database write.

## Data preserved by the migration

The migration drops only the five legacy absolute daily Iqama columns. It must preserve the six prayer start-time fields, all shared delay settings, notes, publication state, and all Maghrib Program metadata including `maghrib_combined_isha_time`.
