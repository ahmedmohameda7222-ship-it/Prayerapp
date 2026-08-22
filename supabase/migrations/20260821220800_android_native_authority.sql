create table public.native_prayer_installations (
  installation_id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  push_subscription_id uuid references public.push_subscriptions(id) on delete set null,
  credential_hash text not null check (credential_hash ~ '^[0-9a-f]{64}$'),
  native_ready boolean not null default false,
  notification_permission boolean not null default false,
  notification_delivery_enabled boolean not null default false,
  reminder_channel_enabled boolean not null default false,
  adhan_channel_enabled boolean not null default false,
  exact_alarm_permission boolean not null default false,
  schedule_fresh boolean not null default false,
  alarm_schedule_installed boolean not null default false,
  audio_ready boolean not null default false,
  engine_healthy boolean not null default false,
  schedule_valid_until timestamptz,
  lease_expires_at timestamptz,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index native_prayer_installations_push_subscription_idx
  on public.native_prayer_installations(push_subscription_id)
  where push_subscription_id is not null;

create index native_prayer_installations_active_lease_idx
  on public.native_prayer_installations(push_subscription_id, lease_expires_at)
  where native_ready = true;

alter table public.native_prayer_installations enable row level security;

revoke all on public.native_prayer_installations from public, anon, authenticated;
grant all on public.native_prayer_installations to service_role;

comment on table public.native_prayer_installations is
  'Short-lived fail-open native prayer delivery authority. Server routes are the only access path.';
