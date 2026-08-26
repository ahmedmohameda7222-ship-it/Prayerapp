-- Friday V2: one optional multilingual khutbah per Friday date.

CREATE TABLE IF NOT EXISTS public.friday_khutbahs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE UNIQUE NOT NULL,
  title_ar TEXT,
  content_ar TEXT,
  title_en TEXT,
  content_en TEXT,
  title_de TEXT,
  content_de TEXT,
  title_tr TEXT,
  content_tr TEXT,
  published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT friday_khutbahs_friday_date_check CHECK (EXTRACT(ISODOW FROM date) = 5)
);

ALTER TABLE public.friday_khutbahs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read published Friday khutbahs" ON public.friday_khutbahs;
CREATE POLICY "Public read published Friday khutbahs"
ON public.friday_khutbahs
FOR SELECT
TO anon, authenticated
USING (published = true);

-- Public clients need read-only access. Protected Admin writes use the
-- service-role server client after requireAllowedAdmin(), which bypasses RLS.
REVOKE ALL ON TABLE public.friday_khutbahs FROM anon, authenticated;
GRANT SELECT ON TABLE public.friday_khutbahs TO anon, authenticated;
