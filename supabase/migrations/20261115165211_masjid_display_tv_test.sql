-- Short-lived remote rehearsal controls for the physical mosque TV.
-- Never changes prayer_times, display_settings, Feed, or runtime calculation.
CREATE TABLE IF NOT EXISTS public.masjid_display_tv_test (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  scenario text NOT NULL CHECK (scenario IN (
    'PRAYER_APPROACHING', 'PRAYER_TIME_NOW', 'WAITING_FOR_IQAMA',
    'IQAMA_NOW', 'PRAYER_IN_PROGRESS', 'POST_PRAYER_AZKAR',
    'FRIDAY_MODE', 'JUMUAH_NOW', 'NORMAL', 'NEXT_PRAYER',
    'AZKAR', 'ANNOUNCEMENT', 'SPECIAL', 'EVENT', 'CAMPAIGN',
    'MAGHRIB_PROGRAM'
  )),
  prayer text CHECK (prayer IS NULL OR prayer IN ('fajr','dhuhr','asr','maghrib','isha')),
  started_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT tv_test_scope_check CHECK (
    (scenario IN (
      'PRAYER_APPROACHING', 'PRAYER_TIME_NOW', 'WAITING_FOR_IQAMA',
      'IQAMA_NOW', 'PRAYER_IN_PROGRESS', 'POST_PRAYER_AZKAR'
    ) AND prayer IS NOT NULL)
    OR
    (scenario NOT IN (
      'PRAYER_APPROACHING', 'PRAYER_TIME_NOW', 'WAITING_FOR_IQAMA',
      'IQAMA_NOW', 'PRAYER_IN_PROGRESS', 'POST_PRAYER_AZKAR'
    ) AND prayer IS NULL)
  ),
  CONSTRAINT tv_test_ttl_check CHECK (
    expires_at > started_at AND expires_at <= started_at + interval '3 minutes'
  )
);
ALTER TABLE public.masjid_display_tv_test ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.masjid_display_tv_test FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.masjid_display_tv_test TO service_role;
-- Only root server service role reads and writes this table.
-- The public route sends strictly sanitized, expiring scenario data.
