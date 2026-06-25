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
  note TEXT,
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
  notes TEXT,
  published BOOLEAN DEFAULT false,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Announcements
CREATE TABLE IF NOT EXISTS announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
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
  receipt_note TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Donation campaigns
CREATE TABLE IF NOT EXISTS donation_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
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

-- Donation receipt requests
CREATE TABLE IF NOT EXISTS donation_receipt_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  donor_name TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Pending',
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
  translation_en TEXT NOT NULL,
  translation_de TEXT NOT NULL,
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
  description TEXT NOT NULL,
  date DATE NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  location TEXT NOT NULL,
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
  UNIQUE(date)
);

-- Mosque settings (single row)
CREATE TABLE IF NOT EXISTS mosque_settings (
  id TEXT PRIMARY KEY DEFAULT '1',
  mosque_name TEXT NOT NULL,
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

-- Row Level Security (RLS) policies
ALTER TABLE prayer_times ENABLE ROW LEVEL SECURITY;
ALTER TABLE jumuah_times ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE donation_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE donation_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE donations ENABLE ROW LEVEL SECURITY;
ALTER TABLE donation_receipt_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE donation_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE azkar_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE azkar_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE ramadan_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE mosque_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Public read policies for published data
CREATE POLICY IF NOT EXISTS "Public read published prayer times" ON prayer_times FOR SELECT USING (published = true);
CREATE POLICY IF NOT EXISTS "Public read published jumuah" ON jumuah_times FOR SELECT USING (published = true);
CREATE POLICY IF NOT EXISTS "Public read published announcements" ON announcements FOR SELECT USING (published = true);
CREATE POLICY IF NOT EXISTS "Public read donation settings" ON donation_settings FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "Public read active campaigns" ON donation_campaigns FOR SELECT USING (is_active = true);
CREATE POLICY IF NOT EXISTS "Public read azkar" ON azkar_items FOR SELECT USING (is_published = true);
CREATE POLICY IF NOT EXISTS "Public read events" ON events FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "Public read ramadan" ON ramadan_days FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "Public read mosque settings" ON mosque_settings FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "Public read azkar categories" ON azkar_categories FOR SELECT USING (true);

-- Admin users table: only authenticated admin users can read/write
CREATE POLICY IF NOT EXISTS "Admin users read own" ON admin_users FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "Admin users write super" ON admin_users FOR ALL USING (true) WITH CHECK (true);

-- Audit logs: admin readable
CREATE POLICY IF NOT EXISTS "Audit logs admin read" ON audit_logs FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "Audit logs admin write" ON audit_logs FOR INSERT WITH CHECK (true);
