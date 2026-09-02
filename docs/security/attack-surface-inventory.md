# Prayerapp Attack Surface Inventory

Date: 2026-09-02

The machine-readable inventory is stored at `docs/security/prelaunch/2026-09-02/source-surface-inventory.json`.

## Public And Account Web Surfaces

Public pages include `/`, `/times`, `/friday`, `/friday/khutbah/[date]`, `/news`, `/events`, `/donations`, `/azkar`, `/ramadan`, `/qibla`, `/mosque`, `/settings`, `/more`, `/privacy`, `/imprint`, `/offline`, and Android download routes. Account pages include `/account`, `/account/sign-in`, `/account/register`, `/account/forgot-password`, and `/account/reset-password`.

User-controlled inputs include query strings, account credentials/tokens handled by Supabase Auth UI, locale/cookie/Accept-Language selection, Qibla/geocode data, notification permission/subscription flows, app settings, and public route path parameters.

## API Routes

| Route file | Primary surface |
| --- | --- |
| `app/api/account/delete/route.ts` | Authenticated account deletion |
| `app/api/admin/launch-readiness/route.ts` | Admin launch-readiness report |
| `app/api/android/adhan-catalog/route.ts` | Native approved Adhan catalog |
| `app/api/android/native-authority/enroll/route.ts` | Native authority enrollment |
| `app/api/android/native-authority/heartbeat/route.ts` | Native authority heartbeat/revoke |
| `app/api/android/native-authority/receipt/route.ts` | Native delivery receipt ingestion |
| `app/api/android/prayer-schedule/route.ts` | Native schedule sync |
| `app/api/android/release/route.ts` | Android public release metadata |
| `app/api/cron/prayer-reminders/route.ts` | Cron-triggered prayer notification delivery |
| `app/api/geocode/route.ts` | Geocode proxy/API-key use |
| `app/api/health/route.ts` | Health check |
| `app/api/push/subscriptions/route.ts` | Web Push subscription registration/deletion |
| `app/api/push/test/route.ts` | Push test route |
| `app/api/reverse-geocode/route.ts` | Reverse-geocode proxy |

No third-party webhook receiver was found in source. Callback-like behavior is limited to Supabase Auth redirects handled by account pages, GitHub/Vercel deployment status callbacks outside the app, and Android app links/TWA relation validation.

## Admin Mutation Surfaces

Privileged server actions:

- `app/admin/announcements/actions.ts`
- `app/admin/donations/actions.ts`
- `app/admin/events/actions.ts`
- `app/admin/jumuah/actions.ts`
- `app/admin/jumuah/khutbah-actions.ts`
- `app/admin/prayer-times/actions.ts`
- `app/admin/ramadan/actions.ts`
- `app/admin/settings/actions.ts`

Existing validation is per-action and inconsistent. Durable admin audit logging is not yet implemented across all high-impact actions. These surfaces are Wave 1 and Wave 2 owners.

## Supabase Surface

Tables in the production public schema include published-content tables, account/private tables, push tables, native authority table, security rate-limit state, and existing `audit_logs`. RLS is enabled across the probed public tables, but grants/policies/functions must be verified per control and production schema drift must be reconciled before mutation.

The production migration history stops at `20260822201832`, while current source includes later migrations for native receipts, Friday khutbahs, security rate limits, and atomic push registration. Read-only schema evidence shows partial later state: `register_push_subscription` exists, `security_rate_limits` exists, and native receipt v2 table/columns are absent from the initial probe.

## PWA And Service Worker Surface

`public/sw.js` precaches the shell, offline page, manifest, icons, and public images. It avoids caching admin/account/API/Supabase/authorization-bearing requests via `isPrivateOrDataRequest`, trims caches, uses network-first for mutable public assets, handles push events, ignores stale prayer pushes, and constrains notification-click navigation to same-origin URLs. Evidence: `public/sw.js:1-290`.

## Android Surface

Android surfaces include:

- TWA launcher and HTTPS app-link intent filter.
- AndroidX Browser postMessage service and TWA delegation service.
- Native permission activity for notifications/exact alarms.
- Media3 playback service for Adhan.
- Exact-alarm receiver and boot/timezone/package-replaced schedule repair receiver.
- FileProvider with app-private cache path.
- Native credential store and native authority workers.

Manifest-level controls include `usesCleartextTraffic="false"`, `allowBackup="false"`, package-derived authority names, non-exported app-owned receivers/providers, and explicit exported TWA/library surfaces. Evidence: `android-twa/app/src/main/AndroidManifest.xml`.

## CI And Release Surface

Workflows present:

- `.github/workflows/ci.yml`
- `.github/workflows/android-twa.yml`
- `.github/workflows/android-production-release.yml`
- `.github/workflows/android-download-smoke.yml`

Existing workflows pin third-party actions by SHA and avoid persisted checkout credentials in inspected workflows. Android signing is isolated behind `workflow_dispatch` confirmation and `android-production` environment, but remote environment/ruleset strengthening remains Wave 3.

## Public Assets With Configuration

Public/config-bearing assets include `public/manifest.webmanifest`, `public/.well-known/assetlinks.json`, app icons/images/fonts, `public/sw.js`, and Android `asset_statements` resource derived from `android-twa/app/src/main/res/values/strings.xml:5`. The public Supabase URL/key and VAPID public key are expected public configuration; privileged keys must remain server/environment-only.

