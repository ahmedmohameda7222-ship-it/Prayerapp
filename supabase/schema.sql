-- Deggendorf Prayer - Supabase Schema
-- Run this in your Supabase SQL Editor

-- Prayer times
CREATE TABLE IF NOT EXISTS prayer_times (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  fajr TEXT NOT NULL,
  sunrise TEXT NOT NULL,
  dhuhr TEXT NOT NULL,
  asr TEXT NOT NULL,
  maghrib TEXT NOT NULL,
  isha TEXT NOT NULL,
  fajr_iqama TEXT,
  dhuhr_iqama TEXT,
  asr_iqama TEXT,
  maghrib_iqama TEXT,
  isha_iqama TEXT,
  maghrib_program_enabled BOOLEAN NOT NULL DEFAULT false,
  maghrib_lesson_title TEXT,
  maghrib_lesson_duration_minutes INTEGER,
  maghrib_combined_isha_time TEXT,
  note TEXT,
  note_ar TEXT,
  note_en TEXT,
  note_de TEXT,
  note_tr TEXT,
  published BOOLEAN DEFAULT false,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(date)
);

-- Jumu'ah times
CREATE TABLE IF NOT EXISTS jumuah_times (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  khutbah_time TEXT NOT NULL,
  prayer_time TEXT NOT NULL,
  location_name TEXT NOT NULL,
  location_address TEXT NOT NULL,
  khateeb_name TEXT NOT NULL,
  language TEXT NOT NULL,
  language_ar TEXT,
  language_en TEXT,
  language_de TEXT,
  language_tr TEXT,
  notes TEXT,
  notes_ar TEXT,
  notes_en TEXT,
  notes_de TEXT,
  notes_tr TEXT,
  published BOOLEAN DEFAULT false,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Announcements
CREATE TABLE IF NOT EXISTS announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  title_ar TEXT,
  title_en TEXT,
  title_de TEXT,
  title_tr TEXT,
  message TEXT NOT NULL,
  message_ar TEXT,
  message_en TEXT,
  message_de TEXT,
  message_tr TEXT,
  type TEXT NOT NULL DEFAULT 'General',
  is_urgent BOOLEAN DEFAULT false,
  published BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Donation settings (single row)
CREATE TABLE IF NOT EXISTS donation_settings (
  id TEXT PRIMARY KEY DEFAULT '1',
  account_holder TEXT NOT NULL,
  iban TEXT NOT NULL,
  bic TEXT NOT NULL,
  paypal_link TEXT,
  default_purpose TEXT NOT NULL,
  default_purpose_ar TEXT,
  default_purpose_en TEXT,
  default_purpose_de TEXT,
  default_purpose_tr TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Donation campaigns
CREATE TABLE IF NOT EXISTS donation_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  title_ar TEXT,
  title_en TEXT,
  title_de TEXT,
  title_tr TEXT,
  description TEXT NOT NULL,
  description_ar TEXT,
  description_en TEXT,
  description_de TEXT,
  description_tr TEXT,
  target_amount NUMERIC NOT NULL DEFAULT 0,
  collected_amount NUMERIC NOT NULL DEFAULT 0,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Donations
CREATE TABLE IF NOT EXISTS donations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  amount NUMERIC NOT NULL DEFAULT 0,
  purpose TEXT NOT NULL,
  donor_name TEXT,
  received_at DATE NOT NULL,
  method TEXT NOT NULL DEFAULT 'Bank transfer',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Donation reports
CREATE TABLE IF NOT EXISTS donation_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  month TEXT NOT NULL,
  monthly_need NUMERIC NOT NULL DEFAULT 0,
  donations_received NUMERIC NOT NULL DEFAULT 0,
  remaining NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Azkar categories
CREATE TABLE IF NOT EXISTS azkar_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  sort_order INTEGER NOT NULL DEFAULT 0
);

-- Azkar items
CREATE TABLE IF NOT EXISTS azkar_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,
  arabic_text TEXT NOT NULL,
  transliteration TEXT NOT NULL,
  translation_ar TEXT,
  translation_en TEXT NOT NULL,
  translation_de TEXT NOT NULL,
  translation_tr TEXT,
  repeat_count INTEGER NOT NULL DEFAULT 1,
  source TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_published BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Events
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  title_ar TEXT,
  title_en TEXT,
  title_de TEXT,
  title_tr TEXT,
  description TEXT NOT NULL,
  description_ar TEXT,
  description_en TEXT,
  description_de TEXT,
  description_tr TEXT,
  date DATE NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  location TEXT NOT NULL,
  location_ar TEXT,
  location_en TEXT,
  location_de TEXT,
  location_tr TEXT,
  type TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ramadan days
CREATE TABLE IF NOT EXISTS ramadan_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  ramadan_day INTEGER NOT NULL,
  imsak TEXT NOT NULL,
  fajr TEXT NOT NULL,
  maghrib TEXT NOT NULL,
  iftar TEXT NOT NULL,
  taraweeh TEXT NOT NULL,
  note TEXT,
  note_ar TEXT,
  note_en TEXT,
  note_de TEXT,
  note_tr TEXT,
  UNIQUE(date)
);

-- Mosque settings (single row)
CREATE TABLE IF NOT EXISTS mosque_settings (
  id TEXT PRIMARY KEY DEFAULT '1',
  mosque_name TEXT NOT NULL,
  mosque_name_ar TEXT,
  mosque_name_en TEXT,
  mosque_name_de TEXT,
  mosque_name_tr TEXT,
  address TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  google_maps_link TEXT NOT NULL,
  whatsapp_link TEXT NOT NULL,
  telegram_link TEXT NOT NULL,
  account_holder TEXT NOT NULL,
  iban TEXT NOT NULL,
  bic TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Admin users
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'Viewer',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor TEXT NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add entity_type and entity_id columns if they don't exist (safe migration)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'audit_logs' AND column_name = 'entity_type'
  ) THEN
    ALTER TABLE audit_logs ADD COLUMN entity_type TEXT;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'audit_logs' AND column_name = 'entity_id'
  ) THEN
    ALTER TABLE audit_logs ADD COLUMN entity_id TEXT;
  END IF;
END
$$;

-- Multilingual content columns (safe migration / backfill)
ALTER TABLE IF EXISTS prayer_times
  ADD COLUMN IF NOT EXISTS maghrib_program_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS maghrib_lesson_title TEXT,
  ADD COLUMN IF NOT EXISTS maghrib_lesson_duration_minutes INTEGER,
  ADD COLUMN IF NOT EXISTS maghrib_combined_isha_time TEXT,
  ADD COLUMN IF NOT EXISTS note_ar TEXT,
  ADD COLUMN IF NOT EXISTS note_en TEXT,
  ADD COLUMN IF NOT EXISTS note_de TEXT,
  ADD COLUMN IF NOT EXISTS note_tr TEXT;
UPDATE prayer_times SET note_ar = note WHERE note_ar IS NULL AND note IS NOT NULL;

ALTER TABLE IF EXISTS jumuah_times
  ADD COLUMN IF NOT EXISTS language_ar TEXT,
  ADD COLUMN IF NOT EXISTS language_en TEXT,
  ADD COLUMN IF NOT EXISTS language_de TEXT,
  ADD COLUMN IF NOT EXISTS language_tr TEXT,
  ADD COLUMN IF NOT EXISTS notes_ar TEXT,
  ADD COLUMN IF NOT EXISTS notes_en TEXT,
  ADD COLUMN IF NOT EXISTS notes_de TEXT,
  ADD COLUMN IF NOT EXISTS notes_tr TEXT;
UPDATE jumuah_times SET language_ar = language WHERE language_ar IS NULL AND language IS NOT NULL;
UPDATE jumuah_times SET notes_ar = notes WHERE notes_ar IS NULL AND notes IS NOT NULL;

ALTER TABLE IF EXISTS announcements
  ADD COLUMN IF NOT EXISTS title_ar TEXT,
  ADD COLUMN IF NOT EXISTS title_en TEXT,
  ADD COLUMN IF NOT EXISTS title_de TEXT,
  ADD COLUMN IF NOT EXISTS title_tr TEXT,
  ADD COLUMN IF NOT EXISTS message_ar TEXT,
  ADD COLUMN IF NOT EXISTS message_en TEXT,
  ADD COLUMN IF NOT EXISTS message_de TEXT,
  ADD COLUMN IF NOT EXISTS message_tr TEXT;
UPDATE announcements SET title_ar = title WHERE title_ar IS NULL AND title IS NOT NULL;
UPDATE announcements SET message_ar = message WHERE message_ar IS NULL AND message IS NOT NULL;

ALTER TABLE IF EXISTS donation_settings
  ADD COLUMN IF NOT EXISTS default_purpose_ar TEXT,
  ADD COLUMN IF NOT EXISTS default_purpose_en TEXT,
  ADD COLUMN IF NOT EXISTS default_purpose_de TEXT,
  ADD COLUMN IF NOT EXISTS default_purpose_tr TEXT;
UPDATE donation_settings SET default_purpose_ar = default_purpose WHERE default_purpose_ar IS NULL AND default_purpose IS NOT NULL;

ALTER TABLE IF EXISTS donation_campaigns
  ADD COLUMN IF NOT EXISTS title_ar TEXT,
  ADD COLUMN IF NOT EXISTS title_en TEXT,
  ADD COLUMN IF NOT EXISTS title_de TEXT,
  ADD COLUMN IF NOT EXISTS title_tr TEXT,
  ADD COLUMN IF NOT EXISTS description_ar TEXT,
  ADD COLUMN IF NOT EXISTS description_en TEXT,
  ADD COLUMN IF NOT EXISTS description_de TEXT,
  ADD COLUMN IF NOT EXISTS description_tr TEXT;
UPDATE donation_campaigns SET title_ar = title WHERE title_ar IS NULL AND title IS NOT NULL;
UPDATE donation_campaigns SET description_ar = description WHERE description_ar IS NULL AND description IS NOT NULL;

ALTER TABLE IF EXISTS events
  ADD COLUMN IF NOT EXISTS title_ar TEXT,
  ADD COLUMN IF NOT EXISTS title_en TEXT,
  ADD COLUMN IF NOT EXISTS title_de TEXT,
  ADD COLUMN IF NOT EXISTS title_tr TEXT,
  ADD COLUMN IF NOT EXISTS description_ar TEXT,
  ADD COLUMN IF NOT EXISTS description_en TEXT,
  ADD COLUMN IF NOT EXISTS description_de TEXT,
  ADD COLUMN IF NOT EXISTS description_tr TEXT,
  ADD COLUMN IF NOT EXISTS location_ar TEXT,
  ADD COLUMN IF NOT EXISTS location_en TEXT,
  ADD COLUMN IF NOT EXISTS location_de TEXT,
  ADD COLUMN IF NOT EXISTS location_tr TEXT;
UPDATE events SET title_ar = title WHERE title_ar IS NULL AND title IS NOT NULL;
UPDATE events SET description_ar = description WHERE description_ar IS NULL AND description IS NOT NULL;
UPDATE events SET location_ar = location WHERE location_ar IS NULL AND location IS NOT NULL;

ALTER TABLE IF EXISTS ramadan_days
  ADD COLUMN IF NOT EXISTS note_ar TEXT,
  ADD COLUMN IF NOT EXISTS note_en TEXT,
  ADD COLUMN IF NOT EXISTS note_de TEXT,
  ADD COLUMN IF NOT EXISTS note_tr TEXT;
UPDATE ramadan_days SET note_ar = note WHERE note_ar IS NULL AND note IS NOT NULL;

ALTER TABLE IF EXISTS azkar_items
  ADD COLUMN IF NOT EXISTS translation_ar TEXT,
  ADD COLUMN IF NOT EXISTS translation_tr TEXT;
UPDATE azkar_items SET translation_ar = arabic_text WHERE translation_ar IS NULL AND arabic_text IS NOT NULL;

ALTER TABLE IF EXISTS mosque_settings
  ADD COLUMN IF NOT EXISTS mosque_name_ar TEXT,
  ADD COLUMN IF NOT EXISTS mosque_name_en TEXT,
  ADD COLUMN IF NOT EXISTS mosque_name_de TEXT,
  ADD COLUMN IF NOT EXISTS mosque_name_tr TEXT;
UPDATE mosque_settings SET mosque_name_ar = mosque_name WHERE mosque_name_ar IS NULL AND mosque_name IS NOT NULL;

-- Row Level Security (RLS) policies
ALTER TABLE prayer_times ENABLE ROW LEVEL SECURITY;
ALTER TABLE jumuah_times ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE donation_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE donation_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE donations ENABLE ROW LEVEL SECURITY;
ALTER TABLE donation_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE azkar_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE azkar_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE ramadan_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE mosque_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Public read policies for published data
-- PostgreSQL/Supabase does not support CREATE POLICY IF NOT EXISTS.
-- Drop-and-recreate keeps this schema safe to run multiple times.
DROP POLICY IF EXISTS "Public read published prayer times" ON prayer_times;
CREATE POLICY "Public read published prayer times"
ON prayer_times
FOR SELECT
USING (published = true);

DROP POLICY IF EXISTS "Public read published jumuah" ON jumuah_times;
CREATE POLICY "Public read published jumuah"
ON jumuah_times
FOR SELECT
USING (published = true);

DROP POLICY IF EXISTS "Public read published announcements" ON announcements;
CREATE POLICY "Public read published announcements"
ON announcements
FOR SELECT
USING (published = true);

DROP POLICY IF EXISTS "Public read donation settings" ON donation_settings;
CREATE POLICY "Public read donation settings"
ON donation_settings
FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Public read active campaigns" ON donation_campaigns;
CREATE POLICY "Public read active campaigns"
ON donation_campaigns
FOR SELECT
USING (is_active = true);

DROP POLICY IF EXISTS "Public read azkar" ON azkar_items;
CREATE POLICY "Public read azkar"
ON azkar_items
FOR SELECT
USING (is_published = true);

DROP POLICY IF EXISTS "Public read events" ON events;
CREATE POLICY "Public read events"
ON events
FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Public read ramadan" ON ramadan_days;
CREATE POLICY "Public read ramadan"
ON ramadan_days
FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Public read mosque settings" ON mosque_settings;
CREATE POLICY "Public read mosque settings"
ON mosque_settings
FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Public read azkar categories" ON azkar_categories;
CREATE POLICY "Public read azkar categories"
ON azkar_categories
FOR SELECT
USING (true);

-- Admin users table: only authenticated admin users can read/write
DROP POLICY IF EXISTS "Admin users read own" ON admin_users;
CREATE POLICY "Admin users read own"
ON admin_users
FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Admin users write super" ON admin_users;
CREATE POLICY "Admin users write super"
ON admin_users
FOR ALL
USING (true)
WITH CHECK (true);

-- Audit logs: admin readable
DROP POLICY IF EXISTS "Audit logs admin read" ON audit_logs;
CREATE POLICY "Audit logs admin read"
ON audit_logs
FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Audit logs admin write" ON audit_logs;
CREATE POLICY "Audit logs admin write"
ON audit_logs
FOR INSERT
WITH CHECK (true);

-- Production-readiness hardening for the Deggendorf Prayer web app.

alter table public.admin_users
  add column if not exists user_id uuid references auth.users(id) on delete set null;
create unique index if not exists admin_users_user_id_key
  on public.admin_users(user_id) where user_id is not null;

alter table public.events add column if not exists published boolean not null default true;
alter table public.ramadan_days add column if not exists published boolean not null default true;

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

alter table public.prayer_times
  drop constraint if exists prayer_times_maghrib_program_format;
alter table public.prayer_times
  add constraint prayer_times_maghrib_program_format check (
    (maghrib_combined_isha_time is null or maghrib_combined_isha_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$')
    and (maghrib_lesson_duration_minutes is null or maghrib_lesson_duration_minutes between 1 and 240)
    and (maghrib_lesson_title is null or char_length(maghrib_lesson_title) <= 160)
  );

alter table public.donation_campaigns
  drop constraint if exists donation_campaigns_amounts_nonnegative;
alter table public.donation_campaigns
  add constraint donation_campaigns_amounts_nonnegative
  check (target_amount >= 0 and collected_amount >= 0 and end_date >= start_date);

create index if not exists prayer_times_date_published_idx on public.prayer_times(date, published);
create index if not exists announcements_published_created_idx on public.announcements(published, created_at desc);
create index if not exists events_date_published_idx on public.events(date, published);
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
    'donation_campaigns', 'donations', 'donation_reports',
    'azkar_categories', 'azkar_items', 'events',
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
revoke all on public.admin_users, public.audit_logs, public.donations from anon;
grant select on public.prayer_times, public.jumuah_times, public.announcements,
  public.donation_settings, public.donation_campaigns, public.donation_reports,
  public.azkar_categories, public.azkar_items, public.events, public.ramadan_days,
  public.mosque_settings to anon;
grant select on all tables in schema public to authenticated;
grant all on all tables in schema public to service_role;

-- Safe migration: remove deprecated receipt-related columns and table
ALTER TABLE IF EXISTS donation_settings
  DROP COLUMN IF EXISTS receipt_note,
  DROP COLUMN IF EXISTS receipt_note_ar,
  DROP COLUMN IF EXISTS receipt_note_en,
  DROP COLUMN IF EXISTS receipt_note_de,
  DROP COLUMN IF EXISTS receipt_note_tr;

DROP TABLE IF EXISTS donation_receipt_requests;
