#!/usr/bin/env bash
set -euo pipefail

db_container="${DB_CONTAINER:-$(docker ps --filter 'name=supabase_db_' --format '{{.ID}}' | head -n 1)}"
test -n "$db_container"

migration="supabase/migrations/20260915223000_remove_absolute_iqama_columns.sql"

set +e
gate_output="$({
  cat <<'SQL'
begin;
delete from public.prayer_settings where id = '1';
alter table public.prayer_times
  add column fajr_iqama text,
  add column dhuhr_iqama text,
  add column asr_iqama text,
  add column maghrib_iqama text,
  add column isha_iqama text;
insert into public.prayer_times (
  date, fajr, sunrise, dhuhr, asr, maghrib, isha,
  fajr_iqama, dhuhr_iqama, asr_iqama, maghrib_iqama, isha_iqama,
  note, published
) values (
  '2098-12-31', '05:30', '07:45', '12:10', '14:15', '16:25', '18:00',
  '05:41', '12:22', '14:28', '16:39', '18:15',
  'PLAN5_GATE_PROBE', true
);
SQL
  cat "$migration"
} | docker exec -i "$db_container" psql -U postgres -d postgres -v ON_ERROR_STOP=1 2>&1)"
gate_status=$?
set -e

if [ "$gate_status" -eq 0 ]; then
  echo "Plan 5 migration gate probe unexpectedly succeeded without prayer_settings" >&2
  exit 1
fi
if ! grep -Fq "Cannot remove populated legacy absolute Iqama columns without validated shared delays" <<<"$gate_output"; then
  echo "Plan 5 migration gate probe failed for an unexpected reason" >&2
  printf '%s\n' "$gate_output" >&2
  exit 1
fi

echo "PLAN5_GATE_RESULT=PASS destructive legacy-Iqama cutover rejected without validated shared delays"

{
  cat <<'SQL'
begin;

delete from public.prayer_settings where id = '1';
insert into public.prayer_settings (
  id, latitude, longitude, timezone,
  fajr_angle, isha_rule, isha_angle, isha_minutes_after_maghrib,
  asr_shadow_factor, high_latitude_rule,
  fajr_offset_minutes, sunrise_offset_minutes, dhuhr_offset_minutes,
  asr_offset_minutes, maghrib_offset_minutes, isha_offset_minutes,
  fajr_iqama_delay_minutes, dhuhr_iqama_delay_minutes, asr_iqama_delay_minutes,
  maghrib_iqama_delay_minutes, isha_iqama_delay_minutes,
  calculation_revision, applied_calculation_revision, row_revision
) values (
  '1', 48.0, 12.0, 'Europe/Berlin',
  18, 'angle', 17, null,
  1, 'middle_of_night',
  0, 0, 0, 0, 0, 0,
  11, 12, 13, 14, 15,
  1, 1, 1
);

alter table public.prayer_times
  add column fajr_iqama text,
  add column dhuhr_iqama text,
  add column asr_iqama text,
  add column maghrib_iqama text,
  add column isha_iqama text;

delete from public.prayer_times
where note in ('PLAN5_MIGRATION_CERT_HISTORICAL', 'PLAN5_MIGRATION_CERT_FUTURE');

insert into public.prayer_times (
  date, fajr, sunrise, dhuhr, asr, maghrib, isha,
  fajr_iqama, dhuhr_iqama, asr_iqama, maghrib_iqama, isha_iqama,
  maghrib_program_enabled, maghrib_lesson_title,
  maghrib_lesson_duration_minutes, maghrib_combined_isha_time,
  note, note_ar, note_en, note_de, note_tr, published
) values
(
  '2025-01-15', '06:01', '08:00', '12:18', '14:35', '16:50', '18:20',
  '06:12', '12:30', '14:48', '17:04', '18:35',
  true, 'PLAN5 preserved Maghrib lesson', 17, '19:45',
  'PLAN5_MIGRATION_CERT_HISTORICAL',
  'PLAN5_HIST_AR', 'PLAN5_HIST_EN', 'PLAN5_HIST_DE', 'PLAN5_HIST_TR', true
),
(
  '2099-01-15', '05:11', '07:22', '12:33', '15:44', '18:55', '20:06',
  '05:22', '12:45', '15:57', '19:09', '20:21',
  false, null, null, null,
  'PLAN5_MIGRATION_CERT_FUTURE',
  'PLAN5_FUTURE_AR', 'PLAN5_FUTURE_EN', 'PLAN5_FUTURE_DE', 'PLAN5_FUTURE_TR', true
);

delete from public.jumuah_times where notes = 'PLAN5_MIGRATION_CERT';
insert into public.jumuah_times (
  date, khutbah_time, prayer_time, location_name, location_address,
  khateeb_name, language, notes, published
) values (
  '2099-01-16', '13:20', '13:30', 'Plan 5 Mosque', 'Plan 5 Address',
  'Plan 5 Khateeb', 'de', 'PLAN5_MIGRATION_CERT', true
);

create temporary table plan5_before_prayer as
select
  id,
  date,
  md5(concat_ws('|',
    date::text, fajr, sunrise, dhuhr, asr, maghrib, isha,
    coalesce(note, ''),
    coalesce(note_ar, ''),
    coalesce(note_en, ''),
    coalesce(note_de, ''),
    coalesce(note_tr, ''),
    published::text,
    maghrib_program_enabled::text,
    coalesce(maghrib_lesson_title, ''),
    coalesce(maghrib_lesson_duration_minutes::text, ''),
    coalesce(maghrib_combined_isha_time, '')
  )) as schedule_hash
from public.prayer_times
where note in ('PLAN5_MIGRATION_CERT_HISTORICAL', 'PLAN5_MIGRATION_CERT_FUTURE')
order by date;

create temporary table plan5_before_jumuah as
select
  id,
  md5(concat_ws('|', date::text, khutbah_time, prayer_time, location_name,
    location_address, khateeb_name, language, coalesce(notes, ''), published::text)) as row_hash
from public.jumuah_times
where notes = 'PLAN5_MIGRATION_CERT';

select 'PLAN5_BEFORE prayer_times_count=' || count(*) from plan5_before_prayer;
select 'PLAN5_BEFORE prayer_schedule_hash=' ||
  md5(string_agg(date::text || ':' || schedule_hash, '|' order by date))
from plan5_before_prayer;
select 'PLAN5_BEFORE jumuah_count=' || count(*) from plan5_before_jumuah;
select 'PLAN5_BEFORE jumuah_hash=' || coalesce(min(row_hash), 'none') from plan5_before_jumuah;
select 'PLAN5_BEFORE shared_delays=11,12,13,14,15';
SQL
  cat "$migration"
  cat <<'SQL'

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'prayer_times'
      and column_name in ('fajr_iqama','dhuhr_iqama','asr_iqama','maghrib_iqama','isha_iqama')
  ) then
    raise exception 'legacy absolute Iqama columns survived approved cutover';
  end if;

  if (select count(*) from plan5_before_prayer) <> 2
     or (select count(*) from public.prayer_times
         where note in ('PLAN5_MIGRATION_CERT_HISTORICAL','PLAN5_MIGRATION_CERT_FUTURE')) <> 2 then
    raise exception 'representative prayer row count changed';
  end if;

  if exists (
    select 1
    from plan5_before_prayer b
    where not exists (
      select 1
      from public.prayer_times p
      where p.id = b.id
        and p.date = b.date
        and b.schedule_hash = md5(concat_ws('|',
          p.date::text, p.fajr, p.sunrise, p.dhuhr, p.asr, p.maghrib, p.isha,
          coalesce(p.note, ''),
          coalesce(p.note_ar, ''),
          coalesce(p.note_en, ''),
          coalesce(p.note_de, ''),
          coalesce(p.note_tr, ''),
          p.published::text,
          p.maghrib_program_enabled::text,
          coalesce(p.maghrib_lesson_title, ''),
          coalesce(p.maghrib_lesson_duration_minutes::text, ''),
          coalesce(p.maghrib_combined_isha_time, '')
        ))
    )
  ) then
    raise exception 'representative prayer row changed or missing';
  end if;

  if not exists (
    select 1 from public.prayer_times
    where note = 'PLAN5_MIGRATION_CERT_HISTORICAL'
      and date = '2025-01-15'
      and maghrib_program_enabled
      and maghrib_lesson_title = 'PLAN5 preserved Maghrib lesson'
      and maghrib_lesson_duration_minutes = 17
      and maghrib_combined_isha_time = '19:45'
  ) then
    raise exception 'historical row or Maghrib Program was not preserved';
  end if;

  if (select count(*) from plan5_before_jumuah) <> (
    select count(*) from public.jumuah_times where notes = 'PLAN5_MIGRATION_CERT'
  ) then
    raise exception 'Jumuah row count changed';
  end if;

  if exists (
    select 1
    from plan5_before_jumuah b
    where not exists (
      select 1
      from public.jumuah_times j
      where j.id = b.id
        and b.row_hash = md5(concat_ws('|', j.date::text, j.khutbah_time, j.prayer_time,
          j.location_name, j.location_address, j.khateeb_name, j.language,
          coalesce(j.notes, ''), j.published::text))
    )
  ) then
    raise exception 'Jumuah row changed';
  end if;

  if not exists (
    select 1 from public.prayer_settings
    where id = '1'
      and fajr_iqama_delay_minutes = 11
      and dhuhr_iqama_delay_minutes = 12
      and asr_iqama_delay_minutes = 13
      and maghrib_iqama_delay_minutes = 14
      and isha_iqama_delay_minutes = 15
  ) then
    raise exception 'shared Iqama delays changed';
  end if;
end
$$;

select 'PLAN5_AFTER prayer_times_count=' || count(*)
from public.prayer_times
where note in ('PLAN5_MIGRATION_CERT_HISTORICAL','PLAN5_MIGRATION_CERT_FUTURE');
select 'PLAN5_AFTER prayer_schedule_hash=' ||
  md5(string_agg(p.date::text || ':' || b.schedule_hash, '|' order by p.date))
from public.prayer_times p
join plan5_before_prayer b using (date);
select 'PLAN5_AFTER jumuah_count=' || count(*) from public.jumuah_times where notes = 'PLAN5_MIGRATION_CERT';
select 'PLAN5_AFTER jumuah_hash=' || coalesce(min(b.row_hash), 'none')
from plan5_before_jumuah b
join public.jumuah_times j on j.id = b.id;
select 'PLAN5_AFTER shared_delays=' ||
  concat_ws(',', fajr_iqama_delay_minutes, dhuhr_iqama_delay_minutes,
    asr_iqama_delay_minutes, maghrib_iqama_delay_minutes, isha_iqama_delay_minutes)
from public.prayer_settings where id = '1';
select 'PLAN5_AFTER legacy_iqama_columns=0';
rollback;
SQL
} | docker exec -i "$db_container" psql -U postgres -d postgres -v ON_ERROR_STOP=1

echo "PLAN5_MIGRATION_DRY_RUN=PASS rollback-only local certification completed"
