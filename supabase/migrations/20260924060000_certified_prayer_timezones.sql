-- Certify the Prayer Engine timezone choices against every runtime that still
-- interprets IANA identifiers. Root/TV also carry the same rule probes.
do $$
declare
  v_zone text;
  v_zones constant text[] := array[
    'America/New_York',
    'Asia/Riyadh',
    'Asia/Tokyo',
    'Europe/Berlin',
    'UTC'
  ];
begin
  foreach v_zone in array v_zones loop
    if not exists (
      select 1
      from pg_catalog.pg_timezone_names
      where name = v_zone
    ) then
      raise exception 'certified prayer timezone % is unavailable in PostgreSQL tzdb', v_zone;
    end if;
  end loop;

  -- Berlin 2026/2027 transition fingerprints.
  if (timestamptz '2026-03-29 00:30:00+00' at time zone 'Europe/Berlin')
       is distinct from timestamp '2026-03-29 01:30:00'
     or (timestamptz '2026-03-29 01:30:00+00' at time zone 'Europe/Berlin')
       is distinct from timestamp '2026-03-29 03:30:00'
     or (timestamptz '2026-10-25 00:30:00+00' at time zone 'Europe/Berlin')
       is distinct from timestamp '2026-10-25 02:30:00'
     or (timestamptz '2026-10-25 01:30:00+00' at time zone 'Europe/Berlin')
       is distinct from timestamp '2026-10-25 02:30:00'
     or (timestamptz '2027-03-28 00:30:00+00' at time zone 'Europe/Berlin')
       is distinct from timestamp '2027-03-28 01:30:00'
     or (timestamptz '2027-03-28 01:30:00+00' at time zone 'Europe/Berlin')
       is distinct from timestamp '2027-03-28 03:30:00' then
    raise exception 'PostgreSQL Europe/Berlin timezone rules do not match certified Prayerapp rules';
  end if;

  -- New York 2026/2027 transition fingerprints.
  if (timestamptz '2026-03-08 06:30:00+00' at time zone 'America/New_York')
       is distinct from timestamp '2026-03-08 01:30:00'
     or (timestamptz '2026-03-08 07:30:00+00' at time zone 'America/New_York')
       is distinct from timestamp '2026-03-08 03:30:00'
     or (timestamptz '2026-11-01 05:30:00+00' at time zone 'America/New_York')
       is distinct from timestamp '2026-11-01 01:30:00'
     or (timestamptz '2026-11-01 06:30:00+00' at time zone 'America/New_York')
       is distinct from timestamp '2026-11-01 01:30:00'
     or (timestamptz '2027-03-14 06:30:00+00' at time zone 'America/New_York')
       is distinct from timestamp '2027-03-14 01:30:00'
     or (timestamptz '2027-03-14 07:30:00+00' at time zone 'America/New_York')
       is distinct from timestamp '2027-03-14 03:30:00' then
    raise exception 'PostgreSQL America/New_York timezone rules do not match certified Prayerapp rules';
  end if;

  if (timestamptz '2026-01-15 09:00:00+00' at time zone 'Asia/Riyadh')
       is distinct from timestamp '2026-01-15 12:00:00'
     or (timestamptz '2027-07-15 09:00:00+00' at time zone 'Asia/Riyadh')
       is distinct from timestamp '2027-07-15 12:00:00'
     or (timestamptz '2026-01-15 03:00:00+00' at time zone 'Asia/Tokyo')
       is distinct from timestamp '2026-01-15 12:00:00'
     or (timestamptz '2027-07-15 03:00:00+00' at time zone 'Asia/Tokyo')
       is distinct from timestamp '2027-07-15 12:00:00'
     or (timestamptz '2026-01-15 12:00:00+00' at time zone 'UTC')
       is distinct from timestamp '2026-01-15 12:00:00'
     or (timestamptz '2027-07-15 12:00:00+00' at time zone 'UTC')
       is distinct from timestamp '2027-07-15 12:00:00' then
    raise exception 'PostgreSQL fixed-rule certified timezone fingerprint mismatch';
  end if;
end
$$;

alter table public.prayer_settings
  drop constraint if exists prayer_settings_timezone_certified;

alter table public.prayer_settings
  add constraint prayer_settings_timezone_certified
  check (
    timezone = any (array[
      'America/New_York',
      'Asia/Riyadh',
      'Asia/Tokyo',
      'Europe/Berlin',
      'UTC'
    ]::text[])
    and applied_timezone = any (array[
      'America/New_York',
      'Asia/Riyadh',
      'Asia/Tokyo',
      'Europe/Berlin',
      'UTC'
    ]::text[])
  ) not valid;

alter table public.prayer_settings
  validate constraint prayer_settings_timezone_certified;

comment on constraint prayer_settings_timezone_certified on public.prayer_settings is
  'Prayer Engine timezones certified against the Root/TV/PostgreSQL 2026-2027 rule fingerprints.';
