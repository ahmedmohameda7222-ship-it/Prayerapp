-- Historical migration version retained for migration-order compatibility.
--
-- Plan 2 originally used this version for the destructive legacy absolute-Iqama
-- cutover. Plan 6 explicitly defers that destructive production cutover to a
-- later separately approved plan. New Plan 6 targets must therefore preserve
-- the five legacy columns physically while all application/runtime authority
-- remains prayer start + shared delay.
--
-- Environments that already executed the older destructive form of this
-- migration are normalized by the later
-- 20260924070000_plan6_premerge_runtime_bootstrap migration.

do $$
declare
  v_legacy_column_count integer;
begin
  select count(*)
  into v_legacy_column_count
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'prayer_times'
    and column_name in (
      'fajr_iqama',
      'dhuhr_iqama',
      'asr_iqama',
      'maghrib_iqama',
      'isha_iqama'
    );

  if v_legacy_column_count <> 5 then
    raise exception
      'Plan 6 transition requires the five legacy absolute-Iqama columns to remain present at this migration boundary';
  end if;
end
$$;

comment on column public.prayer_times.fajr_iqama is
  'Legacy compatibility field retained physically during Plan 6; not runtime Iqama authority.';
comment on column public.prayer_times.dhuhr_iqama is
  'Legacy compatibility field retained physically during Plan 6; not runtime Iqama authority.';
comment on column public.prayer_times.asr_iqama is
  'Legacy compatibility field retained physically during Plan 6; not runtime Iqama authority.';
comment on column public.prayer_times.maghrib_iqama is
  'Legacy compatibility field retained physically during Plan 6; not runtime Iqama authority.';
comment on column public.prayer_times.isha_iqama is
  'Legacy compatibility field retained physically during Plan 6; not runtime Iqama authority.';
