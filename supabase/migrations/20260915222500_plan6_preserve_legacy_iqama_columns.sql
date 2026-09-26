-- Plan 6 production-safety guard.
--
-- This migration version was introduced on the feature branch before any
-- production application. The original draft renamed the five legacy Iqama
-- columns around the historical destructive cutover. That would create an
-- observable compatibility window for the currently deployed main runtime,
-- which still reads those column names.
--
-- Plan 6 therefore performs no rename here. The legacy columns remain present
-- continuously. The following 20260915223000 migration is an explicit no-op in
-- Plan 6, and 20260915223500 only repairs environments that had already run an
-- older feature-branch draft.
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'prayer_times'
      and column_name in (
        'plan6_legacy_fajr_iqama',
        'plan6_legacy_dhuhr_iqama',
        'plan6_legacy_asr_iqama',
        'plan6_legacy_maghrib_iqama',
        'plan6_legacy_isha_iqama'
      )
  ) then
    raise exception
      'Unexpected transitional Plan 6 legacy-Iqama columns; repair the interrupted feature-branch draft before continuing';
  end if;
end
$$;
