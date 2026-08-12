create table if not exists public.user_saved_azkar (
  user_id uuid not null references auth.users(id) on delete cascade,
  azkar_id text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, azkar_id)
);

alter table public.user_saved_azkar enable row level security;

drop policy if exists "Users read own saved azkar" on public.user_saved_azkar;
create policy "Users read own saved azkar"
  on public.user_saved_azkar for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users insert own saved azkar" on public.user_saved_azkar;
create policy "Users insert own saved azkar"
  on public.user_saved_azkar for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users delete own saved azkar" on public.user_saved_azkar;
create policy "Users delete own saved azkar"
  on public.user_saved_azkar for delete
  to authenticated
  using (auth.uid() = user_id);

grant select, insert, delete on public.user_saved_azkar to authenticated;

create table if not exists public.user_prayer_reminders (
  user_id uuid not null references auth.users(id) on delete cascade,
  prayer text not null check (prayer in ('fajr', 'dhuhr', 'asr', 'maghrib', 'isha')),
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, prayer)
);

alter table public.user_prayer_reminders enable row level security;

drop policy if exists "Users read own prayer reminders" on public.user_prayer_reminders;
create policy "Users read own prayer reminders"
  on public.user_prayer_reminders for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users insert own prayer reminders" on public.user_prayer_reminders;
create policy "Users insert own prayer reminders"
  on public.user_prayer_reminders for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users update own prayer reminders" on public.user_prayer_reminders;
create policy "Users update own prayer reminders"
  on public.user_prayer_reminders for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users delete own prayer reminders" on public.user_prayer_reminders;
create policy "Users delete own prayer reminders"
  on public.user_prayer_reminders for delete
  to authenticated
  using (auth.uid() = user_id);

grant select, insert, update, delete on public.user_prayer_reminders to authenticated;

alter table public.push_subscriptions
  add column if not exists user_id uuid references auth.users(id) on delete set null;

create index if not exists push_subscriptions_enabled_user_idx
  on public.push_subscriptions(enabled, user_id)
  where enabled = true and user_id is not null;

drop index if exists public.push_subscriptions_enabled_reminder_idx;

alter table public.push_subscriptions
  drop column if exists prayer_reminder_minutes;
