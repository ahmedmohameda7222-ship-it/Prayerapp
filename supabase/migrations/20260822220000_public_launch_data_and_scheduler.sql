-- Public-launch safety: remove deterministic QA rows from public delivery before
-- restoring the migration-managed production scheduler.

update public.prayer_times
set published = false,
    updated_at = now()
where published = true
  and note in ('SUPABASE_QA_MOCK', 'HOME_UI_V2_PREVIEW');

update public.jumuah_times
set published = false,
    updated_at = now()
where published = true
  and notes = 'SUPABASE_QA_MOCK';

update public.ramadan_days
set published = false
where published = true
  and note = 'SUPABASE_QA_MOCK';

create or replace function public.prayer_reminder_cron_endpoint()
returns text
language sql
immutable
security definer
set search_path = public, pg_temp
as $$
  select 'https://donaumoschee.vercel.app/api/cron/prayer-reminders'::text;
$$;

revoke all on function public.prayer_reminder_cron_endpoint() from public, anon, authenticated;
grant execute on function public.prayer_reminder_cron_endpoint() to service_role;

do $$
declare
  existing_job_id bigint;
begin
  select jobid
  into existing_job_id
  from cron.job
  where jobname = 'prayer-reminders-every-minute'
  limit 1;

  if existing_job_id is not null then
    perform cron.unschedule(existing_job_id);
  end if;
end
$$;

select cron.schedule(
  'prayer-reminders-every-minute',
  '* * * * *',
  $cron$
  select net.http_get(
    url := public.prayer_reminder_cron_endpoint(),
    headers := jsonb_build_object(
      'x-cron-token',
      (
        select decrypted_secret
        from vault.decrypted_secrets
        where name = 'prayer_reminder_cron_token'
        limit 1
      )
    ),
    timeout_milliseconds := 8000
  );
  $cron$
);

comment on function public.prayer_reminder_cron_endpoint() is
  'Migration-managed canonical reminder endpoint. Update this function in the same change as any production origin rename; health/readiness checks compare it to the application constant.';
