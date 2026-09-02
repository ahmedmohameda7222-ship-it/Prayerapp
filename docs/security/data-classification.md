# Prayerapp Data Classification

Date: 2026-09-02

## Classification Rules

| Class | Meaning | Handling |
| --- | --- | --- |
| Public | Intended for anonymous users | May be cached/rendered publicly if source state is published |
| Internal | Operational metadata not meant for public display | Do not expose through public assets or browser logs |
| Personal | Identifies or relates to a user/account/device | Apply RLS/grants, minimize logs, define retention |
| Sensitive | Security-relevant state that can enable abuse or tracking | Server-only access, bounded logs, least privilege |
| Secret | Credential/key/token/signing material | Never commit, expose, print, or store in evidence |

## Inventory

| Data | Class | Location or source | Consumers | Retention/evidence need |
| --- | --- | --- | --- | --- |
| Published prayer times, Jumuah rows, events, announcements, khutbahs, Ramadan, mosque settings | Public when published, internal before publication | Supabase public tables and `lib/data/*` readers | Public Next.js pages, TWA/native schedule cache | Retain per mosque publishing policy; audit admin changes |
| Account email/user id/session token | Personal/sensitive | Supabase Auth; admin verification via `auth.getUser` | Account pages, admin gate, server actions | Supabase Auth retention; do not log tokens |
| `ADMIN_EMAILS` allowlist | Sensitive/internal | Server environment | Admin auth gate | Keep environment-only; verify membership and MFA externally |
| Push endpoint, `p256dh`, `auth`, browser id, user id, locale/platform | Personal/sensitive | `push_subscriptions` | Push delivery, native pairing, abuse limits | Retain while enabled/needed; delete/disable stale or invalid endpoints |
| VAPID public key | Public | `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Browser notification setup | Public config acceptable |
| VAPID private key | Secret | `VAPID_PRIVATE_KEY` | Server push signing | Environment only; rotate on exposure |
| Supabase publishable/anon key | Public credential | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` or legacy anon key | Browser Supabase client | Public by design; enforce RLS/grants |
| Supabase service/secret key | Secret | `SUPABASE_SECRET_KEY` or `SUPABASE_SERVICE_ROLE_KEY` | Server routes/actions only | Environment only; rotate on exposure |
| Cron secret/Vault token | Secret | `CRON_SECRET` and Supabase Vault-backed cron path | Prayer reminder route | Environment/Vault only; rotate on exposure |
| Native credential and credential hash | Secret/sensitive | Android Keystore-backed local storage and DB hash | Native authority enrollment/heartbeat/receipt | Remove plaintext legacy storage; no logs |
| Installation id, authority id, account generation, receipt state | Personal/sensitive | `native_prayer_installations`, receipt table | Native authority APIs, cron fallback | Retain while device active; expire receipts quickly |
| Delivery receipt event ids and timestamps | Sensitive operational | `native_prayer_delivery_receipts` | Cron fallback suppression and delivery proof | Short retention; server-only table grants |
| Admin audit events | Internal/sensitive | Future `audit_logs` hardening | Reviewer/admin incident response | Append-oriented; no secrets/full bodies; retention defined in Wave 1/5 |
| Android signing key and passwords | Secret | GitHub `android-production` environment secrets | Isolated signing workflow only | Independent secure backup; never in repo/logs |
| Release artifact hashes and signing certificate digest | Public/internal evidence | GitHub releases/workflow artifacts | Reviewers/users | Record exact hashes without exposing signing material |
| Logs with user ids/IPs/errors | Personal/internal | Vercel, Supabase, GitHub Actions, Android logcat | Debugging, monitoring, incident response | Minimize; exercise log review and retention in Wave 5 |

## Current Evidence

- Environment variable names are documented in `.env.example:2-25`; secret values are not copied.
- Server Supabase secret selection is in `lib/supabase/server.ts:4-5`; browser public key selection is in `lib/supabase/client.ts:3-4`.
- Web Push private-key use is server-only in `lib/push/web-push.ts:47-51`.
- Android Keystore-backed storage is implemented in `android-twa/app/src/main/java/de/donaumoschee/app/storage/NativeCredentialStore.java`.
- Production grants/RLS were probed read-only for key private/native tables. Native receipt v2 remains incomplete in production and is owned by Wave 1.

## Required Follow-Up Evidence

- Provider-level evidence that production data is not copied into insecure dev/test environments.
- Backup protection/retention evidence and isolated restore drill evidence.
- Privacy/Data Safety reconciliation after final exact-head app behavior is fixed.
- Logcat/Vercel/Supabase log review showing secrets/tokens/native credentials are not emitted.
