
-- Migration: remove deprecated donation receipt feature
-- Removes receipt_note columns from donation_settings and drops donation_receipt_requests table

ALTER TABLE IF EXISTS public.donation_settings
  DROP COLUMN IF EXISTS receipt_note,
  DROP COLUMN IF EXISTS receipt_note_ar,
  DROP COLUMN IF EXISTS receipt_note_en,
  DROP COLUMN IF EXISTS receipt_note_de,
  DROP COLUMN IF EXISTS receipt_note_tr;

DROP TABLE IF EXISTS public.donation_receipt_requests;
