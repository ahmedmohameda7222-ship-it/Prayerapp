# Prayerapp Threat Model

Date: 2026-09-02
Version: Wave 0 evidence freeze

## Overview

Prayerapp is a Next.js 16 application backed by Supabase and deployed to Vercel for `https://donaumoschee.vercel.app`. It serves public mosque content, authenticated account preferences, admin content-management workflows, Web Push notifications, cron-triggered prayer reminders, and a native Android Trusted Web Activity (TWA) shell with native prayer scheduling and receipt reporting.

| Component | Responsibility | Evidence |
| --- | --- | --- |
| Next.js App Router pages | Public, account, admin, and Android download routes | `app/*/page.tsx`, `app/api/*/route.ts` |
| Supabase browser client | Public/authenticated browser data access via publishable or legacy anon key | `lib/supabase/client.ts:3-4` |
| Supabase server client | Server-only privileged operations using `SUPABASE_SECRET_KEY` or `SUPABASE_SERVICE_ROLE_KEY` | `lib/supabase/server.ts:1-11` |
| Admin authorization | Token-to-user verification against `ADMIN_EMAILS` | `lib/auth/admin-server.ts:6-30` |
| Push delivery | VAPID-backed Web Push fanout and delivery ledger | `lib/push/web-push.ts:47-219` |
| Cron reminders | `CRON_SECRET`/Vault-authorized prayer reminder endpoint and native receipt fallback | `app/api/cron/prayer-reminders/route.ts:181-283` |
| Native authority APIs | Enroll, heartbeat, receipt, and revoke native-device authority | `app/api/android/native-authority/enroll/route.ts`, `app/api/android/native-authority/heartbeat/route.ts`, `app/api/android/native-authority/receipt/route.ts` |
| Service worker | Offline/public asset caching and Web Push handling | `public/sw.js:1-290` |
| Android TWA | Native shell, alarms, notifications, Media3 Adhan playback, and postMessage bridge | `android-twa/app/src/main/AndroidManifest.xml`, `android-twa/README.md:17-19` |
| Release workflows | CI, unsigned Android build, protected signing, and public Android release | `.github/workflows/ci.yml`, `.github/workflows/android-twa.yml`, `.github/workflows/android-production-release.yml` |

## Effective Resources

| Deployment or workflow | Resource or capability | Configuration and precedence | Safe effective value or location | Recipients | Enforcing control | Evidence or unknowns |
| --- | --- | --- | --- | --- | --- | --- |
| Browser web app | Supabase public access | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` with legacy anon fallback | Public key only, no service-role key in browser | End-user browser | Prefix discipline and client module boundary | `.env.example:2-5`, `lib/supabase/client.ts:3-4` |
| Server actions/API routes | Privileged Supabase operations | `SUPABASE_SECRET_KEY` preferred over `SUPABASE_SERVICE_ROLE_KEY` | Server-only environment secret | Vercel server runtime | `server-only`, no `NEXT_PUBLIC_` prefix | `lib/supabase/server.ts:1-5` |
| Admin UI | Admin identity | Bearer token from Supabase session checked against `ADMIN_EMAILS` | Verified user email, user id available through Auth | Admin server actions | Supabase `auth.getUser` and env allowlist | `lib/auth/admin-server.ts:6-30`, `lib/auth/admin-actions.ts:6-24` |
| Web Push | Notification signing | VAPID public key client-side; private key server-side | `VAPID_PRIVATE_KEY` not public | Push services and browsers | Server-only push module | `.env.example:18-21`, `lib/push/web-push.ts:47-51` |
| Cron | Prayer reminder trigger | `CRON_SECRET` and Supabase Vault token path | Secret value not stored in repo | Supabase Cron/Vercel function | Endpoint secret verification | `app/api/cron/prayer-reminders/route.ts:181-194` |
| Android native app | Package/version/release identity | `android-twa/twa-manifest.json` drives Gradle | `de.donaumoschee.app`, min SDK 23, target SDK 37 | Android build and release workflows | Gradle manifest binding and workflow checks | `android-twa/twa-manifest.json`, `android-twa/app/build.gradle:7-38` |
| Android signing | Permanent release key | GitHub environment secrets only | `android-production` environment | Isolated signing job | Protected workflow and cert digest check | `.github/workflows/android-twa.yml:212-360` |

## Protected Assets

- Supabase service-role/secret key, database credentials, and Vault-held cron secret.
- Supabase Auth sessions, user ids, emails, account preferences, saved Azkar, prayer reminders, and account deletion authority.
- Admin authority, admin action integrity, and future durable admin audit evidence.
- Web Push endpoints, `p256dh`, `auth`, VAPID private key, and delivery-fanout controls.
- Native authority credentials, credential hashes, installation ids, account-generation state, delivery receipts, and revocation state.
- Published mosque content integrity: announcements, donations, events, Jumuah, khutbahs, prayer times, Ramadan, and settings.
- Android package identity, release versionCode/versionName, signing certificate fingerprint, release artifacts, and public GitHub release metadata.
- CI workflow integrity, ruleset enforcement, dependency graph, SBOMs, and secret-scan evidence.
- Operational evidence: backups, restore drills, monitoring alerts, incident-response exercises, and final checklist status.

## Trust Boundaries

| Boundary | Attacker-controlled input or state | Expected invariant | Evidence |
| --- | --- | --- | --- |
| Anonymous browser to public pages/APIs | URLs, query strings, public form/input surfaces, notification subscription payloads | Public data only; no privileged Supabase key; strict cache and CSP controls | `app/api/geocode/route.ts`, `app/api/push/subscriptions/route.ts`, `next.config.ts:3-21`, `public/sw.js:45-86` |
| Browser auth session to account APIs | Supabase Auth token/session, account form data | Caller can affect only own account data; session cookies/tokens cannot widen scope | `app/api/account/delete/route.ts`, `lib/auth/use-admin-auth.ts` |
| Admin session to server actions | Admin forms, publish toggles, delete operations | Verified actor must be admin; high-impact mutations must be validated and durably audited | `lib/auth/admin-server.ts:13-37`, `app/admin/*/actions.ts` |
| Server runtime to Supabase | Service key and SQL/RPC calls | Service-role use remains server-only and routes enforce caller identity/secret before mutation | `lib/supabase/server.ts:1-11`, `app/api/cron/prayer-reminders/route.ts:181-194` |
| Supabase Data API to public schema | Anon/authenticated direct table access | RLS/grants prevent private/native/admin/log data disclosure and client writes | `supabase/migrations/*.sql`; production read-only grants/RLS probe |
| Cron to push fanout | Scheduled invocation and event state | Secret-authorized cron cannot be brute-forced; fallback logic must avoid duplicate or missing prayer delivery | `app/api/cron/prayer-reminders/route.ts`, `lib/android/native-authority.ts:69-86` |
| Web Push service to browser service worker | Push payload JSON | Notification URL remains same-origin; stale prayer events are ignored | `public/sw.js:229-289` |
| Android TWA bridge to web origin | postMessage payloads and Android status | Digital Asset Links and official channel gate native authority; no WebView JS interface | `android-twa/README.md:17-19`, `android-twa/app/src/main/AndroidManifest.xml:28-76` |
| Android app to local storage/Keystore | Native credential persistence | Credential stored with Android Keystore-backed encryption; plaintext legacy storage removed after migration | `android-twa/app/src/main/java/de/donaumoschee/app/storage/NativeCredentialStore.java` |
| CI/release to GitHub/Vercel/Supabase | PR source, workflows, artifacts, release inputs | PR jobs lack production signing secrets; signing only in protected workflow; exact source SHA binds artifacts | `.github/workflows/ci.yml:8-31`, `.github/workflows/android-twa.yml:48-360` |

## Attacker Capabilities

- Anonymous attacker can browse public routes, send public API requests, attempt malformed inputs, register push subscriptions, attempt CSRF/CORS paths, probe public assets, and trigger low-rate public endpoints.
- Authenticated normal user can manage their own account preferences and push/reminder state, but must not read/modify other users' private data.
- Malicious authenticated user can craft direct API requests, replay/alter tokens they legitimately possess, attempt IDOR/BOLA/BFLA, and attempt to widen query/filter scope.
- Compromised browser/session attacker can act with the victim's browser authority until token/session revocation or expiry; high-impact admin actions need auditability and potentially freshness controls.
- Compromised Android-device attacker can inspect app-private state under authorized test conditions, tamper local native status, replay stale native authority data, and send malformed bridge messages.
- Malicious third-party Android app can send intents to exported components/services and attempt app-link or custom-tab confusion; exported surfaces must have platform/library controls.
- Stolen or modified APK attacker can redistribute an altered package; Digital Asset Links, signing certificate verification, package identity, and artifact hashes protect release integrity.
- Compromised dependency or CI PR attacker can attempt workflow trust inversion, malicious package scripts, artifact substitution, or secret exfiltration; workflows must remain pinned and least privilege.
- Compromised developer/provider account attacker can alter GitHub, Supabase, Vercel, or release settings; provider MFA, trusted reviewer rules, monitoring, backups, and IR plans limit blast radius.

## Security Objectives

- Keep service-role, signing, VAPID private, cron, and database credentials out of browser code, logs, artifacts, and public releases.
- Enforce server-side input validation at every privileged mutation boundary.
- Maintain truthful Supabase migration history and schema equivalence before any production migration/history repair.
- Ensure admin mutations are attributable to verified actor identity and produce durable, bounded, secret-redacted audit events.
- Remove `unsafe-inline` from web CSP without breaking hydration, localization, PWA, TWA, admin, account, media, service worker, or static assets.
- Preserve least privilege in CI and block signing/production secrets from untrusted PR code.
- Build, analyze, sign, and test Android release candidates only from exact approved source and never reuse a published versionCode.
- Verify production controls, restore capability, monitoring, incident response, and the original 990-control checklist before final recommendation.

## Assumptions And Open Questions

- Supabase Auth provider and redirect URL settings require dashboard/management evidence not fully exposed by the current database-only connector.
- Vercel CLI is not installed locally; the production deployment SHA/target was derived from GitHub deployment records, while Vercel project/team access evidence remains a later provider-control item.
- Production schema has partial post-`20260822201832` state; no production mutation or migration repair has been performed.
- Physical-device Android QA, signed artifact verification, DAST, restore drills, monitoring exercises, and final 990-control rerun remain later gated evidence.
