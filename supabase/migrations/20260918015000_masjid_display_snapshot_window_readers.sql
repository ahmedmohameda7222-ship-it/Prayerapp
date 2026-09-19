-- Plan 3 Masjid Display: snapshot-safe bounded readers.
-- Each RPC returns one JSON value, so PostgREST max_rows cannot truncate the
-- bounded source set and every row in that source is read under one SQL snapshot.

create or replace function public.get_masjid_display_jumuah_window(
  p_start_date date,
  p_end_date date
)
returns jsonb
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select coalesce(
    jsonb_agg(to_jsonb(j) order by j.date asc, j.prayer_time asc, j.id asc),
    '[]'::jsonb
  )
  from public.jumuah_times as j
  where j.published is true
    and j.date >= p_start_date
    and j.date <= p_end_date;
$$;

create or replace function public.get_masjid_display_announcements_window(
  p_now timestamptz,
  p_horizon_end timestamptz
)
returns jsonb
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select coalesce(
    jsonb_agg(to_jsonb(a) order by a.created_at desc, a.id asc),
    '[]'::jsonb
  )
  from public.announcements as a
  where a.published is true
    and (a.display_until is null or a.display_until >= p_now)
    and (a.display_from is null or a.display_from <= p_horizon_end);
$$;

create or replace function public.get_masjid_display_events_window(
  p_start_date date,
  p_end_date date
)
returns jsonb
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select coalesce(
    jsonb_agg(to_jsonb(e) order by e.date asc, e.start_time asc, e.id asc),
    '[]'::jsonb
  )
  from public.events as e
  where e.published is true
    and e.date >= p_start_date
    and e.date <= p_end_date;
$$;

create or replace function public.get_masjid_display_campaigns_window(
  p_start_date date,
  p_end_date date
)
returns jsonb
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select coalesce(
    jsonb_agg(to_jsonb(c) order by c.start_date asc, c.id asc),
    '[]'::jsonb
  )
  from public.donation_campaigns as c
  where c.is_active is true
    and c.start_date <= p_end_date
    and (c.end_date is null or c.end_date >= p_start_date);
$$;

revoke all on function public.get_masjid_display_jumuah_window(date, date) from public;
revoke all on function public.get_masjid_display_announcements_window(timestamptz, timestamptz) from public;
revoke all on function public.get_masjid_display_events_window(date, date) from public;
revoke all on function public.get_masjid_display_campaigns_window(date, date) from public;

grant execute on function public.get_masjid_display_jumuah_window(date, date) to anon, authenticated, service_role;
grant execute on function public.get_masjid_display_announcements_window(timestamptz, timestamptz) to anon, authenticated, service_role;
grant execute on function public.get_masjid_display_events_window(date, date) to anon, authenticated, service_role;
grant execute on function public.get_masjid_display_campaigns_window(date, date) to anon, authenticated, service_role;
