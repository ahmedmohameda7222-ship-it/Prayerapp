do $$
declare
  v_legacy_predicate text;
  v_has_legacy_values boolean := false;
  v_has_valid_delays boolean := false;
begin
  select string_agg(format('%I is not null', c.column_name), ' or ' order by c.column_name)
  into v_legacy_predicate
  from information_schema.columns c
  where c.table_schema = 'public'
    and c.table_name = 'prayer_times'
    and c.column_name in (
      'fajr_iqama',
      'dhuhr_iqama',
      'asr_iqama',
      'maghrib_iqama',
      'isha_iqama'
    );

  if v_legacy_predicate is not null then
    execute format(
      'select exists (select 1 from public.prayer_times where %s)',
      v_legacy_predicate
    )
    into v_has_legacy_values;
  end if;

  if v_has_legacy_values then
    if to_regclass('public.prayer_settings') is null then
      raise exception 'Cannot remove populated legacy absolute Iqama columns without prayer_settings';
    end if;

    select exists (
      select 1
      from public.prayer_settings
      where id = '1'
        and fajr_iqama_delay_minutes between 0 and 180
        and dhuhr_iqama_delay_minutes between 0 and 180
        and asr_iqama_delay_minutes between 0 and 180
        and maghrib_iqama_delay_minutes between 0 and 180
        and isha_iqama_delay_minutes between 0 and 180
    )
    into v_has_valid_delays;

    if not v_has_valid_delays then
      raise exception 'Cannot remove populated legacy absolute Iqama columns without validated shared delays';
    end if;
  end if;
end
$$;

alter table public.prayer_times
  drop column if exists fajr_iqama,
  drop column if exists dhuhr_iqama,
  drop column if exists asr_iqama,
  drop column if exists maghrib_iqama,
  drop column if exists isha_iqama;
