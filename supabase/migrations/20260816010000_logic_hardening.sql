-- Logic hardening: align product rules with database constraints, tighten grants,
-- and prepare a secure Supabase Cron token for prayer reminders.

-- Optional fields must be optional all the way down to Postgres.
alter table public.events alter column end_time drop not null;
alter table public.events alter column published set default true;

alter table public.ramadan_days alter column taraweeh drop not null;
alter table public.ramadan_days alter column published set default true;

alter table public.jumuah_times alter column khutbah_time drop not null;
alter table public.jumuah_times alter column khateeb_name drop not null;

-- The database is the final line of defence for prayer time correctness.
alter table public.prayer_times drop constraint if exists prayer_times_time_format;
alter table public.prayer_times add constraint prayer_times_time_format check (
  fajr ~ '^(?:[01][0-9]|2[0-3]):[0-5][0-9]$' and
  sunrise ~ '^(?:[01][0-9]|2[0-3]):[0-5][0-9]$' and
  dhuhr ~ '^(?:[01][0-9]|2[0-3]):[0-5][0-9]$' and
  asr ~ '^(?:[01][0-9]|2[0-3]):[0-5][0-9]$' and
  maghrib ~ '^(?:[01][0-9]|2[0-3]):[0-5][0-9]$' and
  isha ~ '^(?:[01][0-9]|2[0-3]):[0-5][0-9]$'
);

alter table public.prayer_times drop constraint if exists prayer_times_iqama_time_format;
alter table public.prayer_times add constraint prayer_times_iqama_time_format check (
  (fajr_iqama is null or fajr_iqama ~ '^(?:[01][0-9]|2[0-3]):[0-5][0-9]$') and
  (dhuhr_iqama is null or dhuhr_iqama ~ '^(?:[01][0-9]|2[0-3]):[0-5][0-9]$') and
  (asr_iqama is null or asr_iqama ~ '^(?:[01][0-9]|2[0-3]):[0-5][0-9]$') and
  (maghrib_iqama is null or maghrib_iqama ~ '^(?:[01][0-9]|2[0-3]):[0-5][0-9]$') and
  (isha_iqama is null or isha_iqama ~ '^(?:[01][0-9]|2[0-3]):[0-5][0-9]$')
);

-- Restrict Data API privileges to the minimum required surface. RLS remains in
-- force, but broad table grants are removed as an additional security boundary.
revoke all on table
  public.prayer_times,
  public.jumuah_times,
  public.announcements,
  public.donation_settings,
  public.donation_campaigns,
  public.donation_reports,
  public.events,
  public.ramadan_days,
  public.mosque_settings,
  public.azkar_categories,
  public.azkar_items,
  public.admin_users,
  public.audit_logs,
  public.donations,
  public.user_saved_azkar,
  public.user_prayer_reminders
from anon, authenticated;

grant select on table
  public.prayer_times,
  public.jumuah_times,
  public.announcements,
  public.donation_settings,
  public.donation_campaigns,
  public.donation_reports,
  public.events,
  public.ramadan_days,
  public.mosque_settings
  to anon, authenticated;

grant select on table public.azkar_categories, public.azkar_items to authenticated;
grant select on table public.admin_users, public.audit_logs, public.donations to authenticated;
grant select, insert, delete on table public.user_saved_azkar to authenticated;
grant select, insert, update, delete on table public.user_prayer_reminders to authenticated;

-- Supabase Cron is used instead of relying on a Vercel plan-specific minute
-- interval. The actual production HTTP job is configured after the app endpoint
-- is deployed; this migration only creates the secure token and verifier.
create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron;
create extension if not exists supabase_vault;

do $$
begin
  if not exists (
    select 1 from vault.secrets where name = 'prayer_reminder_cron_token'
  ) then
    perform vault.create_secret(
      replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''),
      'prayer_reminder_cron_token',
      'Token used by Supabase Cron to invoke the prayer reminder route.'
    );
  end if;
end
$$;

create or replace function public.verify_prayer_reminder_cron_token(candidate text)
returns boolean
language sql
stable
security definer
set search_path = public, vault, pg_temp
as $$
  select
    candidate is not null
    and length(candidate) >= 32
    and exists (
      select 1
      from vault.decrypted_secrets
      where name = 'prayer_reminder_cron_token'
        and decrypted_secret = candidate
    );
$$;

revoke all on function public.verify_prayer_reminder_cron_token(text) from public, anon, authenticated;
grant execute on function public.verify_prayer_reminder_cron_token(text) to service_role;
