create table public.masjid_display_feed_revision (
  id text primary key check (id = '1'),
  updated_at timestamptz not null default clock_timestamp()
);

insert into public.masjid_display_feed_revision (id, updated_at)
values ('1', clock_timestamp())
on conflict (id) do nothing;

alter table public.masjid_display_feed_revision enable row level security;
revoke all on table public.masjid_display_feed_revision from anon, authenticated;
grant select on table public.masjid_display_feed_revision to service_role;

create or replace function public.touch_masjid_display_feed_revision()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  update public.masjid_display_feed_revision
  set updated_at = greatest(clock_timestamp(), updated_at + interval '1 microsecond')
  where id = '1';
  return null;
end;
$$;

revoke all on function public.touch_masjid_display_feed_revision() from public, anon, authenticated;

-- The revision is intentionally source-wide rather than request-time-derived.
-- Any authoritative mutation invalidates the immutable feed representation,
-- including DELETE operations that row timestamps cannot represent.
drop trigger if exists masjid_display_feed_revision_prayer_times on public.prayer_times;
create trigger masjid_display_feed_revision_prayer_times
after insert or update or delete on public.prayer_times
for each statement execute function public.touch_masjid_display_feed_revision();

drop trigger if exists masjid_display_feed_revision_prayer_settings on public.prayer_settings;
create trigger masjid_display_feed_revision_prayer_settings
after insert or update or delete on public.prayer_settings
for each statement execute function public.touch_masjid_display_feed_revision();

drop trigger if exists masjid_display_feed_revision_jumuah_times on public.jumuah_times;
create trigger masjid_display_feed_revision_jumuah_times
after insert or update or delete on public.jumuah_times
for each statement execute function public.touch_masjid_display_feed_revision();

drop trigger if exists masjid_display_feed_revision_announcements on public.announcements;
create trigger masjid_display_feed_revision_announcements
after insert or update or delete on public.announcements
for each statement execute function public.touch_masjid_display_feed_revision();

drop trigger if exists masjid_display_feed_revision_events on public.events;
create trigger masjid_display_feed_revision_events
after insert or update or delete on public.events
for each statement execute function public.touch_masjid_display_feed_revision();

drop trigger if exists masjid_display_feed_revision_donation_campaigns on public.donation_campaigns;
create trigger masjid_display_feed_revision_donation_campaigns
after insert or update or delete on public.donation_campaigns
for each statement execute function public.touch_masjid_display_feed_revision();

drop trigger if exists masjid_display_feed_revision_mosque_settings on public.mosque_settings;
create trigger masjid_display_feed_revision_mosque_settings
after insert or update or delete on public.mosque_settings
for each statement execute function public.touch_masjid_display_feed_revision();

drop trigger if exists masjid_display_feed_revision_masjid_display_settings on public.masjid_display_settings;
create trigger masjid_display_feed_revision_masjid_display_settings
after insert or update or delete on public.masjid_display_settings
for each statement execute function public.touch_masjid_display_feed_revision();
