create table public.prayer_settings (
  id text primary key check (id = '1'),
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  timezone text not null,
  fajr_angle numeric not null check (fajr_angle > 0 and fajr_angle <= 30),
  isha_rule text not null check (isha_rule in ('angle', 'fixed_minutes')),
  isha_angle numeric check (isha_angle is null or (isha_angle > 0 and isha_angle <= 30)),
  isha_minutes_after_maghrib integer check (
    isha_minutes_after_maghrib is null
    or isha_minutes_after_maghrib between 0 and 240
  ),
  asr_shadow_factor integer not null check (asr_shadow_factor in (1, 2)),
  high_latitude_rule text not null check (
    high_latitude_rule in ('middle_of_night', 'seventh_of_night', 'twilight_angle')
  ),
  fajr_offset_minutes integer not null default 0 check (fajr_offset_minutes between -60 and 60),
  sunrise_offset_minutes integer not null default 0 check (sunrise_offset_minutes between -60 and 60),
  dhuhr_offset_minutes integer not null default 0 check (dhuhr_offset_minutes between -60 and 60),
  asr_offset_minutes integer not null default 0 check (asr_offset_minutes between -60 and 60),
  maghrib_offset_minutes integer not null default 0 check (maghrib_offset_minutes between -60 and 60),
  isha_offset_minutes integer not null default 0 check (isha_offset_minutes between -60 and 60),
  fajr_iqama_delay_minutes integer not null check (fajr_iqama_delay_minutes between 0 and 180),
  dhuhr_iqama_delay_minutes integer not null check (dhuhr_iqama_delay_minutes between 0 and 180),
  asr_iqama_delay_minutes integer not null check (asr_iqama_delay_minutes between 0 and 180),
  maghrib_iqama_delay_minutes integer not null check (maghrib_iqama_delay_minutes between 0 and 180),
  isha_iqama_delay_minutes integer not null check (isha_iqama_delay_minutes between 0 and 180),
  calculation_revision bigint not null default 1 check (calculation_revision >= 1),
  applied_calculation_revision bigint not null default 0 check (applied_calculation_revision >= 0),
  row_revision bigint not null default 1 check (row_revision >= 1),
  updated_at timestamptz not null default now(),
  check (
    (isha_rule = 'angle' and isha_angle is not null and isha_minutes_after_maghrib is null)
    or (
      isha_rule = 'fixed_minutes'
      and isha_angle is null
      and isha_minutes_after_maghrib is not null
    )
  )
);

alter table public.prayer_settings enable row level security;

revoke all on table public.prayer_settings from public, anon, authenticated;
grant select, insert, update on table public.prayer_settings to service_role;

comment on table public.prayer_settings is
  'Singleton explicit Prayerapp prayer calculation profile and shared Iqama delays. No production religious profile is seeded by migration.';
