# Android V2 Recovery Design

**Date:** 2026-08-23

**Starting point:** `main` at `a2f6f14c41ac5ac76d1ef98fc8a112055dba7a2e` when the recovery integration branch was created.

## Goal

Make the Danube Mosque Android distribution reliable enough that prayer reminders and Adhan do not silently disappear, normal native delivery does not duplicate Web Push, localization cannot be replaced by browser machine translation, and Android behavior can be verified on real devices before any production release.

## Architecture

The product remains a hybrid application. The Next.js web/TWA layer owns content UI, settings, account interaction, and mosque data presentation. Supabase/server owns the canonical mosque-published prayer schedule, reminder preferences, fallback coordination, and delivery receipts. Native Android owns exact alarms, local prayer notifications, cached Adhan playback, Android permission state, reboot/time repair, and the native installation credential. The web/native bridge is reduced to a narrow versioned configuration/control channel and is not the delivery engine.

## Non-negotiable invariants

1. No native prayer event is marked delivered before the notification is successfully posted or Adhan playback actually starts.
2. Native installation credentials never leave Android for JavaScript.
3. Web Push suppression never depends only on a stale long-lived health lease.
4. Reminder readiness and Adhan readiness are independent capabilities.
5. Every prayer event has one deterministic canonical event ID shared by TypeScript and Android.
6. The selected app locale controls web content and native Android prayer copy.
7. Browser machine translation must not translate the application UI.
8. Prayer names follow one locale contract across web, server, service worker, and Android.
9. `adhanReady=true` requires a locally cached, integrity-verified audio file; prayer-time playback never depends on downloading audio.
10. Risky Android lifecycle behavior is covered by automated tests plus signed release-candidate physical-device validation.

## Recovery branch strategy

`recovery/android-v2` is an integration branch created from the exact latest `main` SHA at recovery start. Each recovery subsystem is implemented on a child branch and reviewed through a pull request targeting `recovery/android-v2`. Child PRs are squash-merged only after their checks are green. Nothing is merged from the recovery branch to `main` until the complete signed RC, browser QA, server checks, and physical-device matrix pass and the user separately authorizes the final production merge/release.

## Localization authority

### First-run locale

Locale precedence is:

1. valid explicit `locale` cookie;
2. first supported language in the request/browser language preferences;
3. English fallback.

Supported locales remain `ar`, `en`, `de`, and `tr`. Arabic is no longer the universal fallback for a new user whose device/browser language is not Arabic.

### Machine-translation prevention

The root HTML declares the active locale and direction and is marked non-translatable. Google/Chrome translation metadata is added so a TWA/browser cannot reinterpret Arabic strings into outputs such as `Morocco`, `The era`, `dinner`, or `Accommodation`. The app's own translations are authoritative.

### Prayer-name contract

| Key | Arabic | English | German | Turkish |
| --- | --- | --- | --- | --- |
| fajr | الفجر | Fajr | Fajr | Sabah |
| sunrise | الشروق | Sunrise | Sonnenaufgang | Güneş |
| dhuhr | الظهر | Dhuhr | Dhuhr | Öğle |
| asr | العصر | Asr | Asr | İkindi |
| maghrib | المغرب | Maghrib | Maghrib | Akşam |
| isha | العشاء | Isha | Isha | Yatsı |

The translation catalogs must have identical key trees. Missing keys are test failures rather than silently accepted production drift.

### Native locale

The selected app locale is part of native prayer configuration. Native notification strings are resolved from that app locale rather than implicitly following the Android system locale.

### Prayer-table responsiveness

The home prayer board must prevent long localized labels such as `Sonnenaufgang` from overlapping the Adhan or Iqama columns at 320, 360, 375, 390, and 412 CSS-pixel widths. The prayer-name cell remains flexible; time and bell columns remain predictable and legible.

## Native delivery state machine

Each native event is persisted with a bounded lifecycle:

`SCHEDULED -> FIRING -> DELIVERED | FAILED`

For reminder events, `DELIVERED` is recorded only after notification delivery returns successfully. For Adhan events, `DELIVERED` is recorded only after the foreground playback service reaches real playback start. Failures retain a machine-readable reason and may be retried according to event age and capability state.

The previous delivered-event set is replaced by bounded event records containing at least `eventId`, `kind`, `dueAt`, `state`, `attemptedAt`, `deliveredAt`, and `failureCode`. Retention cleanup never clears unrelated fresh records merely because an arbitrary set-size threshold was reached.

## Capability model

Native readiness is decomposed into independent signals:

- `reminderReady`
- `adhanReady`
- `exactAlarmReady`
- `scheduleReady`
- `audioReady`

Notification capability checks distinguish runtime permission, global app notification state, reminder channel existence/enabled state, Adhan channel existence/enabled state, and exact-alarm access. A missing channel is not considered enabled.

## Canonical event IDs and receipts

Every reminder/Adhan event gets a deterministic identity derived from schedule identity/revision, date, prayer, event kind, and lead minutes. TypeScript and Java have shared fixtures proving identical IDs.

Native successful delivery queues a server receipt. The server stores short-retention receipt rows with user, installation, event ID, kind, delivered time, and account/native generation. Clients cannot directly read or write these rows; server/service-role paths own them.

## Native/Web Push fallback

The server separates expected capability from proven delivery. When a prayer event is due:

1. if no healthy native candidate exists, Web Push is sent immediately;
2. if native is expected to deliver, the server allows a small grace interval;
3. a native delivery receipt suppresses fallback;
4. absence of a receipt after the grace interval causes Web Push fallback.

Prayer push payloads carry `eventId`, `dueAt`, and `expiresAt`. The service worker discards stale prayer fallbacks so a device that was offline does not surface an obsolete notification after reconnecting.

The system fails open toward delivery if forced to choose between a possible duplicate and a missed prayer reminder, while receipts eliminate normal-condition duplicates.

## Scheduler durability

Native exact alarms cover roughly 14 days of verified published schedule, providing buffer against delayed background work without arming an unnecessary full-month set. Schedule refresh, health/receipt retry, and immediate repair responsibilities are separated. Repair continues across reboot, package replacement, manual time change, timezone change, and exact-alarm permission grant, with explicit locked/unlocked-user handling.

## Native credential boundary and account lifecycle

The native installation credential stays in Android private storage and is never returned in bridge status. Native authenticated server requests use that credential directly. Web can request enrollment/reset/revocation through the verified bridge, but JavaScript receives only non-secret status identifiers/capabilities.

Logout/account switching immediately cancels old alarms, stops Adhan, advances the account generation, clears user-specific native config, and queues remote revocation if offline. Old-generation workers and events cannot write new account state.

## Permissions and diagnostics

Settings show the exact failing Android capability and deep-link to the relevant system surface: runtime notification permission, exact-alarm settings, app notification settings, reminder channel, or Adhan channel. The 10-second test flow has a persisted `testId` and reports `scheduled`, `delivered`, or `failed:<reason>` based on the actual receiver/service result; the UI never converts elapsed time alone into success.

## Adhan audio

Approved sounds remain an allowlisted catalog. `adhanReady=true` requires a local file whose MIME/size constraints and expected SHA-256 match the approved catalog entry. Downloads go to a temporary file and replace the active file atomically only after verification. Prayer-time playback uses verified local media only. Self-hosting is not introduced without confirmed content rights.

## TWA, install, and update behavior

Prayer reliability is stabilized before launcher polish. Existing launcher behavior is characterized by tests first. Where Android Browser Helper provides supported provider verification/fallback primitives compatible with the required postMessage bridge, those primitives are preferred over custom reimplementation. Browser fallback must never claim native prayer readiness.

Install state distinguishes browser web, installed PWA, native Android, and iOS PWA. A standalone PWA is not treated as equivalent to the signed Android package.

Updates continue through the OS package installer rather than adding broad self-install permissions. Required-update state suspends unsafe native prayer ownership while allowing server/Web Push fallback.

## Protocol compatibility

The bridge becomes capability/versioned. Existing v1 APK behavior remains supported while v2 server and web support is introduced. New APKs advertise capabilities such as receipt-v2, native-secret-private-v2, native-locale-v2, and test-result-v2. v1 compatibility is retired only after the new signed Android release has been validated and adoption policy permits it.

## Testing and release gates

### Web

Required checks include `npm ci`, lint, Vitest, production build, dependency audits, service-worker syntax check, and `git diff --check`. Browser QA covers all four locales and mobile widths 320/360/375/390/412 with assertions for direction, prayer names, no overlapping columns, no horizontal scroll, tappable reminder controls, and language persistence.

### Android

Local unit tests cover pure planners/state/contracts. Instrumentation tests cover Android framework behavior such as channels, persisted state migration, alarm cancellation/scheduling, account reset, notification delivery, permission state, locale-specific native copy, and repair receivers. Gradle debug/release tests, lint, APK/AAB builds, package/version/target-SDK inspection, and certificate/checksum verification remain required.

### Physical-device RC

A signed RC must pass clean install, update without uninstall, all four locales, locale persistence into native notifications, permission denial/recovery, exact-alarm denial/fallback, screen-locked Adhan, reboot/time/timezone repair, Doze/battery-saver cases, offline cached audio, stale-push suppression, healthy-native no-normal-duplicate behavior, deliberately broken-native fallback, logout/account switching, required update, verified TWA, safe browser fallback, and PWA-vs-native distinction. At least one real Samsung device and one Pixel-class device are included.

## Completion criteria

The recovery is complete only with zero known P0/P1 issues in the scoped Android/prayer/localization system, all automated gates green on the same exact SHA, a signed RC passing the physical-device matrix, and no final `main` merge/release until separate user authorization.