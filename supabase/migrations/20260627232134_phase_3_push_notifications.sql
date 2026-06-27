create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  browser_id uuid not null,
  enabled boolean not null default true,
  locale text not null default 'en' check (locale in ('ar', 'en', 'de', 'tr')),
  user_agent text,
  platform text,
  prayer_reminder_minutes integer check (
    prayer_reminder_minutes is null
    or prayer_reminder_minutes in (0, 5, 10, 15, 30)
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create index if not exists push_subscriptions_enabled_reminder_idx
  on public.push_subscriptions(enabled, prayer_reminder_minutes)
  where enabled = true;

create table if not exists public.push_notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  event_key text not null,
  subscription_id uuid not null references public.push_subscriptions(id) on delete cascade,
  notification_type text not null check (
    notification_type in (
      'urgent_announcement',
      'event',
      'donation_campaign',
      'friday_announcement',
      'prayer_reminder'
    )
  ),
  source_id text,
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed')),
  error_code text,
  attempted_at timestamptz not null default now(),
  sent_at timestamptz,
  unique (event_key, subscription_id)
);

create index if not exists push_notification_deliveries_event_idx
  on public.push_notification_deliveries(event_key);

alter table public.push_subscriptions enable row level security;
alter table public.push_notification_deliveries enable row level security;

revoke all on public.push_subscriptions, public.push_notification_deliveries
  from anon, authenticated;
grant all on public.push_subscriptions, public.push_notification_deliveries
  to service_role;
