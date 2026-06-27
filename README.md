# Deggendorf Prayer

Deggendorf Prayer is a multilingual web app for the Muslim community in Deggendorf. It publishes prayer times, mosque updates, Friday prayer details, events, news, Ramadan schedules, azkar, donation information, and basic admin workflows.

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
- GitHub Actions CI for lint, tests, service worker syntax, and production build.

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

Initialize/link the project:

```bash
npx supabase link --project-ref <your-project-ref>
```

Apply the database migration:

```bash
npx supabase db push
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

The migration adds production-readiness constraints, indexes, Row Level Security policies, publish/active flags, admin user mapping, and donation report uniqueness rules.

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
npm run build
node --check public/sw.js
git diff --check
```

## Deployment

Recommended deployment path:

1. Push the repository to GitHub.
2. Import the repo into Vercel.
3. Add all environment variables in Vercel.
4. Apply Supabase migrations with `npx supabase db push`.
5. Create and verify the admin user.
6. Import real prayer times.
7. Smoke-test the public pages, `/admin`, and `/api/health`.

## PWA and notifications

The app includes an installable PWA, offline caching, real Web Push delivery, and a prayer-reminder scheduler. Generate one VAPID key pair with `npx web-push generate-vapid-keys`, set the public/private keys and contact subject in every deployment environment, and set a strong `CRON_SECRET`.

`vercel.json` invokes `/api/cron/prayer-reminders` every minute. The production hosting plan must support that frequency. On another host, configure a trusted scheduler to send a `GET` request every minute with `Authorization: Bearer <CRON_SECRET>`.

Push subscriptions and prayer timing preferences are stored in Supabase. Apply the latest migration before enabling the UI in production.

## Privacy and legal notes

The `/privacy` page is a practical starter template. Before collecting real personal data, review it with the mosque/admin team and adapt it to local legal requirements.

Also verify public bank, contact, WhatsApp, Telegram, map, and donation campaign content before launch.

## Launch checklist

- Replace all demo/sample content.
- Apply Supabase migrations.
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
