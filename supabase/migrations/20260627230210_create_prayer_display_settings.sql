-- Phase 2: daily public prayer display settings.
-- Fajr and Maghrib jamaah times reuse the existing *_iqama columns.

alter table public.prayer_times
  add column if not exists maghrib_program_enabled boolean not null default false,
  add column if not exists maghrib_lesson_title text,
  add column if not exists maghrib_lesson_duration_minutes integer,
  add column if not exists maghrib_combined_isha_time text;

alter table public.prayer_times
  drop constraint if exists prayer_times_maghrib_program_format;

alter table public.prayer_times
  add constraint prayer_times_maghrib_program_format check (
    (maghrib_combined_isha_time is null or maghrib_combined_isha_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$')
    and (maghrib_lesson_duration_minutes is null or maghrib_lesson_duration_minutes between 1 and 240)
    and (maghrib_lesson_title is null or char_length(maghrib_lesson_title) <= 160)
  );

comment on column public.prayer_times.maghrib_program_enabled is
  'Controls whether the optional Maghrib lesson and combined Isha program is shown publicly.';
comment on column public.prayer_times.maghrib_combined_isha_time is
  'Combined Isha jamaah time in the Maghrib program; never replaces the official Isha azan.';
