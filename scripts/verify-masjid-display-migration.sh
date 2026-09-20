#!/usr/bin/env bash
set -euo pipefail

cutoff_version="20260902223939"
fixture="supabase/tests/fixtures/plan5-precutover-production-like.sql"

pending_migrations=(
  "20260915220000_masjid_display_prayer_settings.sql"
  "20260915221000_prayer_schedule_atomic_generation.sql"
  "20260915222000_masjid_display_admin_schema.sql"
  "20260915223000_remove_absolute_iqama_columns.sql"
  "20260917041000_masjid_display_feed_revision.sql"
  "20260917233500_masjid_display_bounded_generated_at.sql"
  "20260918001500_masjid_display_semantic_source_timestamps.sql"
  "20260918015000_masjid_display_snapshot_window_readers.sql"
  "20260919023000_masjid_display_feed_bounds.sql"
)

refresh_db_container() {
  db_container="${DB_CONTAINER:-$(docker ps --filter 'name=supabase_db_' --format '{{.ID}}' | head -n 1)}"
  test -n "$db_container"
}

apply_sql_file() {
  local path="$1"
  docker exec -i "$db_container" psql -U postgres -d postgres -v ON_ERROR_STOP=1 < "$path"
}

query_scalar() {
  local sql="$1"
  docker exec "$db_container" psql -U postgres -d postgres -Atqc "$sql"
}

reset_to_reviewed_cutoff() {
  supabase db reset --local --no-seed --version "$cutoff_version"
  refresh_db_container
  apply_sql_file "$fixture"
}

prayer_hash_sql="
select md5(string_agg(
  concat_ws('|',
    id::text, date::text, fajr, sunrise, dhuhr, asr, maghrib, isha,
    coalesce(note, ''), coalesce(note_ar, ''), coalesce(note_en, ''),
    coalesce(note_de, ''), coalesce(note_tr, ''), published::text,
    coalesce(updated_at::text, ''), maghrib_program_enabled::text,
    coalesce(maghrib_lesson_title, ''),
    coalesce(maghrib_lesson_duration_minutes::text, ''),
    coalesce(maghrib_combined_isha_time, '')
  ),
  '|' order by date, id
))
from public.prayer_times;
"

jumuah_hash_sql="
select md5(string_agg(
  concat_ws('|',
    id::text, date::text, coalesce(khutbah_time, ''), prayer_time,
    location_name, location_address, coalesce(khateeb_name, ''),
    language, coalesce(language_ar, ''), coalesce(language_en, ''),
    coalesce(language_de, ''), coalesce(language_tr, ''),
    coalesce(notes, ''), coalesce(notes_ar, ''), coalesce(notes_en, ''),
    coalesce(notes_de, ''), coalesce(notes_tr, ''), published::text,
    coalesce(updated_at::text, '')
  ),
  '|' order by date, prayer_time, id
))
from public.jumuah_times;
"

# Gate probe: restore the reviewed production-like pre-cutover snapshot and
# confirm the destructive cutover refuses populated legacy Iqama data when
# the new singleton exists but no validated shared delays have been supplied.
reset_to_reviewed_cutoff
apply_sql_file "supabase/migrations/${pending_migrations[0]}"
apply_sql_file "supabase/migrations/${pending_migrations[1]}"
apply_sql_file "supabase/migrations/${pending_migrations[2]}"

set +e
gate_output="$(apply_sql_file "supabase/migrations/${pending_migrations[3]}" 2>&1)"
gate_status=$?
set -e

if [ "$gate_status" -eq 0 ]; then
  echo "Plan 5 migration gate probe unexpectedly succeeded without validated shared delays" >&2
  exit 1
fi
if ! grep -Fq "Cannot remove populated legacy absolute Iqama columns without validated shared delays" <<<"$gate_output"; then
  echo "Plan 5 migration gate probe failed for an unexpected reason" >&2
  printf '%s
' "$gate_output" >&2
  exit 1
fi

echo "PLAN5_GATE_RESULT=PASS destructive legacy-Iqama cutover rejected without validated shared delays"

# Existing-content capacity preflight: build the reviewed cutoff through every
# migration before the final bounds migration, seed content that is already
# above the 32 KiB dynamic budget, and prove the final migration rejects it
# before capacity triggers are installed. The failed migration must leave the
# over-capacity rows deletable so an operator can remediate and retry.
reset_to_reviewed_cutoff

for migration_index in 0 1 2 3 4 5 6 7; do
  migration_name="${pending_migrations[$migration_index]}"
  apply_sql_file "supabase/migrations/$migration_name"

  if [ "$migration_name" = "20260915220000_masjid_display_prayer_settings.sql" ]; then
    docker exec -i "$db_container" psql -U postgres -d postgres -v ON_ERROR_STOP=1 <<'SQL'
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
  20, 15, 15, 5, 10,
  1, 1, 1
);
SQL
  fi
done

docker exec -i "$db_container" psql -U postgres -d postgres -v ON_ERROR_STOP=1 <<'SQL'
insert into public.announcements (
  title, title_ar, title_de,
  message, message_ar, message_de,
  type, is_urgent, published
)
select
  'PLAN5_PREFLIGHT',
  'PLAN5_PREFLIGHT',
  'PLAN5_PREFLIGHT',
  repeat('a', 4400),
  repeat('a', 4400),
  repeat('b', 4400),
  'General',
  false,
  true
from generate_series(1, 8);
SQL

if [ "$(query_scalar "select count(*) from public.announcements where title = 'PLAN5_PREFLIGHT';")" != "8" ]; then
  echo "Plan 5 capacity preflight fixture did not create the expected 8 rows" >&2
  exit 1
fi

set +e
capacity_preflight_output="$(apply_sql_file "supabase/migrations/${pending_migrations[8]}" 2>&1)"
capacity_preflight_status=$?
set -e

if [ "$capacity_preflight_status" -eq 0 ]; then
  echo "Plan 5 capacity migration unexpectedly accepted an existing over-budget dataset" >&2
  exit 1
fi
if ! grep -Fq "Masjid Display dynamic content exceeds aggregate budget of 32768 bytes" <<<"$capacity_preflight_output"; then
  echo "Plan 5 capacity migration preflight failed for an unexpected reason" >&2
  printf '%s\n' "$capacity_preflight_output" >&2
  exit 1
fi

capacity_trigger_count="$(query_scalar "select count(*) from pg_trigger where not tgisinternal and tgname like 'trg_masjid_display_dynamic_budget_%';")"
if [ "$capacity_trigger_count" != "0" ]; then
  echo "Plan 5 capacity migration installed enforcement triggers before the preflight passed" >&2
  exit 1
fi

docker exec "$db_container" psql -U postgres -d postgres -v ON_ERROR_STOP=1 -c "delete from public.announcements where title = 'PLAN5_PREFLIGHT';"
if [ "$(query_scalar "select count(*) from public.announcements where title = 'PLAN5_PREFLIGHT';")" != "0" ]; then
  echo "Plan 5 capacity preflight failure trapped over-budget rows and prevented cleanup" >&2
  exit 1
fi

echo "PLAN5_CONTENT_PREFLIGHT=PASS existing over-capacity content rejected before capacity triggers"

# Full-chain certification: restore the same reviewed cutoff snapshot, capture
# before evidence, apply every pending migration in repository order, and then
# compare the preserved production-like rows after the complete chain.
reset_to_reviewed_cutoff

before_prayer_count="$(query_scalar 'select count(*) from public.prayer_times;')"
before_jumuah_count="$(query_scalar 'select count(*) from public.jumuah_times;')"
before_prayer_hash="$(query_scalar "$prayer_hash_sql")"
before_jumuah_hash="$(query_scalar "$jumuah_hash_sql")"
before_maghrib_program_count="$(query_scalar 'select count(*) from public.prayer_times where maghrib_program_enabled is true;')"

if [ "$before_prayer_count" != "81" ] || [ "$before_jumuah_count" != "3" ]; then
  echo "Reviewed Plan 5 fixture counts are not the authorized 81/3 target snapshot" >&2
  exit 1
fi

echo "PLAN5_CHAIN_BEFORE prayer_times_count=81"
echo "PLAN5_CHAIN_BEFORE jumuah_times_count=3"
echo "PLAN5_CHAIN_BEFORE prayer_times_hash=$before_prayer_hash"
echo "PLAN5_CHAIN_BEFORE jumuah_hash=$before_jumuah_hash"
echo "PLAN5_CHAIN_BEFORE maghrib_program_enabled_count=$before_maghrib_program_count"

for migration_name in "${pending_migrations[@]}"; do
  apply_sql_file "supabase/migrations/$migration_name"

  if [ "$migration_name" = "20260915220000_masjid_display_prayer_settings.sql" ]; then
    docker exec -i "$db_container" psql -U postgres -d postgres -v ON_ERROR_STOP=1 <<'SQL'
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
  20, 15, 15, 5, 10,
  1, 1, 1
);
SQL
    echo "PLAN5_CHAIN_PREREQUISITE shared_delays=20,15,15,5,10"
  fi
done

after_prayer_count="$(query_scalar 'select count(*) from public.prayer_times;')"
after_jumuah_count="$(query_scalar 'select count(*) from public.jumuah_times;')"
after_prayer_hash="$(query_scalar "$prayer_hash_sql")"
after_jumuah_hash="$(query_scalar "$jumuah_hash_sql")"
after_maghrib_program_count="$(query_scalar 'select count(*) from public.prayer_times where maghrib_program_enabled is true;')"
legacy_iqama_columns="$(query_scalar "select count(*) from information_schema.columns where table_schema='public' and table_name='prayer_times' and column_name in ('fajr_iqama','dhuhr_iqama','asr_iqama','maghrib_iqama','isha_iqama');")"
shared_delays="$(query_scalar "select concat_ws(',',fajr_iqama_delay_minutes,dhuhr_iqama_delay_minutes,asr_iqama_delay_minutes,maghrib_iqama_delay_minutes,isha_iqama_delay_minutes) from public.prayer_settings where id='1';")"

if [ "$after_prayer_count" != "81" ] || [ "$after_jumuah_count" != "3" ]; then
  echo "Plan 5 pending migration chain changed production-like row counts" >&2
  exit 1
fi
if [ "$before_prayer_hash" != "$after_prayer_hash" ]; then
  echo "Plan 5 pending migration chain changed preserved prayer_times fields" >&2
  exit 1
fi
if [ "$before_jumuah_hash" != "$after_jumuah_hash" ]; then
  echo "Plan 5 pending migration chain changed preserved Jumuah fields" >&2
  exit 1
fi
if [ "$before_maghrib_program_count" != "$after_maghrib_program_count" ]; then
  echo "Plan 5 pending migration chain changed Maghrib Program rows" >&2
  exit 1
fi
if [ "$legacy_iqama_columns" != "0" ]; then
  echo "Plan 5 pending migration chain left legacy absolute Iqama columns behind" >&2
  exit 1
fi
if [ "$shared_delays" != "20,15,15,5,10" ]; then
  echo "Plan 5 pending migration chain changed canonical shared delays" >&2
  exit 1
fi

echo "PLAN5_CHAIN_AFTER prayer_times_count=81"
echo "PLAN5_CHAIN_AFTER jumuah_times_count=3"
echo "PLAN5_CHAIN_AFTER prayer_times_hash=$after_prayer_hash"
echo "PLAN5_CHAIN_AFTER jumuah_hash=$after_jumuah_hash"
echo "PLAN5_CHAIN_AFTER maghrib_program_enabled_count=$after_maghrib_program_count"
echo "PLAN5_CHAIN_AFTER shared_delays=$shared_delays"
echo "PLAN5_CHAIN_AFTER legacy_iqama_columns=0"
echo "PLAN5_PENDING_CHAIN=PASS"
echo "PLAN5_MIGRATION_DRY_RUN=PASS full pending-chain local certification completed"


# Aggregate content-budget probe: after the full chain exists, a single
# statement that would make the eligible dynamic Feed exceed 32 KiB must fail
# atomically rather than publishing rows that turn the public Feed into 503.
set +e
content_budget_output="$(
  docker exec -i "$db_container" psql -U postgres -d postgres -v ON_ERROR_STOP=1 2>&1 <<'SQL'
insert into public.announcements (
  title, title_ar, title_de,
  message, message_ar, message_de,
  type, is_urgent, published
)
select
  'PLAN5_BUDGET',
  'PLAN5_BUDGET',
  'PLAN5_BUDGET',
  repeat('a', 4400),
  repeat('a', 4400),
  repeat('b', 4400),
  'General',
  false,
  true
from generate_series(1, 8);
SQL
)"
content_budget_status=$?
set -e

if [ "$content_budget_status" -eq 0 ]; then
  echo "Plan 5 aggregate content-budget probe unexpectedly succeeded" >&2
  exit 1
fi
if ! grep -Fq "Masjid Display dynamic content exceeds aggregate budget" <<<"$content_budget_output"; then
  echo "Plan 5 aggregate content-budget probe failed for an unexpected reason" >&2
  printf '%s\n' "$content_budget_output" >&2
  exit 1
fi
if [ "$(query_scalar "select count(*) from public.announcements where title = 'PLAN5_BUDGET';")" != "0" ]; then
  echo "Plan 5 aggregate content-budget rejection was not atomic" >&2
  exit 1
fi

echo "PLAN5_CONTENT_BUDGET=PASS aggregate overflow rejected atomically"
