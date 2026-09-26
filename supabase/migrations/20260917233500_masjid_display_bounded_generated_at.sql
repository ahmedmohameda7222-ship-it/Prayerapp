-- Plan 3 generatedAt is derived from the exact source rows represented by the
-- current feed. Keep row timestamps reliable, including announcements, and
-- retire the source-wide revision clock that was invalidated by unrelated rows.

alter table public.announcements
  add column if not exists updated_at timestamptz;

update public.announcements
set updated_at = coalesce(updated_at, created_at, clock_timestamp())
where updated_at is null;

alter table public.announcements
  alter column updated_at set default now(),
  alter column updated_at set not null;

-- All represented database authorities must expose a non-null row timestamp.
update public.prayer_times set updated_at = clock_timestamp() where updated_at is null;
update public.prayer_settings set updated_at = clock_timestamp() where updated_at is null;
update public.jumuah_times set updated_at = clock_timestamp() where updated_at is null;
update public.events set updated_at = clock_timestamp() where updated_at is null;
update public.donation_campaigns set updated_at = clock_timestamp() where updated_at is null;
update public.mosque_settings set updated_at = clock_timestamp() where updated_at is null;
update public.masjid_display_settings set updated_at = clock_timestamp() where updated_at is null;

alter table public.prayer_times alter column updated_at set not null;
alter table public.prayer_settings alter column updated_at set not null;
alter table public.jumuah_times alter column updated_at set not null;
alter table public.events alter column updated_at set not null;
alter table public.donation_campaigns alter column updated_at set not null;
alter table public.mosque_settings alter column updated_at set not null;
alter table public.masjid_display_settings alter column updated_at set not null;

create or replace function public.touch_masjid_display_source_updated_at()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  -- Do not churn generatedAt for a no-op write that only supplies a fresh
  -- updated_at value. Any real source-row mutation advances monotonically.
  if (to_jsonb(new) - 'updated_at') is distinct from (to_jsonb(old) - 'updated_at') then
    new.updated_at := greatest(clock_timestamp(), old.updated_at + interval '1 microsecond');
  else
    new.updated_at := old.updated_at;
  end if;
  return new;
end;
$$;

revoke all on function public.touch_masjid_display_source_updated_at() from public, anon, authenticated;
grant execute on function public.touch_masjid_display_source_updated_at() to service_role;

drop trigger if exists masjid_display_source_updated_at_prayer_times on public.prayer_times;
create trigger masjid_display_source_updated_at_prayer_times
before update on public.prayer_times
for each row execute function public.touch_masjid_display_source_updated_at();

drop trigger if exists masjid_display_source_updated_at_prayer_settings on public.prayer_settings;
create trigger masjid_display_source_updated_at_prayer_settings
before update on public.prayer_settings
for each row execute function public.touch_masjid_display_source_updated_at();

drop trigger if exists masjid_display_source_updated_at_jumuah_times on public.jumuah_times;
create trigger masjid_display_source_updated_at_jumuah_times
before update on public.jumuah_times
for each row execute function public.touch_masjid_display_source_updated_at();

drop trigger if exists masjid_display_source_updated_at_announcements on public.announcements;
create trigger masjid_display_source_updated_at_announcements
before update on public.announcements
for each row execute function public.touch_masjid_display_source_updated_at();

drop trigger if exists masjid_display_source_updated_at_events on public.events;
create trigger masjid_display_source_updated_at_events
before update on public.events
for each row execute function public.touch_masjid_display_source_updated_at();

drop trigger if exists masjid_display_source_updated_at_donation_campaigns on public.donation_campaigns;
create trigger masjid_display_source_updated_at_donation_campaigns
before update on public.donation_campaigns
for each row execute function public.touch_masjid_display_source_updated_at();

drop trigger if exists masjid_display_source_updated_at_mosque_settings on public.mosque_settings;
create trigger masjid_display_source_updated_at_mosque_settings
before update on public.mosque_settings
for each row execute function public.touch_masjid_display_source_updated_at();

drop trigger if exists masjid_display_source_updated_at_masjid_display_settings on public.masjid_display_settings;
create trigger masjid_display_source_updated_at_masjid_display_settings
before update on public.masjid_display_settings
for each row execute function public.touch_masjid_display_source_updated_at();

-- Retire the broad Plan 3 revision clock. It advanced for out-of-window rows,
-- which made an otherwise identical semantic feed produce a new body/ETag.
drop trigger if exists masjid_display_feed_revision_prayer_times on public.prayer_times;
drop trigger if exists masjid_display_feed_revision_prayer_settings on public.prayer_settings;
drop trigger if exists masjid_display_feed_revision_jumuah_times on public.jumuah_times;
drop trigger if exists masjid_display_feed_revision_announcements on public.announcements;
drop trigger if exists masjid_display_feed_revision_events on public.events;
drop trigger if exists masjid_display_feed_revision_donation_campaigns on public.donation_campaigns;
drop trigger if exists masjid_display_feed_revision_mosque_settings on public.mosque_settings;
drop trigger if exists masjid_display_feed_revision_masjid_display_settings on public.masjid_display_settings;

drop function if exists public.touch_masjid_display_feed_revision();
drop table if exists public.masjid_display_feed_revision;
