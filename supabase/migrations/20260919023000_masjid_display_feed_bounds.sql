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

create index if not exists idx_masjid_display_announcements_published_overlap
  on public.announcements
  using gist (tstzrange(display_from, display_until, '[]'))
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
    select
      jsonb_build_object(
        'id', j.id,
        'date', j.date,
        'khutbah_time', j.khutbah_time,
        'prayer_time', j.prayer_time,
        'location_name', j.location_name,
        'location_address', j.location_address,
        'khateeb_name', j.khateeb_name,
        'language', case when nullif(btrim(j.language_ar), '') is null then j.language else null end,
        'language_ar', j.language_ar,
        'language_de', j.language_de,
        'notes', case when nullif(btrim(j.notes_ar), '') is null then j.notes else null end,
        'notes_ar', j.notes_ar,
        'notes_de', j.notes_de,
        'published', j.published,
        'updated_at', j.updated_at
      ) as row_json,
      j.date,
      j.prayer_time,
      j.id
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
      and tstzrange(a.display_from, a.display_until, '[]')
        && tstzrange(p_now, p_horizon_end, '[]')
    limit 65
  )
  select coalesce(array_agg(id), array[]::uuid[]), count(*)::integer
  into source_ids, source_count
  from bounded;

  if source_count > 64 then
    raise exception 'Masjid Display announcement source exceeds maximum row count';
  end if;

  with selected as (
    select
      jsonb_build_object(
        'id', a.id,
        'title', case when nullif(btrim(a.title_ar), '') is null then a.title else null end,
        'title_ar', a.title_ar,
        'title_de', a.title_de,
        'message', case when nullif(btrim(a.message_ar), '') is null then a.message else null end,
        'message_ar', a.message_ar,
        'message_de', a.message_de,
        'type', a.type,
        'is_urgent', a.is_urgent,
        'display_style', a.display_style,
        'display_from', a.display_from,
        'display_until', a.display_until,
        'published', a.published,
        'created_at', a.created_at,
        'updated_at', a.updated_at
      ) as row_json,
      a.created_at,
      a.id
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
    select
      jsonb_build_object(
        'id', e.id,
        'title', case when nullif(btrim(e.title_ar), '') is null then e.title else null end,
        'title_ar', e.title_ar,
        'title_de', e.title_de,
        'description', case when nullif(btrim(e.description_ar), '') is null then e.description else null end,
        'description_ar', e.description_ar,
        'description_de', e.description_de,
        'location', case when nullif(btrim(e.location_ar), '') is null then e.location else null end,
        'location_ar', e.location_ar,
        'location_de', e.location_de,
        'date', e.date,
        'start_time', e.start_time,
        'end_time', e.end_time,
        'type', e.type,
        'published', e.published,
        'updated_at', e.updated_at
      ) as row_json,
      e.date,
      e.start_time,
      e.id
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
    select
      jsonb_build_object(
        'id', c.id,
        'title', case when nullif(btrim(c.title_ar), '') is null then c.title else null end,
        'title_ar', c.title_ar,
        'title_de', c.title_de,
        'description', case when nullif(btrim(c.description_ar), '') is null then c.description else null end,
        'description_ar', c.description_ar,
        'description_de', c.description_de,
        'target_amount', c.target_amount,
        'collected_amount', c.collected_amount,
        'start_date', c.start_date,
        'end_date', c.end_date,
        'donation_url', c.donation_url,
        'is_active', c.is_active,
        'is_featured', c.is_featured,
        'updated_at', c.updated_at
      ) as row_json,
      c.start_date,
      c.id
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


-- Keep Admin/direct writes from creating a collection of individually valid
-- rows that collectively exceeds the Feed's reserved dynamic-content budget.
-- The statement-level trigger is shared by all dynamic source tables and uses
-- one transaction advisory lock so concurrent content mutations serialize
-- their aggregate-capacity check.
create or replace function public.enforce_masjid_display_dynamic_content_budget()
returns trigger
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  total_bytes bigint;
  p_now timestamptz := now();
  p_today date := (now() at time zone 'Europe/Berlin')::date;
  p_end_date date := (now() at time zone 'Europe/Berlin')::date + 35;
  p_horizon_end timestamptz :=
    ((((now() at time zone 'Europe/Berlin')::date + 36)::timestamp)
      at time zone 'Europe/Berlin') - interval '1 millisecond';
begin
  perform pg_advisory_xact_lock(hashtext('masjid_display_dynamic_content_budget'));

  with dynamic_rows as (
    select jsonb_build_object(
      'id', j.id,
      'date', j.date,
      'prayerTime', j.prayer_time
    ) as row_json
    from public.jumuah_times as j
    where j.published is true
      and j.date >= p_today - 1
      and j.date <= p_end_date

    union all

    select jsonb_build_object(
      'id', a.id,
      'titleAr', coalesce(nullif(btrim(a.title_ar), ''), btrim(a.title)),
      'titleDe', btrim(a.title_de),
      'messageAr', coalesce(nullif(btrim(a.message_ar), ''), btrim(a.message)),
      'messageDe', btrim(a.message_de),
      'isUrgent', a.is_urgent,
      'displayStyle', a.display_style,
      'displayFrom', a.display_from,
      'displayUntil', a.display_until
    ) as row_json
    from public.announcements as a
    where a.published is true
      and tstzrange(a.display_from, a.display_until, '[]')
        && tstzrange(p_now, p_horizon_end, '[]')

    union all

    select jsonb_build_object(
      'id', e.id,
      'titleAr', coalesce(nullif(btrim(e.title_ar), ''), btrim(e.title)),
      'titleDe', btrim(e.title_de),
      'descriptionAr', coalesce(nullif(btrim(e.description_ar), ''), btrim(e.description)),
      'descriptionDe', btrim(e.description_de),
      'locationAr', coalesce(nullif(btrim(e.location_ar), ''), btrim(e.location)),
      'locationDe', btrim(e.location_de),
      'date', e.date,
      'startTime', e.start_time,
      'endTime', e.end_time,
      'type', e.type
    ) as row_json
    from public.events as e
    where e.published is true
      and e.date >= p_today
      and e.date <= p_end_date

    union all

    select jsonb_build_object(
      'id', c.id,
      'titleAr', coalesce(nullif(btrim(c.title_ar), ''), btrim(c.title)),
      'titleDe', btrim(c.title_de),
      'descriptionAr', coalesce(nullif(btrim(c.description_ar), ''), btrim(c.description)),
      'descriptionDe', btrim(c.description_de),
      'targetAmount', c.target_amount,
      'collectedAmount', c.collected_amount,
      'startDate', c.start_date,
      'endDate', c.end_date,
      'donationUrl', c.donation_url,
      'isFeatured', c.is_featured
    ) as row_json
    from public.donation_campaigns as c
    where c.is_active is true
      and daterange(c.start_date, c.end_date, '[]')
        && daterange(p_today, p_end_date, '[]')
  )
  select coalesce(sum(octet_length(row_json::text)), 0)
  into total_bytes
  from dynamic_rows;

  if total_bytes > 64 * 1024 then
    raise exception 'Masjid Display dynamic content exceeds aggregate budget of 65536 bytes';
  end if;

  return null;
end;
$$;

revoke all on function public.enforce_masjid_display_dynamic_content_budget() from public, anon, authenticated;
grant execute on function public.enforce_masjid_display_dynamic_content_budget() to service_role;

drop trigger if exists trg_masjid_display_dynamic_budget_announcements on public.announcements;
create trigger trg_masjid_display_dynamic_budget_announcements
after insert or update or delete on public.announcements
for each statement execute function public.enforce_masjid_display_dynamic_content_budget();

drop trigger if exists trg_masjid_display_dynamic_budget_events on public.events;
create trigger trg_masjid_display_dynamic_budget_events
after insert or update or delete on public.events
for each statement execute function public.enforce_masjid_display_dynamic_content_budget();

drop trigger if exists trg_masjid_display_dynamic_budget_campaigns on public.donation_campaigns;
create trigger trg_masjid_display_dynamic_budget_campaigns
after insert or update or delete on public.donation_campaigns
for each statement execute function public.enforce_masjid_display_dynamic_content_budget();

drop trigger if exists trg_masjid_display_dynamic_budget_jumuah on public.jumuah_times;
create trigger trg_masjid_display_dynamic_budget_jumuah
after insert or update or delete on public.jumuah_times
for each statement execute function public.enforce_masjid_display_dynamic_content_budget();
