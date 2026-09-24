-- Plan 6 pre-merge production compatibility/bootstrap.
--
-- This migration deliberately preserves the five legacy absolute-Iqama
-- columns. Runtime authority remains final canonical prayer start + shared
-- delay; the legacy fields are compatibility-only until a later explicitly
-- approved destructive plan removes them.
--
-- The ADD COLUMN IF NOT EXISTS clauses also normalize disposable/staging
-- environments that previously executed the older destructive form of
-- 20260915223000. Production targets that still have the original columns and
-- values are not rewritten.
alter table public.prayer_times
  add column if not exists fajr_iqama text,
  add column if not exists dhuhr_iqama text,
  add column if not exists asr_iqama text,
  add column if not exists maghrib_iqama text,
  add column if not exists isha_iqama text;

comment on column public.prayer_times.fajr_iqama is
  'Legacy compatibility field retained physically during Plan 6; not runtime Iqama authority.';
comment on column public.prayer_times.dhuhr_iqama is
  'Legacy compatibility field retained physically during Plan 6; not runtime Iqama authority.';
comment on column public.prayer_times.asr_iqama is
  'Legacy compatibility field retained physically during Plan 6; not runtime Iqama authority.';
comment on column public.prayer_times.maghrib_iqama is
  'Legacy compatibility field retained physically during Plan 6; not runtime Iqama authority.';
comment on column public.prayer_times.isha_iqama is
  'Legacy compatibility field retained physically during Plan 6; not runtime Iqama authority.';

-- Allow one setup-incomplete singleton to carry runtime-safe authority without
-- inventing a mosque-specific calculation profile. Existing configured rows
-- are marked configured by the default; only the bootstrap row below is false.
alter table public.prayer_settings
  add column if not exists profile_configured boolean not null default true,
  alter column latitude drop not null,
  alter column longitude drop not null,
  alter column fajr_angle drop not null,
  alter column isha_rule drop not null,
  alter column asr_shadow_factor drop not null,
  alter column high_latitude_rule drop not null;

-- Bootstrap runtime authority only when no row exists.
--
-- Europe/Berlin is the approved existing application/applied schedule timezone.
-- Shared Iqama delays 20/15/15/5/10 are the existing certified cutover delays
-- and match the most recent populated legacy production rows. Calculation
-- parameters remain NULL/unconfigured until an operator explicitly saves a
-- reviewed profile. Existing canonical prayer_times remain live authority and
-- no historical prayer row is rewritten by this bootstrap.
insert into public.prayer_settings (
  id,
  latitude,
  longitude,
  timezone,
  fajr_angle,
  isha_rule,
  isha_angle,
  isha_minutes_after_maghrib,
  asr_shadow_factor,
  high_latitude_rule,
  fajr_offset_minutes,
  sunrise_offset_minutes,
  dhuhr_offset_minutes,
  asr_offset_minutes,
  maghrib_offset_minutes,
  isha_offset_minutes,
  fajr_iqama_delay_minutes,
  dhuhr_iqama_delay_minutes,
  asr_iqama_delay_minutes,
  maghrib_iqama_delay_minutes,
  isha_iqama_delay_minutes,
  calculation_revision,
  applied_calculation_revision,
  row_revision,
  applied_timezone,
  profile_configured,
  updated_at
)
values (
  '1',
  null,
  null,
  'Europe/Berlin',
  null,
  null,
  null,
  null,
  null,
  null,
  0, 0, 0, 0, 0, 0,
  20, 15, 15, 5, 10,
  1,
  0,
  1,
  'Europe/Berlin',
  false,
  now()
)
on conflict (id) do nothing;

-- Masjid Display Admin already exposes these exact defaults when no row exists.
-- Persisting them makes the post-merge Feed contract satisfiable immediately
-- without inventing production content or Azkar selections.
insert into public.masjid_display_settings (
  id,
  fajr_prayer_duration_minutes,
  dhuhr_prayer_duration_minutes,
  asr_prayer_duration_minutes,
  maghrib_prayer_duration_minutes,
  isha_prayer_duration_minutes,
  azkar_playlist_ids,
  updated_at
)
values ('1', 10, 10, 10, 10, 10, '{}'::text[], now())
on conflict (id) do nothing;

-- The canonical Prayerapp production URL is required for the persistent TV QR
-- and Test Control. Preserve any operator-provided value; fill only a missing
-- or blank singleton value.
update public.mosque_settings
set public_app_url = 'https://donaumoschee.vercel.app'
where id = '1'
  and coalesce(btrim(public_app_url), '') = '';

do $$
declare
  v_legacy_column_count integer;
begin
  select count(*)
  into v_legacy_column_count
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'prayer_times'
    and column_name in (
      'fajr_iqama',
      'dhuhr_iqama',
      'asr_iqama',
      'maghrib_iqama',
      'isha_iqama'
    );

  if v_legacy_column_count <> 5 then
    raise exception 'Plan 6 compatibility bootstrap did not retain all five legacy Iqama columns';
  end if;

  if not exists (
    select 1
    from public.prayer_settings
    where id = '1'
      and applied_timezone = 'Europe/Berlin'
      and calculation_revision = 1
      and applied_calculation_revision = 0
      and profile_configured is false
      and latitude is null
      and longitude is null
      and fajr_angle is null
      and isha_rule is null
      and asr_shadow_factor is null
      and high_latitude_rule is null
      and fajr_iqama_delay_minutes between 0 and 180
      and dhuhr_iqama_delay_minutes between 0 and 180
      and asr_iqama_delay_minutes between 0 and 180
      and maghrib_iqama_delay_minutes between 0 and 180
      and isha_iqama_delay_minutes between 0 and 180
  ) then
    raise exception 'Plan 6 Prayer Engine runtime singleton bootstrap is incomplete';
  end if;

  if not exists (
    select 1
    from public.masjid_display_settings
    where id = '1'
  ) then
    raise exception 'Plan 6 Masjid Display settings singleton bootstrap is incomplete';
  end if;

  if not exists (
    select 1
    from public.mosque_settings
    where id = '1'
      and public_app_url ~ '^https://'
  ) then
    raise exception 'Plan 6 Prayerapp public URL bootstrap is incomplete';
  end if;
end
$$;
