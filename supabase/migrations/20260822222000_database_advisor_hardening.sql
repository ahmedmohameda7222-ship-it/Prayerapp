-- Cover foreign keys reported by the production advisor.
create index if not exists native_prayer_installations_user_id_idx
  on public.native_prayer_installations (user_id);

create index if not exists push_notification_deliveries_subscription_id_idx
  on public.push_notification_deliveries (subscription_id);

create index if not exists push_subscriptions_user_id_idx
  on public.push_subscriptions (user_id);

-- Evaluate auth.uid() once per statement while preserving the exact existing
-- ownership predicates for personal rows.
drop policy if exists "Users read own saved azkar" on public.user_saved_azkar;
create policy "Users read own saved azkar"
  on public.user_saved_azkar for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users insert own saved azkar" on public.user_saved_azkar;
create policy "Users insert own saved azkar"
  on public.user_saved_azkar for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users delete own saved azkar" on public.user_saved_azkar;
create policy "Users delete own saved azkar"
  on public.user_saved_azkar for delete to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users read own prayer reminders" on public.user_prayer_reminders;
create policy "Users read own prayer reminders"
  on public.user_prayer_reminders for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users insert own prayer reminders" on public.user_prayer_reminders;
create policy "Users insert own prayer reminders"
  on public.user_prayer_reminders for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users update own prayer reminders" on public.user_prayer_reminders;
create policy "Users update own prayer reminders"
  on public.user_prayer_reminders for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users delete own prayer reminders" on public.user_prayer_reminders;
create policy "Users delete own prayer reminders"
  on public.user_prayer_reminders for delete to authenticated
  using ((select auth.uid()) = user_id);
