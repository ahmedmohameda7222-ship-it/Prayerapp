alter table public.user_prayer_reminders
  add column if not exists lead_minutes smallint not null default 0;

update public.user_prayer_reminders
set lead_minutes = 0
where lead_minutes not in (0, 5, 10, 15);

alter table public.user_prayer_reminders
  drop constraint if exists user_prayer_reminders_lead_minutes_check;

alter table public.user_prayer_reminders
  add constraint user_prayer_reminders_lead_minutes_check
  check (lead_minutes in (0, 5, 10, 15));
