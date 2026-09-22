-- Plan 6: keep the write-time dynamic-content capacity window aligned
-- with the timezone currently applied to the canonical prayer schedule.
-- A missing prayer_settings row retains the legacy Berlin default; once
-- settings exist, applied_timezone is the sole runtime date authority.

create or replace function public.assert_masjid_display_dynamic_content_budget()
returns void
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  total_bytes bigint;
  max_source_bytes integer;
  jumuah_count integer;
  announcement_count integer;
  event_count integer;
  campaign_count integer;
  p_now timestamptz := now();
  v_time_zone text;
  p_today date;
begin
  perform pg_advisory_xact_lock(hashtext('masjid_display_dynamic_content_budget'));

  select p.applied_timezone
  into v_time_zone
  from public.prayer_settings as p
  where p.id = '1';

  v_time_zone := coalesce(nullif(v_time_zone, ''), 'Europe/Berlin');
  p_today := (p_now at time zone v_time_zone)::date;

  with
  jumuah_rows as (
    select jsonb_build_object(
      'id', j.id,
      'date', j.date,
      'prayerTime', j.prayer_time
    ) as row_json
    from public.jumuah_times as j
    where j.published is true
      and j.date >= p_today - 1
  ),
  announcement_rows as (
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
      and (a.display_until is null or a.display_until >= p_now)
  ),
  event_rows as (
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
  ),
  campaign_rows as (
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
      and (c.end_date is null or c.end_date >= p_today)
  ),
  stats as (
    select
      (select count(*)::integer from jumuah_rows) as jumuah_count,
      (select count(*)::integer from announcement_rows) as announcement_count,
      (select count(*)::integer from event_rows) as event_count,
      (select count(*)::integer from campaign_rows) as campaign_count,
      greatest(
        coalesce((select max(octet_length(row_json::text)) from jumuah_rows), 0),
        coalesce((select max(octet_length(row_json::text)) from announcement_rows), 0),
        coalesce((select max(octet_length(row_json::text)) from event_rows), 0),
        coalesce((select max(octet_length(row_json::text)) from campaign_rows), 0)
      )::integer as max_source_bytes,
      octet_length(
        jsonb_build_object(
          'additionalJumuah', coalesce((select jsonb_agg(row_json) from jumuah_rows), '[]'::jsonb),
          'announcements', coalesce((select jsonb_agg(row_json) from announcement_rows), '[]'::jsonb),
          'events', coalesce((select jsonb_agg(row_json) from event_rows), '[]'::jsonb),
          'campaigns', coalesce((select jsonb_agg(row_json) from campaign_rows), '[]'::jsonb)
        )::text
      )::bigint as total_bytes
  )
  select
    stats.total_bytes,
    stats.max_source_bytes,
    stats.jumuah_count,
    stats.announcement_count,
    stats.event_count,
    stats.campaign_count
  into
    total_bytes,
    max_source_bytes,
    jumuah_count,
    announcement_count,
    event_count,
    campaign_count
  from stats;

  if jumuah_count > 64 then
    raise exception 'Masjid Display Jumuah source exceeds maximum future row count';
  end if;
  if announcement_count > 64 then
    raise exception 'Masjid Display announcement source exceeds maximum future row count';
  end if;
  if event_count > 128 then
    raise exception 'Masjid Display event source exceeds maximum future row count';
  end if;
  if campaign_count > 64 then
    raise exception 'Masjid Display campaign source exceeds maximum future row count';
  end if;
  if max_source_bytes > 16384 then
    raise exception 'Masjid Display dynamic source row exceeds maximum size';
  end if;
  if total_bytes > 32 * 1024 then
    raise exception 'Masjid Display dynamic content exceeds aggregate budget of 32768 bytes';
  end if;

  return;
end;
$$;

revoke all on function public.assert_masjid_display_dynamic_content_budget() from public, anon, authenticated;
grant execute on function public.assert_masjid_display_dynamic_content_budget() to service_role;
