-- Version matches the migration identifier assigned by the production ledger.
alter table public.native_prayer_installations
  add column if not exists revoked_at timestamptz;

create index if not exists native_prayer_installations_revoked_at_idx
  on public.native_prayer_installations (revoked_at)
  where revoked_at is not null;
