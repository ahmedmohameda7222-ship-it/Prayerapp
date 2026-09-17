-- Plan 3 generatedAt must advance only when the semantic Feed-v1 projection
-- of a represented database authority can change. The prior whole-row trigger
-- also versioned fields that the public feed never emits, which caused otherwise
-- identical feed bodies to receive new generatedAt/snapshot/ETag values.

create or replace function public.touch_masjid_display_source_updated_at()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  semantic_keys text[];
  old_row jsonb := to_jsonb(old);
  new_row jsonb := to_jsonb(new);
  old_semantic jsonb;
  new_semantic jsonb;
begin
  semantic_keys := case tg_table_name
    when 'prayer_times' then array[
      'id', 'date', 'fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha',
      'maghrib_program_enabled', 'maghrib_lesson_title',
      'maghrib_lesson_duration_minutes', 'maghrib_combined_isha_time', 'published'
    ]
    when 'prayer_settings' then array[
      'id', 'fajr_iqama_delay_minutes', 'dhuhr_iqama_delay_minutes',
      'asr_iqama_delay_minutes', 'maghrib_iqama_delay_minutes',
      'isha_iqama_delay_minutes'
    ]
    when 'jumuah_times' then array[
      'id', 'date', 'prayer_time', 'published'
    ]
    when 'announcements' then array[
      'id', 'title', 'title_ar', 'title_de', 'message', 'message_ar', 'message_de',
      'is_urgent', 'display_style', 'display_from', 'display_until', 'published',
      'created_at'
    ]
    when 'events' then array[
      'id', 'title', 'title_ar', 'title_de', 'description', 'description_ar',
      'description_de', 'location', 'location_ar', 'location_de', 'date',
      'start_time', 'end_time', 'type', 'published'
    ]
    when 'donation_campaigns' then array[
      'id', 'title', 'title_ar', 'title_de', 'description', 'description_ar',
      'description_de', 'target_amount', 'collected_amount', 'start_date',
      'end_date', 'donation_url', 'is_active', 'is_featured'
    ]
    when 'mosque_settings' then array[
      'id', 'mosque_name', 'mosque_name_ar', 'mosque_name_de', 'address',
      'public_app_url'
    ]
    when 'masjid_display_settings' then array[
      'id', 'fajr_prayer_duration_minutes', 'dhuhr_prayer_duration_minutes',
      'asr_prayer_duration_minutes', 'maghrib_prayer_duration_minutes',
      'isha_prayer_duration_minutes', 'azkar_playlist_ids'
    ]
    else null
  end;

  if semantic_keys is null then
    raise exception 'Unsupported Masjid Display timestamp source table: %', tg_table_name;
  end if;

  select coalesce(jsonb_object_agg(keys.key, old_row -> keys.key), '{}'::jsonb)
    into old_semantic
  from unnest(semantic_keys) as keys(key);

  select coalesce(jsonb_object_agg(keys.key, new_row -> keys.key), '{}'::jsonb)
    into new_semantic
  from unnest(semantic_keys) as keys(key);

  if new_semantic is distinct from old_semantic then
    new.updated_at := greatest(clock_timestamp(), old.updated_at + interval '1 microsecond');
  else
    new.updated_at := old.updated_at;
  end if;

  return new;
end;
$$;

revoke all on function public.touch_masjid_display_source_updated_at() from public, anon, authenticated;
grant execute on function public.touch_masjid_display_source_updated_at() to service_role;
