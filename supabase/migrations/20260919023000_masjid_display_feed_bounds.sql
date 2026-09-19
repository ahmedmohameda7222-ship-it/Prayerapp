-- Plan 5 Masjid Display: fail-closed bounds for public Feed snapshot readers.
--
-- Each public reader first rejects an invalid/broad requested horizon, then
-- materializes only max+1 matching rows before any JSON-size inspection. The
-- max+1 row proves overflow without silently truncating content. The bounded
-- set is then checked for the 16 KiB per-source-row ceiling, while the
-- server-side Feed builder independently enforces the same row limits and
-- final 128 KiB serialized Feed ceiling.

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
  source_count integer;
  max_source_bytes integer;
begin
  if p_start_date is null
     or p_end_date is null
     or p_end_date < p_start_date
     or p_end_date - p_start_date > 36 then
    raise exception 'Masjid Display Jumuah window is invalid or too broad';
  end if;

  with bounded as (
    select
      to_jsonb(j) as row_json,
      j.date,
      j.prayer_time,
      j.id
    from public.jumuah_times as j
    where j.published is true
      and j.date >= p_start_date
      and j.date <= p_end_date
    order by j.date asc, j.prayer_time asc, j.id asc
    limit 65
  )
  select
    count(*)::integer,
    coalesce(max(pg_column_size(row_json)), 0)::integer,
    coalesce(jsonb_agg(row_json order by date asc, prayer_time asc, id asc), '[]'::jsonb)
  into source_count, max_source_bytes, result
  from bounded;

  if source_count > 64 then
    raise exception 'Masjid Display Jumuah source exceeds maximum row count';
  end if;
  if max_source_bytes > 16384 then
    raise exception 'Masjid Display Jumuah source row exceeds maximum size';
  end if;

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
  source_count integer;
  max_source_bytes integer;
begin
  if p_now is null
     or p_horizon_end is null
     or p_horizon_end < p_now
     or p_horizon_end > p_now + interval '37 days' then
    raise exception 'Masjid Display announcement window is invalid or too broad';
  end if;

  with bounded as (
    select
      to_jsonb(a) as row_json,
      a.created_at,
      a.id
    from public.announcements as a
    where a.published is true
      and (a.display_until is null or a.display_until >= p_now)
      and (a.display_from is null or a.display_from <= p_horizon_end)
    order by a.created_at desc, a.id asc
    limit 65
  )
  select
    count(*)::integer,
    coalesce(max(pg_column_size(row_json)), 0)::integer,
    coalesce(jsonb_agg(row_json order by created_at desc, id asc), '[]'::jsonb)
  into source_count, max_source_bytes, result
  from bounded;

  if source_count > 64 then
    raise exception 'Masjid Display announcement source exceeds maximum row count';
  end if;
  if max_source_bytes > 16384 then
    raise exception 'Masjid Display announcement source row exceeds maximum size';
  end if;

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
  source_count integer;
  max_source_bytes integer;
begin
  if p_start_date is null
     or p_end_date is null
     or p_end_date < p_start_date
     or p_end_date - p_start_date > 36 then
    raise exception 'Masjid Display event window is invalid or too broad';
  end if;

  with bounded as (
    select
      to_jsonb(e) as row_json,
      e.date,
      e.start_time,
      e.id
    from public.events as e
    where e.published is true
      and e.date >= p_start_date
      and e.date <= p_end_date
    order by e.date asc, e.start_time asc, e.id asc
    limit 129
  )
  select
    count(*)::integer,
    coalesce(max(pg_column_size(row_json)), 0)::integer,
    coalesce(jsonb_agg(row_json order by date asc, start_time asc, id asc), '[]'::jsonb)
  into source_count, max_source_bytes, result
  from bounded;

  if source_count > 128 then
    raise exception 'Masjid Display event source exceeds maximum row count';
  end if;
  if max_source_bytes > 16384 then
    raise exception 'Masjid Display event source row exceeds maximum size';
  end if;

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
  source_count integer;
  max_source_bytes integer;
begin
  if p_start_date is null
     or p_end_date is null
     or p_end_date < p_start_date
     or p_end_date - p_start_date > 36 then
    raise exception 'Masjid Display campaign window is invalid or too broad';
  end if;

  with bounded as (
    select
      to_jsonb(c) as row_json,
      c.start_date,
      c.id
    from public.donation_campaigns as c
    where c.is_active is true
      and c.start_date <= p_end_date
      and (c.end_date is null or c.end_date >= p_start_date)
    order by c.start_date asc, c.id asc
    limit 65
  )
  select
    count(*)::integer,
    coalesce(max(pg_column_size(row_json)), 0)::integer,
    coalesce(jsonb_agg(row_json order by start_date asc, id asc), '[]'::jsonb)
  into source_count, max_source_bytes, result
  from bounded;

  if source_count > 64 then
    raise exception 'Masjid Display campaign source exceeds maximum row count';
  end if;
  if max_source_bytes > 16384 then
    raise exception 'Masjid Display campaign source row exceeds maximum size';
  end if;

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
