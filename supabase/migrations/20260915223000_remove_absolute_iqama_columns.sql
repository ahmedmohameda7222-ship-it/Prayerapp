alter table public.prayer_times
  drop column if exists fajr_iqama,
  drop column if exists dhuhr_iqama,
  drop column if exists asr_iqama,
  drop column if exists maghrib_iqama,
  drop column if exists isha_iqama;
