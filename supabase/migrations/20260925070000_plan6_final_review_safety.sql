-- Plan 6 final-review safety convergence.
--
-- This additive migration records two post-production-review corrections
-- without destructive schema changes:
-- 1. 20260924070000's source assertion now accepts an already-configured
--    prayer_settings singleton as well as the setup-incomplete bootstrap row.
--    This migration reasserts those generalized runtime invariants so existing
--    applied production history remains explicit.
-- 2. timezone promotion is fail-closed once today's first possible reminder
--    boundary has passed and while any native prayer authority remains active.
--    Native reset/revocation cancels installed alarms before activation.
--
-- Legacy absolute-Iqama columns remain physically present and are untouched.

do $$
begin
  if not exists (
    select 1
    from public.prayer_settings
    where id = '1'
      and coalesce(btrim(timezone), '') <> ''
      and coalesce(btrim(applied_timezone), '') <> ''
      and calculation_revision >= 1
      and applied_calculation_revision between 0 and calculation_revision
      and row_revision >= 1
      and profile_configured in (true, false)
      and fajr_iqama_delay_minutes between 0 and 180
      and dhuhr_iqama_delay_minutes between 0 and 180
      and asr_iqama_delay_minutes between 0 and 180
      and maghrib_iqama_delay_minutes between 0 and 180
      and isha_iqama_delay_minutes between 0 and 180
  ) then
    raise exception 'Plan 6 Prayer Engine runtime singleton is invalid';
  end if;
end
$$;

create or replace function public.commit_prayer_schedule_recalculation(
  p_rows jsonb,
  p_expected_rows jsonb,
  p_expected_revision bigint,
  p_today date,
  p_start_date date,
  p_end_date date
) returns integer
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_settings public.prayer_settings%rowtype;
  v_applied_today date;
  v_count integer;
  v_payload_count integer;
  v_distinct_count integer;
  v_expected_count integer;
  v_min_date date;
  v_max_date date;
  v_basis_count integer;
  v_basis_distinct_count integer;
  v_basis_min_date date;
  v_basis_max_date date;
  v_timezone_cutover_deadline timestamptz;
begin
  if p_today is null
     or p_start_date is null
     or p_end_date is null
     or p_expected_revision is null then
    raise exception 'invalid recalculation basis';
  end if;
  if p_end_date < p_start_date then
    raise exception 'invalid recalculation range';
  end if;
  if p_rows is null or jsonb_typeof(p_rows) <> 'array' then
    raise exception 'recalculation payload must be a JSON array';
  end if;
  if p_expected_rows is null or jsonb_typeof(p_expected_rows) <> 'array' then
    raise exception 'recalculation basis must be a JSON array';
  end if;

  select * into strict v_settings
  from public.prayer_settings
  where id = '1'
  for update;

  -- Re-derive the authoritative applied local day inside the write statement
  -- after serializing on prayer_settings. A client preview/commit can cross
  -- midnight between calculating p_today and entering this RPC; never allow
  -- that stale date to weaken the future-only write boundary.
  v_applied_today := (
    clock_timestamp() at time zone v_settings.applied_timezone
  )::date;

  if p_today is distinct from v_applied_today then
    raise exception 'mosque-local today changed; preview again';
  end if;

  if p_start_date < v_applied_today then
    raise exception 'recalculation cannot change dates before mosque-local today';
  end if;

  if v_settings.calculation_revision <> p_expected_revision then
    raise exception 'calculation revision mismatch';
  end if;

  lock table public.prayer_times in share row exclusive mode;

  v_expected_count := (p_end_date - p_start_date) + 1;

  select count(*), count(distinct r.date), min(r.date), max(r.date)
  into v_payload_count, v_distinct_count, v_min_date, v_max_date
  from jsonb_to_recordset(p_rows) as r(
    date date,
    fajr text,
    sunrise text,
    dhuhr text,
    asr text,
    maghrib text,
    isha text
  );

  if v_payload_count <> v_expected_count
     or v_distinct_count <> v_expected_count
     or v_min_date is distinct from p_start_date
     or v_max_date is distinct from p_end_date
     or exists (
       select 1
       from generate_series(p_start_date, p_end_date, interval '1 day') d
       where not exists (
         select 1
         from jsonb_to_recordset(p_rows) as r(
           date date,
           fajr text,
           sunrise text,
           dhuhr text,
           asr text,
           maghrib text,
           isha text
         )
         where r.date = d::date
       )
     ) then
    raise exception 'recalculation payload must match approved continuous range';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(p_rows) as r(
      date date,
      fajr text,
      sunrise text,
      dhuhr text,
      asr text,
      maghrib text,
      isha text
    )
    where r.date is null
       or r.date < p_start_date
       or r.date > p_end_date
       or r.fajr is null
       or r.sunrise is null
       or r.dhuhr is null
       or r.asr is null
       or r.maghrib is null
       or r.isha is null
  ) then
    raise exception 'invalid recalculation payload row';
  end if;

  select count(*), count(distinct e.date), min(e.date), max(e.date)
  into v_basis_count, v_basis_distinct_count, v_basis_min_date, v_basis_max_date
  from jsonb_to_recordset(p_expected_rows) as e(
    date date,
    "exists" boolean,
    fajr text,
    sunrise text,
    dhuhr text,
    asr text,
    maghrib text,
    isha text
  );

  if v_basis_count <> v_expected_count
     or v_basis_distinct_count <> v_expected_count
     or v_basis_min_date is distinct from p_start_date
     or v_basis_max_date is distinct from p_end_date
     or exists (
       select 1
       from generate_series(p_start_date, p_end_date, interval '1 day') d
       where not exists (
         select 1
         from jsonb_to_recordset(p_expected_rows) as e(
           date date,
           "exists" boolean,
           fajr text,
           sunrise text,
           dhuhr text,
           asr text,
           maghrib text,
           isha text
         )
         where e.date = d::date
       )
     ) then
    raise exception 'recalculation basis must match approved continuous range';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(p_expected_rows) as e(
      date date,
      "exists" boolean,
      fajr text,
      sunrise text,
      dhuhr text,
      asr text,
      maghrib text,
      isha text
    )
    where e.date is null
       or e."exists" is null
       or (
         e."exists"
         and (
           e.fajr is null
           or e.sunrise is null
           or e.dhuhr is null
           or e.asr is null
           or e.maghrib is null
           or e.isha is null
         )
       )
  ) then
    raise exception 'invalid recalculation basis row';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(p_expected_rows) as e(
      date date,
      "exists" boolean,
      fajr text,
      sunrise text,
      dhuhr text,
      asr text,
      maghrib text,
      isha text
    )
    left join public.prayer_times p on p.date = e.date
    where (e."exists" and p.date is null)
       or (not e."exists" and p.date is not null)
       or (
         e."exists"
         and p.date is not null
         and (
           p.fajr is distinct from e.fajr
           or p.sunrise is distinct from e.sunrise
           or p.dhuhr is distinct from e.dhuhr
           or p.asr is distinct from e.asr
           or p.maghrib is distinct from e.maghrib
           or p.isha is distinct from e.isha
         )
       )
  ) then
    raise exception 'prayer schedule changed since preview';
  end if;

  -- A table-lock wait or validation pass can cross mosque-local midnight.
  -- Recheck the moving clock immediately before the canonical upsert.
  v_applied_today := (
    clock_timestamp() at time zone v_settings.applied_timezone
  )::date;
  if p_today is distinct from v_applied_today then
    raise exception 'mosque-local today changed; preview again';
  end if;
  if p_start_date < v_applied_today then
    raise exception 'recalculation cannot change dates before mosque-local today';
  end if;

  if v_settings.timezone <> v_settings.applied_timezone then
    if (clock_timestamp() at time zone v_settings.timezone)::date
       is distinct from
       (clock_timestamp() at time zone v_settings.applied_timezone)::date then
      raise exception 'timezone change requires applied and pending timezones to share the same local date';
    end if;

    -- A timezone promotion changes the absolute instants represented by every
    -- wall-clock row. Do not activate it while a native client can still hold
    -- alarms from the previous schedule generation. Modern native scheduling
    -- is installed only after authority enrollment; revocation/reset cancels
    -- local alarms before the authority row becomes inactive.
    if exists (
      select 1
      from public.native_prayer_installations
      where revoked_at is null
    ) then
      raise exception 'timezone change requires native prayer installations to be reset before activation';
    end if;

    -- Web/native reminders can be due up to 15 minutes before Fajr. Once the
    -- earliest old/new daily reminder boundary has passed, previously
    -- delivered notifications cannot be undone, so defer the timezone cutover
    -- to an unstarted prayer day instead of rewriting today's authority.
    select least(
      ((p.date + p.fajr::time) at time zone v_settings.applied_timezone) - interval '15 minutes',
      ((r.date + r.fajr::time) at time zone v_settings.timezone) - interval '15 minutes'
    )
    into v_timezone_cutover_deadline
    from public.prayer_times p
    join jsonb_to_recordset(p_rows) as r(
      date date,
      fajr text,
      sunrise text,
      dhuhr text,
      asr text,
      maghrib text,
      isha text
    ) on r.date = p.date
    where p.date = v_applied_today;

    if v_timezone_cutover_deadline is null then
      raise exception 'timezone change requires the current prayer day in both schedules';
    end if;

    if clock_timestamp() >= v_timezone_cutover_deadline then
      raise exception 'timezone change must be activated before the first daily reminder; defer to an unstarted schedule date';
    end if;

    if exists (
      select 1
      from public.prayer_times
      where date >= v_applied_today
        and (date < p_start_date or date > p_end_date)
    ) then
      raise exception 'timezone change requires full future recalculation';
    end if;
  end if;

  insert into public.prayer_times (
    date,
    fajr,
    sunrise,
    dhuhr,
    asr,
    maghrib,
    isha,
    published
  )
  select
    r.date,
    r.fajr,
    r.sunrise,
    r.dhuhr,
    r.asr,
    r.maghrib,
    r.isha,
    true
  from jsonb_to_recordset(p_rows) as r(
    date date,
    fajr text,
    sunrise text,
    dhuhr text,
    asr text,
    maghrib text,
    isha text
  )
  on conflict (date) do update
  set fajr = excluded.fajr,
      sunrise = excluded.sunrise,
      dhuhr = excluded.dhuhr,
      asr = excluded.asr,
      maghrib = excluded.maghrib,
      isha = excluded.isha,
      updated_at = now();

  get diagnostics v_count = row_count;

  -- Detect a midnight transition during the upsert itself. Raising here
  -- rolls back the write before the RPC can commit.
  v_applied_today := (
    clock_timestamp() at time zone v_settings.applied_timezone
  )::date;
  if p_today is distinct from v_applied_today
     or p_start_date < v_applied_today then
    raise exception 'mosque-local today changed during recalculation; preview again';
  end if;

  if not exists (
    select 1
    from public.prayer_times
    where date >= v_applied_today
      and (date < p_start_date or date > p_end_date)
  ) then
    update public.prayer_settings
    set applied_calculation_revision = calculation_revision,
        applied_timezone = timezone,
        row_revision = row_revision + 1,
        updated_at = now()
    where id = '1';

    perform public.assert_masjid_display_dynamic_content_budget();
  end if;

  return v_count;
end;
$$;

revoke all on function public.commit_prayer_schedule_recalculation(jsonb, jsonb, bigint, date, date, date)
  from public, anon, authenticated;
grant execute on function public.commit_prayer_schedule_recalculation(jsonb, jsonb, bigint, date, date, date)
  to service_role;
