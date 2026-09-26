-- Prayer event identity v3 binds delivery identity to the resolved due instant.
-- Keep p2 receipt IDs temporarily for old native clients during the additive rollout.
alter table public.native_prayer_delivery_receipts
  drop constraint if exists native_prayer_delivery_receipts_event_id_check;

alter table public.native_prayer_delivery_receipts
  add constraint native_prayer_delivery_receipts_event_id_check
  check (event_id ~ '^p[23]:[0-9a-f]{64}$');
