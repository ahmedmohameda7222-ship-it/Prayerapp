-- Android v2 server delivery receipts. Existing v1 installations remain fail-open
-- because receipt_v2 defaults to false until a v2 native client explicitly reports it.
alter table public.native_prayer_installations
  add column if not exists receipt_v2 boolean not null default false,
  add column if not exists account_generation integer not null default 0
    check (account_generation >= 0);

create table public.native_prayer_delivery_receipts (
  installation_id uuid not null
    references public.native_prayer_installations(installation_id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  event_id text not null check (event_id ~ '^p2:[0-9a-f]{64}$'),
  kind text not null check (kind in ('reminder', 'adhan')),
  account_generation integer not null check (account_generation >= 0),
  delivered_at timestamptz not null,
  expires_at timestamptz not null default (now() + interval '2 days'),
  created_at timestamptz not null default now(),
  primary key (installation_id, account_generation, event_id),
  check (expires_at > delivered_at)
);

create index native_prayer_delivery_receipts_event_idx
  on public.native_prayer_delivery_receipts(event_id, expires_at, installation_id);

create index native_prayer_delivery_receipts_expiry_idx
  on public.native_prayer_delivery_receipts(expires_at);

alter table public.native_prayer_delivery_receipts enable row level security;

revoke all on public.native_prayer_delivery_receipts from public, anon, authenticated;
grant all on public.native_prayer_delivery_receipts to service_role;

comment on table public.native_prayer_delivery_receipts is
  'Short-retention server-only proof of successful native prayer delivery. No client role has direct access.';
