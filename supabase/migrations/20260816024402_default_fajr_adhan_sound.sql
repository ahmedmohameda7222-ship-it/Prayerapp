update public.user_prayer_reminders
set adhan_sound_id = 'fajr'
where prayer = 'fajr'
  and adhan_sound_id = 'egyptian';
