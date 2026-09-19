-- Plan 5 Masjid Display: bound public Feed snapshot readers.
--
-- The public Feed already uses a fixed date horizon. These readers also cap
-- the number and per-row serialized size of dynamic records so an accidental
-- accumulation of published content cannot produce an unbounded database
-- result. The Feed builder independently enforces a 128 KiB serialized ceiling
-- and fails closed instead of truncating rendered content.

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
    jsonb_agg(to_jsonb(bounded) order by bounded.date asc, bounded.prayer_time asc, bounded.id asc),
    '[]'::jsonb
  )
  from (
    select j.*
    from public.jumuah_times as j
    where j.published is true
      and j.date >= p_start_date
      and j.date <= p_end_date
      and pg_column_size(to_jsonb(j)) <= 16384
    order by j.date asc, j.prayer_time asc, j.id asc
    limit 64
  ) as bounded;
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
    jsonb_agg(to_jsonb(bounded) order by bounded.created_at desc, bounded.id asc),
    '[]'::jsonb
  )
  from (
    select a.*
    from public.announcements as a
    where a.published is true
      and (a.display_until is null or a.display_until >= p_now)
      and (a.display_from is null or a.display_from <= p_horizon_end)
      and pg_column_size(to_jsonb(a)) <= 16384
    order by a.created_at desc, a.id asc
    limit 64
  ) as bounded;
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
    jsonb_agg(to_jsonb(bounded) order by bounded.date asc, bounded.start_time asc, bounded.id asc),
    '[]'::jsonb
  )
  from (
    select e.*
    from public.events as e
    where e.published is true
      and e.date >= p_start_date
      and e.date <= p_end_date
      and pg_column_size(to_jsonb(e)) <= 16384
    order by e.date asc, e.start_time asc, e.id asc
    limit 128
  ) as bounded;
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
    jsonb_agg(to_jsonb(bounded) order by bounded.start_date asc, bounded.id asc),
    '[]'::jsonb
  )
  from (
    select c.*
    from public.donation_campaigns as c
    where c.is_active is true
      and c.start_date <= p_end_date
      and (c.end_date is null or c.end_date >= p_start_date)
      and pg_column_size(to_jsonb(c)) <= 16384
    order by c.start_date asc, c.id asc
    limit 64
  ) as bounded;
$$;

revoke all on function public.get_masjid_display_jumuah_window(date, date) from public;
revoke all on function public.get_masjid_display_announcements_window(timestamptz, timestamptz) from public;
revoke all on function public.get_masjid_display_events_window(date, date) from public;
revoke all on function public.get_masjid_display_campaigns_window(date, date) from public;

grant execute on function public.get_masjid_display_jumuah_window(date, date) to anon, authenticated, service_role;
grant execute on function public.get_masjid_display_announcements_window(timestamptz, timestamptz) to anon, authenticated, service_role;
grant execute on function public.get_masjid_display_events_window(date, date) to anon, authenticated, service_role;
grant execute on function public.get_masjid_display_campaigns_window(date, date) to anon, authenticated, service_role;
