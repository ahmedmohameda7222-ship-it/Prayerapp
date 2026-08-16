alter table public.user_prayer_reminders
  add column if not exists adhan_sound_id text not null default 'egyptian';

update public.user_prayer_reminders
set adhan_sound_id = case when prayer = 'fajr' then 'fajr' else 'egyptian' end
where adhan_sound_id is null or adhan_sound_id not in ('egyptian', 'fajr', 'makkah', 'madinah');

alter table public.user_prayer_reminders
  drop constraint if exists user_prayer_reminders_adhan_sound_id_check;

alter table public.user_prayer_reminders
  add constraint user_prayer_reminders_adhan_sound_id_check
  check (adhan_sound_id in ('egyptian', 'fajr', 'makkah', 'madinah'));
