# Danube Mosque

Danube Mosque is the multilingual prayer and community application for Deggendorf. The approved public names are مسجد الدوناو (Arabic), Danube Mosque (English), Donau-Moschee (German), and Tuna Camii (Turkish).

The repository contains the Next.js web/PWA application, Supabase migrations and scheduler, and the native Android Trusted Web Activity package. The Android application ID is permanently `de.donaumoschee.app`.

## Current capabilities

- Mosque-published prayer schedules; the application does not calculate geographic prayer times.
- Jumu'ah, announcements, events, Ramadan, mosque information, donations, Azkar, qibla, and localized settings.
- Arabic, English, German, and Turkish UI with RTL support.
- Optional Supabase accounts for Saved Azkar and per-prayer reminder choices.
- Web Push for prayer reminders and public announcements.
- Installable PWA with offline navigation and deliberately bounded caching.
- A native Android TWA with exact-alarm scheduling, background/locked-screen Adhan playback, native reminder testing, and an authenticated web/native bridge.
- Server-backed, expiring native-authority leases so healthy native delivery deduplicates prayer Web Push while stale or unhealthy native state fails open to Web Push.
- Trusted direct-APK update discovery with package, signing-certificate, version, and SHA-256 metadata validation.
- Admin editors for published schedules and community content, protected by Supabase authentication plus `ADMIN_EMAILS` authorization on every mutation.

## Production content status

The software must never substitute fabricated public data when production configuration or records are missing. Public data loaders therefore return empty states, and the launch validator reports missing or placeholder data.

`CONTENT INPUT PENDING` currently means the mosque still needs to provide or approve verified real-world content such as:

- sufficient future prayer schedules from the mosque's official timetable;
- current Jumu'ah and Ramadan information;
- mosque organization, address, contact, social, and map details;
- bank, PayPal, campaign, and transparency information;
- final Privacy/Datenschutz and Impressum/provider wording reviewed by the mosque and legal adviser.

These are production-content gates. They do not justify mock data and are tracked separately from technical platform readiness.

## Environment variables

Copy `.env.example` to `.env.local`. Never commit populated environment files.

Required groups are:

- Browser Supabase access: `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (or the supported legacy anon-key name).
- Server Supabase access: `SUPABASE_SECRET_KEY` (or the supported legacy service-role name).
- Admin authorization: comma-separated `ADMIN_EMAILS`.
- Web Push: `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, and `VAPID_SUBJECT`.
- Optional server-side qibla reverse geocoding: `GEOAPIFY_API_KEY`.
- Optional scheduler authorization fallback: `CRON_SECRET`; production normally uses the private Supabase Vault token.

Signing credentials are CI secrets in the protected `android-production` GitHub environment. Never store APKs, AABs, JKS files, `signing.properties`, credentials, or private keys in Git.

## Local development

```bash
npm ci
npm run dev
```

Open `http://localhost:3000`. With Supabase variables absent, public database-backed surfaces show honest empty states; they do not display preview payment or schedule data.

## Supabase and scheduler

Files in `supabase/migrations/` are the ordered database authority. Apply them in sequence; do not replace migration history with a hand-maintained schema snapshot.

Production prayer reminders are scheduled every minute by Supabase `pg_cron`. The migration-managed job calls the canonical endpoint:

`https://donaumoschee.vercel.app/api/cron/prayer-reminders`

It authenticates with a private token in Supabase Vault and records the HTTP request through `pg_net`. Do not configure a second scheduler for the same job. Operational checks should confirm:

1. exactly one enabled `prayer-reminders-every-minute` job;
2. the canonical production endpoint only;
3. recent consecutive HTTP 200 responses;
4. no published QA/mock schedules capable of triggering notifications;
5. enough verified future mosque schedule coverage before launch.

For a local clean-migration check:

```bash
supabase start
supabase db reset --local --no-seed
supabase db lint
```

For a linked environment, confirm the exact project reference before using `supabase migration list` or a dry-run. Production database changes require the normal reviewed migration flow.

## Authentication and legal surfaces

The public application works without an account. Account deletion is available from `/account` and removes account-owned Saved Azkar and reminder data while detaching notification devices.

`/privacy` and `/imprint` are implemented technical surfaces. Their current copy explicitly identifies unverified legal/provider information as pending; it is not a substitute for final legal approval. Before launch, verify Supabase Auth Site URL and redirect allowlist, email confirmation and SMTP delivery, rate limits, leaked-password protection, admin MFA, and the final legal/controller/contact text.

## PWA and Web Push

`public/sw.js` owns offline navigation, update activation, asset caching, and Web Push. It bypasses admin/API/authenticated requests and uses network-first behavior for navigations and stable public assets so an old cache cannot hide a new deployment indefinitely.

The cache prefix `deggendorf-prayer` is a legacy internal compatibility key. Do not rename it without a deliberate cache migration. The current icons are installable `any` icons; a dedicated safe-zone-verified maskable artwork remains a design enhancement rather than a reason to label the existing icon incorrectly.

Prayer notifications use the mosque-published schedule. Announcement/news pushes are independent of native prayer-authority deduplication.

## Android workflows

`.github/workflows/android-twa.yml` verifies Android code and produces unsigned source-bound candidate inputs. Its protected signing job can create a signed, private release-candidate APK/AAB artifact for physical testing without a public GitHub release or tag.

`.github/workflows/android-production-release.yml` is the separate explicitly authorized public release path. It verifies the expected tag and creates signed assets plus `android-release.json`. Do not run it for an RC-only review.

The permanent production identity is:

- package: `de.donaumoschee.app`
- origin: `https://donaumoschee.vercel.app`
- signing SHA-256: `E9:98:4B:DB:36:FF:2F:8F:A5:58:29:5C:5C:06:6F:BA:ED:3A:BD:BD:CC:80:1C:83:5D:AE:1B:DD:4C:D7:0E:92`

Physical-device approval must cover install/update without uninstall, TWA verification, notification permissions, exact alarms, screen-locked Adhan, reboot rescheduling, the 10-second native test path, account switching, offline behavior, and native/Web Push failover.

## Validation

Run before requesting review:

```bash
npm ci
npm run lint
npm test
npm audit --omit=dev
npm audit
npm run build
node --check public/sw.js
git diff --check
```

Android validation is defined in Gradle and the GitHub workflows and includes unit tests, release lint, APK/AAB assembly, metadata validation, certificate verification, package/version/target SDK inspection, and checksums.

## Deployment and launch boundary

The canonical Vercel production project serves `https://donaumoschee.vercel.app`. A source branch, passing CI, signed RC, or successful preview does not authorize a production deploy, merge, Android tag, GitHub release, or public launch.

Before an explicitly approved production launch:

1. confirm the exact reviewed Git SHA and a clean worktree;
2. require green web, migration, Android, and security validation on that exact SHA;
3. verify Vercel production environment names without printing secret values;
4. reconcile production Supabase migrations, advisors, Auth settings, backups/PITR, and scheduler evidence;
5. load and validate all `CONTENT INPUT PENDING` records;
6. approve final legal text;
7. complete signed RC physical-device testing;
8. deploy only after a separate explicit authorization, then verify the canonical domain, APIs, asset links, logs, and deployment metadata.

Technical platform readiness and production content readiness must always be reported independently.
