#!/usr/bin/env bash
set -euo pipefail

cutoff_version="20260902223939"
fixture="supabase/tests/fixtures/plan5-precutover-production-like.sql"

pending_migrations=(
  "20260915220000_masjid_display_prayer_settings.sql"
  "20260915221000_prayer_schedule_atomic_generation.sql"
  "20260915222000_masjid_display_admin_schema.sql"
  "20260915222500_plan6_preserve_legacy_iqama_columns.sql"
  "20260915223000_remove_absolute_iqama_columns.sql"
  "20260915223500_plan6_restore_legacy_iqama_columns.sql"
  "20260917041000_masjid_display_feed_revision.sql"
  "20260917233500_masjid_display_bounded_generated_at.sql"
  "20260918001500_masjid_display_semantic_source_timestamps.sql"
  "20260918015000_masjid_display_snapshot_window_readers.sql"
  "20260919023000_masjid_display_feed_bounds.sql"
  "20260922060000_prayer_event_v3.sql"
  "20260922061000_applied_timezone.sql"
  "20260922062000_masjid_display_dynamic_budget_timezone.sql"
  "20260923030000_published_prayer_schedule_snapshot.sql"
  "20260923100000_prayer_schedule_midnight_write_guards.sql"
  "20260924060000_certified_prayer_timezones.sql"
  "20260924070000_plan6_premerge_runtime_bootstrap.sql"
  "20260925045344_plan6_snapshot_rpc_privileges.sql"
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

legacy_iqama_hash_sql="
select md5(string_agg(
  concat_ws('|',
    id::text, date::text,
    coalesce(fajr_iqama, ''), coalesce(dhuhr_iqama, ''),
    coalesce(asr_iqama, ''), coalesce(maghrib_iqama, ''),
    coalesce(isha_iqama, '')
  ),
  '|' order by date, id
))
from public.prayer_times;
"

mosque_settings_preserved_hash_sql="
select md5(string_agg(
  concat_ws('|',
    id, mosque_name, coalesce(mosque_name_ar, ''), coalesce(mosque_name_en, ''),
    coalesce(mosque_name_de, ''), coalesce(mosque_name_tr, ''), address, phone,
    email, google_maps_link, whatsapp_link, telegram_link, account_holder,
    iban, bic
  ),
  '|' order by id
))
from public.mosque_settings;
"

legacy_column_count_sql="
select count(*)
from information_schema.columns
where table_schema='public'
  and table_name='prayer_times'
  and column_name in ('fajr_iqama','dhuhr_iqama','asr_iqama','maghrib_iqama','isha_iqama');
"

# Plan 6 sequencing gate: the destructive feature-branch draft is explicitly
# deferred before its first production application. No migration may rename or
# drop the legacy column names used by the currently deployed main runtime.
# The repair migration exists only for convergence from older disposable/staging drafts.
reset_to_reviewed_cutoff
before_transition_legacy_hash="$(query_scalar "$legacy_iqama_hash_sql")"
for migration_index in 0 1 2 3 4 5; do
  apply_sql_file "supabase/migrations/${pending_migrations[$migration_index]}"
done
after_transition_legacy_hash="$(query_scalar "$legacy_iqama_hash_sql")"
legacy_columns_after_transition="$(query_scalar "$legacy_column_count_sql")"

if [ "$legacy_columns_after_transition" != "5" ]; then
  echo "Plan 6 transition removed legacy absolute-Iqama columns" >&2
  exit 1
fi
if [ "$before_transition_legacy_hash" != "$after_transition_legacy_hash" ]; then
  echo "Plan 6 transition changed legacy absolute-Iqama values" >&2
  exit 1
fi

echo "PLAN6_IQAMA_TRANSITION=PASS destructive cutover deferred; legacy columns and values continuously preserved"

# Existing-content capacity preflight: exercise the Feed bounds migration at
# its own historical boundary before the later Plan 6 bootstrap exists.
reset_to_reviewed_cutoff
for migration_index in 0 1 2 3 4 5 6 7 8 9; do
  apply_sql_file "supabase/migrations/${pending_migrations[$migration_index]}"
done

docker exec -i "$db_container" psql -U postgres -d postgres -v ON_ERROR_STOP=1 <<'SQL'
insert into public.announcements (
  title, title_ar, title_de,
  message, message_ar, message_de,
  type, is_urgent, published
)
select
  'PLAN6_PREFLIGHT',
  'PLAN6_PREFLIGHT',
  'PLAN6_PREFLIGHT',
  repeat('a', 4400),
  repeat('a', 4400),
  repeat('b', 4400),
  'General',
  false,
  true
from generate_series(1, 8);
SQL

set +e
capacity_preflight_output="$(apply_sql_file "supabase/migrations/${pending_migrations[10]}" 2>&1)"
capacity_preflight_status=$?
set -e

if [ "$capacity_preflight_status" -eq 0 ]; then
  echo "Plan 6 capacity migration unexpectedly accepted an existing over-budget dataset" >&2
  exit 1
fi
if ! grep -Fq "Masjid Display dynamic content exceeds aggregate budget of 32768 bytes" <<<"$capacity_preflight_output"; then
  echo "Plan 6 capacity migration preflight failed for an unexpected reason" >&2
  printf '%s\n' "$capacity_preflight_output" >&2
  exit 1
fi
if [ "$(query_scalar "select count(*) from pg_trigger where not tgisinternal and tgname like 'trg_masjid_display_dynamic_budget_%';")" != "0" ]; then
  echo "Plan 6 capacity migration installed triggers before preflight passed" >&2
  exit 1
fi

docker exec "$db_container" psql -U postgres -d postgres -v ON_ERROR_STOP=1 -c   "delete from public.announcements where title = 'PLAN6_PREFLIGHT';"

echo "PLAN6_CONTENT_PREFLIGHT=PASS existing over-capacity content rejected before capacity triggers"

# Full production-like chain from the exact reviewed production cutoff.
reset_to_reviewed_cutoff

before_prayer_count="$(query_scalar 'select count(*) from public.prayer_times;')"
before_jumuah_count="$(query_scalar 'select count(*) from public.jumuah_times;')"
before_prayer_hash="$(query_scalar "$prayer_hash_sql")"
before_jumuah_hash="$(query_scalar "$jumuah_hash_sql")"
before_legacy_iqama_hash="$(query_scalar "$legacy_iqama_hash_sql")"
before_legacy_coverage="$(query_scalar "select concat_ws(',',count(fajr_iqama),count(dhuhr_iqama),count(asr_iqama),count(maghrib_iqama),count(isha_iqama)) from public.prayer_times;")"
before_maghrib_program_count="$(query_scalar 'select count(*) from public.prayer_times where maghrib_program_enabled is true;')"
before_mosque_settings_hash="$(query_scalar "$mosque_settings_preserved_hash_sql")"
before_mosque_settings_count="$(query_scalar "select count(*) from public.mosque_settings where id='1';")"

if [ "$before_prayer_count" != "81" ] || [ "$before_jumuah_count" != "3" ] || [ "$before_mosque_settings_count" != "1" ]; then
  echo "Reviewed Plan 6 fixture counts are not the authorized 81/3/1 target snapshot" >&2
  exit 1
fi

echo "PLAN6_CHAIN_BEFORE prayer_times_count=$before_prayer_count"
echo "PLAN6_CHAIN_BEFORE jumuah_times_count=$before_jumuah_count"
echo "PLAN6_CHAIN_BEFORE prayer_times_hash=$before_prayer_hash"
echo "PLAN6_CHAIN_BEFORE jumuah_hash=$before_jumuah_hash"
echo "PLAN6_CHAIN_BEFORE legacy_iqama_hash=$before_legacy_iqama_hash"
echo "PLAN6_CHAIN_BEFORE legacy_iqama_coverage=$before_legacy_coverage"
echo "PLAN6_CHAIN_BEFORE maghrib_program_enabled_count=$before_maghrib_program_count"
echo "PLAN6_CHAIN_BEFORE mosque_settings_hash=$before_mosque_settings_hash"

for migration_name in "${pending_migrations[@]}"; do
  apply_sql_file "supabase/migrations/$migration_name"
done

after_prayer_count="$(query_scalar 'select count(*) from public.prayer_times;')"
after_jumuah_count="$(query_scalar 'select count(*) from public.jumuah_times;')"
after_prayer_hash="$(query_scalar "$prayer_hash_sql")"
after_jumuah_hash="$(query_scalar "$jumuah_hash_sql")"
after_legacy_iqama_hash="$(query_scalar "$legacy_iqama_hash_sql")"
after_legacy_coverage="$(query_scalar "select concat_ws(',',count(fajr_iqama),count(dhuhr_iqama),count(asr_iqama),count(maghrib_iqama),count(isha_iqama)) from public.prayer_times;")"
after_maghrib_program_count="$(query_scalar 'select count(*) from public.prayer_times where maghrib_program_enabled is true;')"
after_mosque_settings_hash="$(query_scalar "$mosque_settings_preserved_hash_sql")"
legacy_iqama_columns="$(query_scalar "$legacy_column_count_sql")"
shared_delays="$(query_scalar "select concat_ws(',',fajr_iqama_delay_minutes,dhuhr_iqama_delay_minutes,asr_iqama_delay_minutes,maghrib_iqama_delay_minutes,isha_iqama_delay_minutes) from public.prayer_settings where id='1';")"
revision_state="$(query_scalar "select concat_ws(',',calculation_revision,applied_calculation_revision,row_revision) from public.prayer_settings where id='1';")"
profile_state="$(query_scalar "select concat_ws(',',profile_configured::text,(latitude is null)::text,(longitude is null)::text,(fajr_angle is null)::text,(isha_rule is null)::text,(asr_shadow_factor is null)::text,(high_latitude_rule is null)::text) from public.prayer_settings where id='1';")"
timezone_state="$(query_scalar "select concat_ws(',',timezone,applied_timezone) from public.prayer_settings where id='1';")"
display_state="$(query_scalar "select concat_ws(',',fajr_prayer_duration_minutes,dhuhr_prayer_duration_minutes,asr_prayer_duration_minutes,maghrib_prayer_duration_minutes,isha_prayer_duration_minutes,cardinality(azkar_playlist_ids)) from public.masjid_display_settings where id='1';")"
public_app_url="$(query_scalar "select public_app_url from public.mosque_settings where id='1';")"

if [ "$after_prayer_count" != "$before_prayer_count" ] || [ "$after_jumuah_count" != "$before_jumuah_count" ]; then
  echo "Plan 6 pending migration chain changed production-like row counts" >&2
  exit 1
fi
if [ "$before_prayer_hash" != "$after_prayer_hash" ]; then
  echo "Plan 6 pending migration chain changed preserved prayer_times fields" >&2
  exit 1
fi
if [ "$before_jumuah_hash" != "$after_jumuah_hash" ]; then
  echo "Plan 6 pending migration chain changed preserved Jumuah fields" >&2
  exit 1
fi
if [ "$before_legacy_iqama_hash" != "$after_legacy_iqama_hash" ]; then
  echo "Plan 6 pending migration chain changed preserved legacy absolute-Iqama values" >&2
  exit 1
fi
if [ "$before_mosque_settings_hash" != "$after_mosque_settings_hash" ]; then
  echo "Plan 6 pending migration chain changed preserved mosque settings content fields" >&2
  exit 1
fi
if [ "$before_legacy_coverage" != "$after_legacy_coverage" ]; then
  echo "Plan 6 pending migration chain changed legacy absolute-Iqama coverage" >&2
  exit 1
fi
if [ "$before_maghrib_program_count" != "$after_maghrib_program_count" ]; then
  echo "Plan 6 pending migration chain changed Maghrib Program rows" >&2
  exit 1
fi
if [ "$legacy_iqama_columns" != "5" ]; then
  echo "Plan 6 pending migration chain did not retain all five legacy Iqama columns" >&2
  exit 1
fi
if [ "$shared_delays" != "20,15,15,5,10" ]; then
  echo "Plan 6 runtime bootstrap changed canonical shared delays" >&2
  exit 1
fi
if [ "$revision_state" != "1,0,1" ]; then
  echo "Plan 6 bootstrap calculation revision state is not safely pending" >&2
  exit 1
fi
if [ "$profile_state" != "false,true,true,true,true,true,true" ]; then
  echo "Plan 6 bootstrap invented or configured a mosque calculation profile" >&2
  exit 1
fi
if [ "$timezone_state" != "Europe/Berlin,Europe/Berlin" ]; then
  echo "Plan 6 bootstrap timezone does not preserve canonical schedule authority" >&2
  exit 1
fi
if [ "$display_state" != "10,10,10,10,10,0" ]; then
  echo "Plan 6 display settings bootstrap differs from approved Admin defaults" >&2
  exit 1
fi
if [ "$public_app_url" != "https://donaumoschee.vercel.app" ]; then
  echo "Plan 6 public Prayerapp URL bootstrap is incorrect" >&2
  exit 1
fi
if [ "$(query_scalar "select count(*) from information_schema.tables where table_schema='public' and table_name in ('prayer_settings','masjid_display_settings','masjid_display_test_state');")" != "3" ]; then
  echo "Plan 6 runtime tables are incomplete" >&2
  exit 1
fi
if [ "$(query_scalar "select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='get_published_prayer_schedule_snapshot';")" != "1" ]; then
  echo "Plan 6 atomic published prayer snapshot RPC is missing" >&2
  exit 1
fi
snapshot_acl="$(query_scalar "select concat_ws(',',has_function_privilege('anon',p.oid,'EXECUTE')::text,has_function_privilege('authenticated',p.oid,'EXECUTE')::text,has_function_privilege('service_role',p.oid,'EXECUTE')::text) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='get_published_prayer_schedule_snapshot';")"
if [ "$snapshot_acl" != "false,false,true" ]; then
  echo "Plan 6 atomic snapshot RPC is not service-role-only: $snapshot_acl" >&2
  exit 1
fi

echo "PLAN6_CHAIN_AFTER prayer_times_count=$after_prayer_count"
echo "PLAN6_CHAIN_AFTER jumuah_times_count=$after_jumuah_count"
echo "PLAN6_CHAIN_AFTER prayer_times_hash=$after_prayer_hash"
echo "PLAN6_CHAIN_AFTER jumuah_hash=$after_jumuah_hash"
echo "PLAN6_CHAIN_AFTER legacy_iqama_hash=$after_legacy_iqama_hash"
echo "PLAN6_CHAIN_AFTER legacy_iqama_coverage=$after_legacy_coverage"
echo "PLAN6_CHAIN_AFTER maghrib_program_enabled_count=$after_maghrib_program_count"
echo "PLAN6_CHAIN_AFTER mosque_settings_hash=$after_mosque_settings_hash"
echo "PLAN6_CHAIN_AFTER shared_delays=$shared_delays"
echo "PLAN6_CHAIN_AFTER revision_state=$revision_state"
echo "PLAN6_CHAIN_AFTER profile_state=$profile_state"
echo "PLAN6_CHAIN_AFTER timezone_state=$timezone_state"
echo "PLAN6_CHAIN_AFTER display_state=$display_state"
echo "PLAN6_CHAIN_AFTER legacy_iqama_columns=$legacy_iqama_columns"
echo "PLAN6_CHAIN_AFTER public_app_url=$public_app_url"
echo "PLAN6_CHAIN_AFTER snapshot_acl=$snapshot_acl"
echo "PLAN6_PREMERGE_CHAIN=PASS"

# Aggregate content-budget probe on the migrated state.
set +e
content_budget_output="$(
  docker exec -i "$db_container" psql -U postgres -d postgres -v ON_ERROR_STOP=1 2>&1 <<'SQL'
insert into public.announcements (
  title, title_ar, title_de,
  message, message_ar, message_de,
  type, is_urgent, published
)
select
  'PLAN6_BUDGET',
  'PLAN6_BUDGET',
  'PLAN6_BUDGET',
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
  echo "Plan 6 aggregate content-budget probe unexpectedly succeeded" >&2
  exit 1
fi
if ! grep -Fq "Masjid Display dynamic content exceeds aggregate budget" <<<"$content_budget_output"; then
  echo "Plan 6 aggregate content-budget probe failed for an unexpected reason" >&2
  printf '%s\n' "$content_budget_output" >&2
  exit 1
fi
if [ "$(query_scalar "select count(*) from public.announcements where title = 'PLAN6_BUDGET';")" != "0" ]; then
  echo "Plan 6 aggregate content-budget rejection was not atomic" >&2
  exit 1
fi

echo "PLAN6_CONTENT_BUDGET=PASS aggregate overflow rejected atomically"
echo "PLAN6_MIGRATION_DRY_RUN=PASS full non-destructive production-like chain completed"
