-- Plan 5 Masjid Display: fail-closed bounds for public Feed snapshot readers.
--
-- Each reader rejects any matching source row above 16 KiB and returns at most
-- max+1 rows. The server-side Feed builder treats max+1 as overflow and rejects
-- the snapshot, preventing a healthy-looking partial Feed from silently
-- discarding older urgent or otherwise valid content.

create or replace function public.get_masjid_display_jumuah_window(
  p_start_date date,
  p_end_date date
)
returns jsonb
language plpgsql
stable
security invoker
set search_path = public, pg_temp
as $$
declare
  result jsonb;
begin
  if exists (
    select 1
    from public.jumuah_times as j
    where j.published is true
      and j.date >= p_start_date
      and j.date <= p_end_date
      and pg_column_size(to_jsonb(j)) > 16384
  ) then
    raise exception 'Masjid Display Jumuah source row exceeds maximum size';
  end if;

  select coalesce(
    jsonb_agg(to_jsonb(bounded) order by bounded.date asc, bounded.prayer_time asc, bounded.id asc),
    '[]'::jsonb
  )
  into result
  from (
    select j.*
    from public.jumuah_times as j
    where j.published is true
      and j.date >= p_start_date
      and j.date <= p_end_date
    order by j.date asc, j.prayer_time asc, j.id asc
    limit 65
  ) as bounded;

  return result;
end;
$$;

create or replace function public.get_masjid_display_announcements_window(
  p_now timestamptz,
  p_horizon_end timestamptz
)
returns jsonb
language plpgsql
stable
security invoker
set search_path = public, pg_temp
as $$
declare
  result jsonb;
begin
  if exists (
    select 1
    from public.announcements as a
    where a.published is true
      and (a.display_until is null or a.display_until >= p_now)
      and (a.display_from is null or a.display_from <= p_horizon_end)
      and pg_column_size(to_jsonb(a)) > 16384
  ) then
    raise exception 'Masjid Display announcement source row exceeds maximum size';
  end if;

  select coalesce(
    jsonb_agg(to_jsonb(bounded) order by bounded.created_at desc, bounded.id asc),
    '[]'::jsonb
  )
  into result
  from (
    select a.*
    from public.announcements as a
    where a.published is true
      and (a.display_until is null or a.display_until >= p_now)
      and (a.display_from is null or a.display_from <= p_horizon_end)
    order by a.created_at desc, a.id asc
    limit 65
  ) as bounded;

  return result;
end;
$$;

create or replace function public.get_masjid_display_events_window(
  p_start_date date,
  p_end_date date
)
returns jsonb
language plpgsql
stable
security invoker
set search_path = public, pg_temp
as $$
declare
  result jsonb;
begin
  if exists (
    select 1
    from public.events as e
    where e.published is true
      and e.date >= p_start_date
      and e.date <= p_end_date
      and pg_column_size(to_jsonb(e)) > 16384
  ) then
    raise exception 'Masjid Display event source row exceeds maximum size';
  end if;

  select coalesce(
    jsonb_agg(to_jsonb(bounded) order by bounded.date asc, bounded.start_time asc, bounded.id asc),
    '[]'::jsonb
  )
  into result
  from (
    select e.*
    from public.events as e
    where e.published is true
      and e.date >= p_start_date
      and e.date <= p_end_date
    order by e.date asc, e.start_time asc, e.id asc
    limit 129
  ) as bounded;

  return result;
end;
$$;

create or replace function public.get_masjid_display_campaigns_window(
  p_start_date date,
  p_end_date date
)
returns jsonb
language plpgsql
stable
security invoker
set search_path = public, pg_temp
as $$
declare
  result jsonb;
begin
  if exists (
    select 1
    from public.donation_campaigns as c
    where c.is_active is true
      and c.start_date <= p_end_date
      and (c.end_date is null or c.end_date >= p_start_date)
      and pg_column_size(to_jsonb(c)) > 16384
  ) then
    raise exception 'Masjid Display campaign source row exceeds maximum size';
  end if;

  select coalesce(
    jsonb_agg(to_jsonb(bounded) order by bounded.start_date asc, bounded.id asc),
    '[]'::jsonb
  )
  into result
  from (
    select c.*
    from public.donation_campaigns as c
    where c.is_active is true
      and c.start_date <= p_end_date
      and (c.end_date is null or c.end_date >= p_start_date)
    order by c.start_date asc, c.id asc
    limit 65
  ) as bounded;

  return result;
end;
$$;

revoke all on function public.get_masjid_display_jumuah_window(date, date) from public;
revoke all on function public.get_masjid_display_announcements_window(timestamptz, timestamptz) from public;
revoke all on function public.get_masjid_display_events_window(date, date) from public;
revoke all on function public.get_masjid_display_campaigns_window(date, date) from public;

grant execute on function public.get_masjid_display_jumuah_window(date, date) to anon, authenticated, service_role;
grant execute on function public.get_masjid_display_announcements_window(timestamptz, timestamptz) to anon, authenticated, service_role;
grant execute on function public.get_masjid_display_events_window(date, date) to anon, authenticated, service_role;
grant execute on function public.get_masjid_display_campaigns_window(date, date) to anon, authenticated, service_role;
