-- Plan 6 reviewer remediation: serialize timezone activation with native enrollment
-- and enforce HTTPS-only campaign QR destinations for future writes.
--
-- This migration is additive and non-destructive. It does not remove legacy
-- Iqama columns or rewrite canonical prayer rows.

create or replace function public.guard_prayer_timezone_activation_against_native_enrollment()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if new.applied_timezone is distinct from old.applied_timezone then
    -- INSERT/UPDATE on native_prayer_installations takes ROW EXCLUSIVE.
    -- SHARE conflicts with ROW EXCLUSIVE, so either:
    -- 1) an enrollment commits first and is observed below, aborting cutover; or
    -- 2) cutover holds SHARE until commit and a later enrollment can only
    --    complete after the new applied timezone/schedule is authoritative.
    lock table public.native_prayer_installations in share mode;

    if exists (
      select 1
      from public.native_prayer_installations
      where revoked_at is null
    ) then
      raise exception 'timezone change requires native prayer installations to be reset before activation';
    end if;
  end if;

  return new;
end;
$$;

revoke all on function public.guard_prayer_timezone_activation_against_native_enrollment()
  from public, anon, authenticated;

drop trigger if exists trg_guard_prayer_timezone_activation_native_enrollment
  on public.prayer_settings;

create trigger trg_guard_prayer_timezone_activation_native_enrollment
before update of applied_timezone on public.prayer_settings
for each row
execute function public.guard_prayer_timezone_activation_against_native_enrollment();

alter table public.donation_campaigns
  drop constraint if exists donation_campaigns_https_donation_url_check;

alter table public.donation_campaigns
  add constraint donation_campaigns_https_donation_url_check
  check (
    donation_url is null
    or donation_url ~* '^https://[^[:space:]]+$'
  )
  not valid;

comment on constraint donation_campaigns_https_donation_url_check
  on public.donation_campaigns is
  'Plan 6 QR safety: new/updated donation campaign URLs must use HTTPS. NOT VALID preserves any untouched legacy row until explicitly remediated.';

do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgrelid = 'public.prayer_settings'::regclass
      and tgname = 'trg_guard_prayer_timezone_activation_native_enrollment'
      and not tgisinternal
  ) then
    raise exception 'timezone/native serialization trigger was not installed';
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.donation_campaigns'::regclass
      and conname = 'donation_campaigns_https_donation_url_check'
  ) then
    raise exception 'HTTPS donation URL constraint was not installed';
  end if;
end;
$$;
