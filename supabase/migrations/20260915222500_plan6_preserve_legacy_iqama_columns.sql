-- Plan 6 migration-history-safe preservation shim.
--
-- The historical 20260915223000 migration is intentionally left byte-for-byte
-- unchanged. On a target that still has the five legacy absolute-Iqama columns,
-- move them out of that historical migration's DROP path without changing data.
--
-- Environments that already executed the old destructive migration simply
-- have nothing to rename here; the following restore migration reconciles them.
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
        'Plan 6 preservation shim found both % and %; refusing ambiguous legacy-Iqama state',
        v_original, v_transitional;
    end if;

    if v_original_exists then
      execute format(
        'alter table public.prayer_times rename column %I to %I',
        v_original,
        v_transitional
      );
    end if;
  end loop;
end
$$;
