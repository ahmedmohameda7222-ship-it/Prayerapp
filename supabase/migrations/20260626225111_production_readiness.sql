-- Production-readiness hardening for the Deggendorf Prayer web app.

alter table public.admin_users
  add column if not exists user_id uuid references auth.users(id) on delete set null;
create unique index if not exists admin_users_user_id_key
  on public.admin_users(user_id) where user_id is not null;

alter table public.events add column if not exists published boolean not null default true;
alter table public.ramadan_days add column if not exists published boolean not null default true;

alter table public.donation_receipt_requests
  add column if not exists postal_address text,
  add column if not exists donation_date date,
  add column if not exists transfer_reference text,
  add column if not exists privacy_accepted_at timestamptz;

alter table public.prayer_times
  drop constraint if exists prayer_times_time_format;
alter table public.prayer_times
  add constraint prayer_times_time_format check (
    fajr ~ '^[0-2][0-9]:[0-5][0-9]$' and
    sunrise ~ '^[0-2][0-9]:[0-5][0-9]$' and
    dhuhr ~ '^[0-2][0-9]:[0-5][0-9]$' and
    asr ~ '^[0-2][0-9]:[0-5][0-9]$' and
    maghrib ~ '^[0-2][0-9]:[0-5][0-9]$' and
    isha ~ '^[0-2][0-9]:[0-5][0-9]$'
  );

alter table public.donation_campaigns
  drop constraint if exists donation_campaigns_amounts_nonnegative;
alter table public.donation_campaigns
  add constraint donation_campaigns_amounts_nonnegative
  check (target_amount >= 0 and collected_amount >= 0 and end_date >= start_date);

alter table public.donation_receipt_requests
  drop constraint if exists donation_receipt_status_valid;
alter table public.donation_receipt_requests
  add constraint donation_receipt_status_valid check (status in ('Pending', 'Reviewed', 'Sent'));

create index if not exists prayer_times_date_published_idx on public.prayer_times(date, published);
create index if not exists announcements_published_created_idx on public.announcements(published, created_at desc);
create index if not exists events_date_published_idx on public.events(date, published);
create index if not exists receipt_requests_status_created_idx on public.donation_receipt_requests(status, created_at desc);
create unique index if not exists donation_reports_month_key on public.donation_reports(month);

-- Public content reads.
drop policy if exists "Public read events" on public.events;
create policy "Public read published events" on public.events for select to anon, authenticated
  using (published = true);

drop policy if exists "Public read ramadan" on public.ramadan_days;
create policy "Public read published ramadan" on public.ramadan_days for select to anon, authenticated
  using (published = true);

drop policy if exists "Public read donation reports" on public.donation_reports;
create policy "Public read donation reports" on public.donation_reports for select to anon, authenticated
  using (true);

-- Admin identity and private records are never public.
drop policy if exists "Admin users read own" on public.admin_users;
drop policy if exists "Admin users write super" on public.admin_users;
create policy "Admin users read own" on public.admin_users for select to authenticated
  using (
    user_id = (select auth.uid())
    or lower(email) = lower(coalesce((select auth.jwt() ->> 'email'), ''))
  );

drop policy if exists "Audit logs admin read" on public.audit_logs;
drop policy if exists "Audit logs admin write" on public.audit_logs;
create policy "Admins read audit logs" on public.audit_logs for select to authenticated
  using (
    exists (
      select 1 from public.admin_users au
      where au.user_id = (select auth.uid())
         or lower(au.email) = lower(coalesce((select auth.jwt() ->> 'email'), ''))
    )
  );

-- Authenticated administrators may read drafts and private admin lists.
do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'prayer_times', 'jumuah_times', 'announcements', 'donation_settings',
    'donation_campaigns', 'donations', 'donation_receipt_requests',
    'donation_reports', 'azkar_categories', 'azkar_items', 'events',
    'ramadan_days', 'mosque_settings'
  ]
  loop
    execute format('drop policy if exists "Administrators read all" on public.%I', table_name);
    execute format(
      'create policy "Administrators read all" on public.%I for select to authenticated using (exists (select 1 from public.admin_users au where au.user_id = (select auth.uid()) or lower(au.email) = lower(coalesce((select auth.jwt() ->> ''email''), ''''))))',
      table_name
    );
  end loop;
end $$;

-- Explicit Data API privileges. Writes remain server-only through the secret key.
revoke all on public.admin_users, public.audit_logs, public.donations, public.donation_receipt_requests from anon;
grant select on public.prayer_times, public.jumuah_times, public.announcements,
  public.donation_settings, public.donation_campaigns, public.donation_reports,
  public.azkar_categories, public.azkar_items, public.events, public.ramadan_days,
  public.mosque_settings to anon;
grant select on all tables in schema public to authenticated;
grant all on all tables in schema public to service_role;
