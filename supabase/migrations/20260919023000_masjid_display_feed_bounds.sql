-- Plan 5 Masjid Display: fail-closed bounds for public Feed snapshot readers.
--
-- Public readers validate the requested horizon, use predicate indexes to
-- find at most max+1 matching IDs without sorting, fail on overflow, and only
-- then serialize/order that bounded ID set. This prevents anonymous callers
-- from forcing an unbounded sort/JSON pass while also avoiding silent
-- truncation of active content.

create index if not exists idx_masjid_display_jumuah_published_date
  on public.jumuah_times (date, id)
  where published is true;

create index if not exists idx_masjid_display_announcements_published_window
  on public.announcements (
    (coalesce(display_until, 'infinity'::timestamptz)),
    (coalesce(display_from, '-infinity'::timestamptz)),
    id
  )
  where published is true;

create index if not exists idx_masjid_display_events_published_date
  on public.events (date, id)
  where published is true;

create index if not exists idx_masjid_display_campaigns_active_overlap
  on public.donation_campaigns
  using gist (daterange(start_date, end_date, '[]'))
  where is_active is true;

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
  source_ids uuid[];
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
    select j.id
    from public.jumuah_times as j
    where j.published is true
      and j.date >= p_start_date
      and j.date <= p_end_date
    limit 65
  )
  select coalesce(array_agg(id), array[]::uuid[]), count(*)::integer
  into source_ids, source_count
  from bounded;

  if source_count > 64 then
    raise exception 'Masjid Display Jumuah source exceeds maximum row count';
  end if;

  with selected as (
    select to_jsonb(j) as row_json, j.date, j.prayer_time, j.id
    from public.jumuah_times as j
    where j.id = any(source_ids)
  )
  select
    coalesce(max(pg_column_size(row_json)), 0)::integer,
    coalesce(jsonb_agg(row_json order by date asc, prayer_time asc, id asc), '[]'::jsonb)
  into max_source_bytes, result
  from selected;

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
  source_ids uuid[];
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
    select a.id
    from public.announcements as a
    where a.published is true
      and coalesce(a.display_until, 'infinity'::timestamptz) >= p_now
      and coalesce(a.display_from, '-infinity'::timestamptz) <= p_horizon_end
    limit 65
  )
  select coalesce(array_agg(id), array[]::uuid[]), count(*)::integer
  into source_ids, source_count
  from bounded;

  if source_count > 64 then
    raise exception 'Masjid Display announcement source exceeds maximum row count';
  end if;

  with selected as (
    select to_jsonb(a) as row_json, a.created_at, a.id
    from public.announcements as a
    where a.id = any(source_ids)
  )
  select
    coalesce(max(pg_column_size(row_json)), 0)::integer,
    coalesce(jsonb_agg(row_json order by created_at desc, id asc), '[]'::jsonb)
  into max_source_bytes, result
  from selected;

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
  source_ids uuid[];
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
    select e.id
    from public.events as e
    where e.published is true
      and e.date >= p_start_date
      and e.date <= p_end_date
    limit 129
  )
  select coalesce(array_agg(id), array[]::uuid[]), count(*)::integer
  into source_ids, source_count
  from bounded;

  if source_count > 128 then
    raise exception 'Masjid Display event source exceeds maximum row count';
  end if;

  with selected as (
    select to_jsonb(e) as row_json, e.date, e.start_time, e.id
    from public.events as e
    where e.id = any(source_ids)
  )
  select
    coalesce(max(pg_column_size(row_json)), 0)::integer,
    coalesce(jsonb_agg(row_json order by date asc, start_time asc, id asc), '[]'::jsonb)
  into max_source_bytes, result
  from selected;

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
  source_ids uuid[];
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
    select c.id
    from public.donation_campaigns as c
    where c.is_active is true
      and daterange(c.start_date, c.end_date, '[]')
        && daterange(p_start_date, p_end_date, '[]')
    limit 65
  )
  select coalesce(array_agg(id), array[]::uuid[]), count(*)::integer
  into source_ids, source_count
  from bounded;

  if source_count > 64 then
    raise exception 'Masjid Display campaign source exceeds maximum row count';
  end if;

  with selected as (
    select to_jsonb(c) as row_json, c.start_date, c.id
    from public.donation_campaigns as c
    where c.id = any(source_ids)
  )
  select
    coalesce(max(pg_column_size(row_json)), 0)::integer,
    coalesce(jsonb_agg(row_json order by start_date asc, id asc), '[]'::jsonb)
  into max_source_bytes, result
  from selected;

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
