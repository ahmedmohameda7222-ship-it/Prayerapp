-- Version matches the migration identifier assigned by the production ledger.
alter table public.user_prayer_reminders
  drop constraint if exists user_prayer_reminders_adhan_sound_id_check;

update public.user_prayer_reminders
set adhan_sound_id = case
  when prayer = 'fajr' and adhan_sound_id in ('egyptian', 'fajr') then 'fajr-cairo'
  when prayer = 'fajr' and adhan_sound_id = 'makkah' then 'fajr-makkah'
  when prayer = 'fajr' and adhan_sound_id = 'madinah' then 'fajr-madinah'
  when adhan_sound_id in ('egyptian', 'adhan-1', 'adhan-2', 'system-only') then 'abdul-basit-cairo'
  else adhan_sound_id
end;

alter table public.user_prayer_reminders
  alter column adhan_sound_id set default 'abdul-basit-cairo';

-- The sound catalog is intentionally validated in application code rather than
-- by a database enum/check constraint. Stable text IDs let the catalog grow or
-- replace a recording without requiring a schema migration for every audio asset.
