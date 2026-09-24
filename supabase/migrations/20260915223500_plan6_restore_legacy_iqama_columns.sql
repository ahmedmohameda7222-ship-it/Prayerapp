-- Plan 6 compatibility repair / convergence migration.
--
-- The real production path never renames or drops the five legacy fields:
-- 20260915222500 is a non-mutating guard and 20260915223000 is an explicit
-- Plan 6 no-op. This migration therefore normally leaves production data
-- untouched.
--
-- It also repairs disposable/staging environments that may have executed an
-- older feature-branch draft: transitional columns are renamed back, or
-- missing nullable compatibility columns are recreated. Lost values are never
-- invented.
do $$
declare
  v_pair text[];
  v_original text;
  v_transitional text;
  v_original_exists boolean;
  v_transitional_exists boolean;
begin
  foreach v_pair slice 1 in array array[
    array['fajr_iqama', 'plan6_legacy_fajr_iqama'],
    array['dhuhr_iqama', 'plan6_legacy_dhuhr_iqama'],
    array['asr_iqama', 'plan6_legacy_asr_iqama'],
    array['maghrib_iqama', 'plan6_legacy_maghrib_iqama'],
    array['isha_iqama', 'plan6_legacy_isha_iqama']
  ]
  loop
    v_original := v_pair[1];
    v_transitional := v_pair[2];

    select exists (
      select 1 from information_schema.columns
      where table_schema = 'public'
        and table_name = 'prayer_times'
        and column_name = v_original
    ) into v_original_exists;

    select exists (
      select 1 from information_schema.columns
      where table_schema = 'public'
        and table_name = 'prayer_times'
        and column_name = v_transitional
    ) into v_transitional_exists;

    if v_original_exists and v_transitional_exists then
      raise exception
        'Plan 6 restore shim found both % and %; refusing ambiguous legacy-Iqama state',
        v_original, v_transitional;
    end if;

    if v_transitional_exists then
      execute format(
        'alter table public.prayer_times rename column %I to %I',
        v_transitional,
        v_original
      );
    elsif not v_original_exists then
      execute format(
        'alter table public.prayer_times add column %I text',
        v_original
      );
    end if;
  end loop;
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
