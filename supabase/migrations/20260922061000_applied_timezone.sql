-- Separate pending Prayer Engine timezone edits from the timezone currently
-- applied to the generated schedule. A timezone change requires full future recalculation
-- before public/runtime scheduling consumers may observe it.
alter table public.prayer_settings
  add column if not exists applied_timezone text;

do $
begin
  if exists (
    select 1
    from public.prayer_settings
    where applied_timezone is null
      and calculation_revision <> applied_calculation_revision
  ) then
    raise exception 'cannot infer applied timezone while prayer settings have unapplied calculation changes';
  end if;
end
$;

update public.prayer_settings as p
set applied_timezone = p.timezone
where p.applied_timezone is null;

alter table public.prayer_settings
  alter column applied_timezone set not null;

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
begin
  if p_today is null
     or p_start_date is null
     or p_end_date is null
     or p_expected_revision is null then
    raise exception 'invalid recalculation basis';
  end if;
  if p_start_date < p_today then
    raise exception 'recalculation cannot change dates before mosque-local today';
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

  if not exists (
    select 1
    from public.prayer_times
    where date >= p_today
      and (date < p_start_date or date > p_end_date)
  ) then
    update public.prayer_settings
    set applied_calculation_revision = calculation_revision,
        applied_timezone = timezone,
        row_revision = row_revision + 1,
        updated_at = now()
    where id = '1';
  end if;

  return v_count;
end;
$$;

comment on column public.prayer_settings.applied_timezone is
  'Timezone associated with the currently applied prayer schedule; promoted atomically after a full future recalculation.';
