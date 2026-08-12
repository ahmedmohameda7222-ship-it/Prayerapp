# Masjid El-Rahman

Masjid El-Rahman is a multilingual web app for the Muslim community in Deggendorf. It publishes prayer times, mosque updates, Friday prayer details, events, news, Ramadan schedules, azkar, donation information, and basic admin workflows.

The app has moved from prototype toward a usable web product: public pages now load real Supabase-backed data when configured, admin pages can manage core content, and the app includes PWA/offline support, browser notification preferences, tests, CI, and deployment documentation.

## Main features

- Public prayer time schedule with today, week, and month views.
- Prayer countdown that uses the current Europe/Berlin date and schedule.
- News, announcements, urgent alerts, events, mosque info, Friday prayer, Ramadan, azkar, qibla, settings, privacy, and offline pages.
- Donation page with bank transfer details, campaigns, and transparency report.
- Admin dashboard and editors for prayer times, announcements, azkar, donations, events, Friday prayer, mosque settings, Ramadan, and app settings.
- CSV import for prayer times using `public/templates/prayer-times-template.csv`.
- Multilingual UI content in Arabic, German, English, and Turkish.
- Progressive Web App service worker with offline fallback.
- Basic health endpoint at `/api/health`.
- GitHub Actions CI for lint, tests, clean Supabase migration bootstrap, and production build.

## Tech stack

- Next.js App Router
- React
- TypeScript
- Supabase
- next-intl
- Vitest and React Testing Library
- Tailwind-style utility classes through CSS modules/global styles

## Environment variables

Create `.env.local` from `.env.example` and fill the values for your Supabase project:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SECRET_KEY=
ADMIN_EMAILS=
NEXT_PUBLIC_VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=mailto:admin@example.com
CRON_SECRET=
```

Legacy variable names are still supported for compatibility:

```bash
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

`ADMIN_EMAILS` should be a comma-separated list of admin email addresses. Admin auth is intentionally lightweight for the current planning/early-launch phase: Supabase email/password login plus an email allowlist. Add MFA, stronger roles, and stricter operational controls before the admin surface becomes high-risk.

If Supabase variables are not configured, the public app uses bundled demo data so the UI can still be reviewed locally. If Supabase is configured but fails, the app shows an error state instead of silently falling back to mock data.

## Local development

Install dependencies:

```bash
npm install
```

Create your environment file:

```bash
cp .env.example .env.local
```

Start the development server:

```bash
npm run dev
```

Open `http://localhost:3000`.

## Supabase setup

The ordered files in `supabase/migrations/` are the only database schema authority. Do not bootstrap or repair environments from a hand-maintained schema snapshot. A clean environment must be reproducible by applying the migration history from the initial migration forward.

For local verification:

```bash
supabase start
supabase db reset --local --no-seed
```

Initialize/link the hosted project only after confirming the exact project reference:

```bash
npx supabase link --project-ref <your-project-ref>
npx supabase migration list
npx supabase db push --dry-run
npx supabase db push
npx supabase migration list
```

Then:

1. Create a Supabase Auth user for each admin email.
2. Add those emails to `ADMIN_EMAILS`.
3. Sign in at `/admin/login`.
4. Run Supabase database lint/advisors after linking:

   ```bash
   npx supabase db lint
   ```

5. Enable backups or PITR according to the Supabase plan, and test a restore before real launch.

The migration history includes the initial schema, production-readiness hardening, prayer display settings, push notification storage, and Phase 1 account personalization with explicit Data API privileges.

## Admin workflows

Admin users can manage:

- Prayer times manually or through CSV import.
- Announcements, including urgent public alerts.
- News/events.
- Friday prayer details.
- Mosque contact, location, social, and bank information.
- Donation campaign/report content.
- Ramadan daily schedule.
- Azkar categories/items.
- App settings.

The admin area is not meant to be a final enterprise-grade control panel yet. Treat it as a practical first admin console for getting the web app used by real people.

## Validation commands

Run these before deploying:

```bash
npm run lint
npm test
supabase start
supabase db reset --local --no-seed
npm run build
node --check public/sw.js
git diff --check
```

## Deployment

Recommended deployment path:

1. Push the repository to GitHub.
2. Import the repo into Vercel.
3. Add all environment variables in Vercel.
4. Confirm the exact Supabase project ref, compare migration history, dry-run, and apply pending migrations.
5. Reconcile hosted Auth Site URL, allowed redirects, email confirmation, and SMTP before accepting account flows.
6. Create and verify the admin user.
7. Import real prayer times.
8. Smoke-test the public pages, `/admin`, and `/api/health`.

## PWA and notifications

The app includes an installable PWA, offline caching, real Web Push delivery, and a prayer-reminder scheduler. Generate one VAPID key pair with `npx web-push generate-vapid-keys`, set the public/private keys and contact subject in every deployment environment, and set a strong `CRON_SECRET`.

No Vercel cron configuration is committed because the current Hobby deployment does not support the required every-minute frequency. Configure a trusted external scheduler, or move to a hosting plan that supports the frequency, and send a `GET` request to `/api/cron/prayer-reminders` every minute with `Authorization: Bearer <CRON_SECRET>`.

Push subscriptions are device-scoped. Account-backed prayer reminder selections are stored per prayer and are delivered at each selected prayer's official adhan time. Apply the latest migration before enabling account-backed personalization in production.

## Privacy and legal notes

The `/privacy` page is a practical starter template. Before collecting real personal data, review it with the mosque/admin team and adapt it to local legal requirements.

Also verify public bank, contact, WhatsApp, Telegram, map, and donation campaign content before launch.

## Launch checklist

- Replace all demo/sample content.
- Verify a clean local migration reset.
- Confirm the exact hosted Supabase project ref and apply pending migrations through the CLI migration flow.
- Reconcile hosted Auth confirmation/redirect/SMTP settings.
- Create the allowed admin user.
- Import verified prayer times.
- Verify Friday prayer, Ramadan, and mosque settings.
- Review Supabase RLS policies and database advisors.
- Enable backups/PITR and monitoring.
- Review privacy/legal wording.
- Run the validation commands above.

## Known future improvements

- Stronger admin security if the app grows beyond the early phase.
- More granular admin roles.
- Audit log views and export tools.
- More complete donation accounting integrations.
- Native mobile apps if the community later needs them.
