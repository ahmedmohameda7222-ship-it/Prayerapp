-- Version matches the migration identifier assigned by the production ledger.
alter table public.native_prayer_installations
  add column if not exists authority_id uuid not null default gen_random_uuid();

create unique index if not exists native_prayer_installations_authority_id_key
  on public.native_prayer_installations (authority_id);
