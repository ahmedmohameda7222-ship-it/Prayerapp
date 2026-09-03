# Prayerapp Android Privacy and Data Safety Security Record

Last reviewed: 2026-09-03
Package: `de.donaumoschee.app`
Android model: Trusted Web Activity plus app-owned native prayer scheduling, notifications, Adhan playback and native-authority capability.

## Permission inventory and purpose

| Permission | Security/privacy purpose |
| --- | --- |
| `INTERNET` | Load the trusted Prayerapp origin and communicate with Prayerapp/Supabase/push dependencies. |
| `POST_NOTIFICATIONS` | Deliver prayer reminders/Adhan notifications after Android permission flow. |
| `SCHEDULE_EXACT_ALARM` | Schedule user-configured prayer alarms at intended times. |
| `RECEIVE_BOOT_COMPLETED` | Rebuild the user's native prayer schedule after boot/reboot. |
| `FOREGROUND_SERVICE` / `FOREGROUND_SERVICE_MEDIA_PLAYBACK` | Play Adhan through the foreground Media3 service. |
| `WAKE_LOCK` | Support reliable scheduled prayer delivery/playback. |
| `REORDER_TASKS` | TWA/browser task integration. |

No camera, microphone, contacts, SMS, call log, Bluetooth, advertising ID, package enumeration, or broad filesystem permission is declared by the app manifest.

The application does not declare Android fine/coarse/background location permissions. Qibla/location behavior is delivered by the web origin/browser permission model rather than an app-level Android location permission.

## Data stored locally by the Android shell

`NativeStore` uses application-private SharedPreferences for operational state including installation ID, authority/account generation state, schedule/configuration data, readiness/permission state, delivery records and revocation workflow state.

The long-lived native installation credential is handled by `NativeCredentialStore` rather than stored as plaintext:

- AES/GCM/NoPadding;
- Android Keystore-backed 256-bit AES key;
- randomized IV and 128-bit GCM authentication tag;
- encrypted blob in app-private SharedPreferences;
- legacy plaintext credential is migrated and removed;
- a decryption failure removes the unusable encrypted blob instead of silently falling back to exposed plaintext.

The manifest disables Android backup (`android:allowBackup="false"`), reducing unintended extraction/cloud-backup propagation of native state.

## Data transmitted by the Android/native path

The native authority flow sends only data required to establish and maintain prayer-delivery authority: installation ID, server-issued/locally-held native credential proof, authority ID/generation, authenticated account association during enrollment, readiness/capability state, schedule synchronization data and bounded delivery receipts.

The raw native installation credential is not serialized into the web bridge status and is not exposed to normal web JavaScript. Native enrollment can use the private `X-Native-Credential` header. Server storage uses a credential hash rather than the raw native credential.

## Notification and push data

Web Push subscription material can include an endpoint plus P-256 DH/auth key material, browser/installation identifiers, locale/platform/user-agent metadata and optional authenticated account association. This material is operationally sensitive even though it is not equivalent to an account password. Server controls limit trusted push endpoints, account subscription fan-out, request rate and ownership changes.

Native delivery receipts contain a canonical prayer event ID, reminder/Adhan kind, account generation, delivery timestamp and installation/account linkage; retention is intentionally bounded by expiry/cleanup logic.

## Location and geocoding

Qibla and location functionality is user-initiated. The app does not require an Android location permission. When the web experience uses location/geocoding, coordinates/search queries can be sent through Prayerapp's bounded geocoding proxy to the configured geocoding provider. Server-side geocoding has fixed provider hosts, durable abuse limits, response-size/MIME bounds and timeouts.

No requirement for background location collection was found in the Android manifest or native implementation.

## Logging and diagnostics

Native logs use the `DanubePrayer` tag and generally record state/result classes rather than raw credentials. Security review must continue to treat account tokens, native credentials, push auth material, signing material and service-role credentials as prohibited log content.

Vercel/Supabase operational logs can contain request metadata and database/auth events. Incident and audit evidence should preserve request IDs/timestamps while minimizing personal or credential-bearing data.

## Third-party SDK / service inventory

Android resolved dependencies include AndroidX components, Android Browser/TWA helper, WorkManager and Media3. No advertising or analytics SDK is declared in `android-twa/app/build.gradle`.

The application ecosystem also uses Supabase for database/Auth, Vercel for hosting/runtime, browser/Web Push services, and the configured geocoding/audio providers. These providers must be reflected in the public privacy disclosure as applicable to actual user data flows.

## Data minimization controls

- no app-level Android location permission;
- no advertising identifier/analytics SDK in the reviewed Android build configuration;
- app backup disabled;
- native secret kept out of web JavaScript and encrypted at rest;
- server receives generation/capability/receipt fields needed for delivery decisions rather than arbitrary device data;
- admin audit metadata is bounded and intentionally excludes raw request bodies/secrets;
- rate-limit state stores derived abuse-control identity rather than requiring arbitrary user content;
- native receipts and rate-limit state have cleanup/retention mechanisms.

## User control/deletion

The web application contains account deletion and notification subscription-management flows. Native account reset clears account-bound schedule/authority state and queues server authority revocation while preserving installation identity needed for secure lifecycle management.

A provider/Play-console verification of the exact published privacy policy, Play Data Safety answers, account-deletion disclosure and any required retention statements is **NOT VERIFIED** through the available repository/provider tools. This document maps implementation facts; it does not claim the current Play Console answers already match them.

## Play Data Safety reconciliation required before publication

Before a hardened Android release is publicly published, compare the current Play Console Data Safety form and privacy-policy text to this implementation record, including:

- account identifiers/authentication;
- push subscription and native installation identifiers;
- approximate/precise location handling in the web experience;
- notification/prayer schedule state;
- diagnostics/log metadata;
- third-party processing by Supabase, Vercel, push/geocoding/audio providers;
- deletion/retention behavior.

Android Production publication is separately gated, so this provider reconciliation remains an explicit release-time gate rather than being silently marked PASS.
