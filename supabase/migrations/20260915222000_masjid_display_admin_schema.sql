create table public.masjid_display_settings (
  id text primary key check (id = '1'),
  fajr_prayer_duration_minutes integer not null check (fajr_prayer_duration_minutes between 2 and 120),
  dhuhr_prayer_duration_minutes integer not null check (dhuhr_prayer_duration_minutes between 2 and 120),
  asr_prayer_duration_minutes integer not null check (asr_prayer_duration_minutes between 2 and 120),
  maghrib_prayer_duration_minutes integer not null check (maghrib_prayer_duration_minutes between 2 and 120),
  isha_prayer_duration_minutes integer not null check (isha_prayer_duration_minutes between 2 and 120),
  azkar_playlist_ids text[] not null default '{}',
  updated_at timestamptz not null default now()
);

create table public.masjid_display_test_state (
  id text primary key check (id = '1'),
  enabled boolean not null default false,
  scenario text,
  payload jsonb,
  started_at timestamptz,
  expires_at timestamptz,
  updated_at timestamptz not null default now(),
  check (
    not enabled
    or (
      scenario is not null
      and payload is not null
      and started_at is not null
      and expires_at is not null
      and expires_at > started_at
    )
  )
);

alter table public.announcements
  add column display_style text not null default 'normal' check (display_style in ('normal', 'special')),
  add column display_from timestamptz,
  add column display_until timestamptz,
  add constraint announcements_display_window check (
    display_from is null or display_until is null or display_until > display_from
  );

alter table public.donation_campaigns
  alter column end_date drop not null,
  add column donation_url text;

alter table public.mosque_settings
  add column public_app_url text;

alter table public.masjid_display_settings enable row level security;
alter table public.masjid_display_test_state enable row level security;

revoke all on table public.masjid_display_settings from public, anon, authenticated;
revoke all on table public.masjid_display_test_state from public, anon, authenticated;

grant select, insert, update on table public.masjid_display_settings to service_role;
grant select, insert, update on table public.masjid_display_test_state to service_role;
