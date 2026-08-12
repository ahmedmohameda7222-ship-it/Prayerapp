-- Phase 1 post-merge correction: make personal Data API privileges explicit.
-- This is forward-only; the merged Phase 1 migration remains immutable.

revoke all on public.user_saved_azkar, public.user_prayer_reminders from anon;

grant select, insert, delete on public.user_saved_azkar to authenticated;
grant select, insert, update, delete on public.user_prayer_reminders to authenticated;

-- The server-side prayer reminder scheduler only needs to read reminder choices.
grant select on public.user_prayer_reminders to service_role;
