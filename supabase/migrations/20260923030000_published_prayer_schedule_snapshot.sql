-- Return the applied prayer timezone and the published schedule rows from one
-- PostgreSQL statement snapshot so readers never pair old timezone authority with
-- newly recalculated wall-clock rows (or vice versa).
create or replace function public.get_published_prayer_schedule_snapshot(
  p_from date default null,
  p_through date default null,
  p_now timestamptz default null,
  p_days_before integer default 0,
  p_days_after integer default 0
) returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
  v_timezone text;
  v_now timestamptz := coalesce(p_now, statement_timestamp());
  v_today date;
  v_from date;
  v_through date;
  v_rows jsonb;
begin
  if p_days_before < 0 or p_days_before > 62
     or p_days_after < 0 or p_days_after > 62 then
    raise exception 'invalid prayer schedule snapshot horizon';
  end if;

  select coalesce(
    (select applied_timezone from public.prayer_settings where id = '1'),
    'Europe/Berlin'
  ) into v_timezone;

  v_today := (v_now at time zone v_timezone)::date;
  v_from := coalesce(p_from, v_today - p_days_before);
  v_through := coalesce(p_through, v_today + p_days_after);

  if v_from is null or v_through is null or v_through < v_from
     or (v_through - v_from) > 93 then
    raise exception 'invalid prayer schedule snapshot range';
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', p.id,
        'date', p.date,
        'fajr', p.fajr,
        'sunrise', p.sunrise,
        'dhuhr', p.dhuhr,
        'asr', p.asr,
        'maghrib', p.maghrib,
        'isha', p.isha,
        'maghrib_program_enabled', p.maghrib_program_enabled,
        'maghrib_lesson_title', p.maghrib_lesson_title,
        'maghrib_lesson_duration_minutes', p.maghrib_lesson_duration_minutes,
        'maghrib_combined_isha_time', p.maghrib_combined_isha_time,
        'note', p.note,
        'note_ar', p.note_ar,
        'note_en', p.note_en,
        'note_de', p.note_de,
        'note_tr', p.note_tr,
        'updated_at', p.updated_at
      )
      order by p.date
    ),
    '[]'::jsonb
  )
  into v_rows
  from public.prayer_times p
  where p.published = true
    and p.date >= v_from
    and p.date <= v_through;

  return jsonb_build_object(
    'timeZone', v_timezone,
    'from', v_from::text,
    'through', v_through::text,
    'rows', v_rows
  );
end;
$$;

revoke all on function public.get_published_prayer_schedule_snapshot(
  date, date, timestamptz, integer, integer
) from public;
grant execute on function public.get_published_prayer_schedule_snapshot(
  date, date, timestamptz, integer, integer
) to service_role;
