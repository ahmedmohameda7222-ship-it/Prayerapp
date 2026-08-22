# Android Production Completion Design

**Date:** 2026-08-21
**Status:** Approved for implementation
**Production application ID:** `de.donaumoschee.app`
**Production origin:** `https://donaumoschee.vercel.app`

## Goal

Complete the existing Trusted Web Activity as a production-grade Android application that preserves the browser/PWA experience while adding reliable native prayer scheduling and Adhan playback when the page is closed or the screen is locked. Produce signed release-candidate APK and AAB artifacts from trusted CI without merging, deploying, or publishing a public release.

## Delivery boundaries

- Use one feature branch and one Draft PR.
- Do not merge, deploy production, create a public GitHub release, or create a public tag.
- Never commit signing material or print secret values.
- The installable release candidate must use `de.donaumoschee.app`, version name `1.0.0`, version code `2`, and the permanent production signing certificate.
- The mosque's published prayer schedule remains authoritative. Native code does not calculate geographic prayer times.
- Browser/PWA Web Push and HTML audio behavior remain available to non-native clients.

## System shape

The web application remains the product UI and account/configuration authority. Android supplies a small, explicit native capability layer:

1. A TWA launcher owns a retained `CustomTabsSession` and opens the verified production origin.
2. A versioned postMessage protocol exchanges only whitelisted commands and state with that verified origin.
3. A native prayer engine stores a bounded copy of published prayer rows and user settings, then creates deterministic exact alarms.
4. Alarm receivers post prayer/reminder notifications and start a Media3 `MediaSessionService` for Adhan playback.
5. WorkManager and system broadcasts repair schedules after refresh, boot, app update, clock/time-zone changes, and exact-alarm access changes.
6. A short-lived server lease suppresses a specific browser push subscription only while its paired native installation has freshly confirmed healthy readiness. Any uncertainty fails open to Web Push.

## Secure TWA bridge

The Android launcher follows the AndroidX Browser/Chrome TWA postMessage model. It binds a Custom Tabs service, creates and retains a `CustomTabsSession`, validates the Digital Asset Links relationship, and requests a postMessage channel after navigation completes. Android never exposes an annotated WebView JavaScript interface.

Digital Asset Links contains both:

- `delegate_permission/common.handle_all_urls` for TWA verification; and
- `delegate_permission/common.use_as_origin` for the postMessage relationship.

Android accepts messages only after validation succeeds for `https://donaumoschee.vercel.app`. Both sides require JSON objects with protocol version `1`, a known message type, and a bounded payload. Unknown versions, types, origins, malformed JSON, oversized strings, and out-of-range values are rejected.

Protocol responsibilities:

- Android reports readiness, notification/exact-alarm state, schedule freshness, cached audio readiness, and engine health.
- Web sends authenticated configuration, published schedule rows, the approved Adhan catalog, and explicit test commands.
- Android can request web-side refresh after local state becomes stale.
- Permission prompts are initiated only by a user action. A small native permission activity requests runtime notification permission or opens the exact-alarm settings surface above the TWA.

## Published schedule and configuration

The authenticated web application fetches the existing account prayer preferences and the mosque-published prayer rows. A bounded API exposes only published rows needed by the native client, in the application's Europe/Berlin interpretation. The bridge transfers normalized schedule rows rather than a calculation method.

Native storage contains:

- the last accepted configuration and its revision;
- published prayer rows for a bounded horizon;
- Adhan catalog metadata and verified cached media paths;
- deterministic delivered-event ledger entries;
- installation credentials used only for native readiness heartbeats.

Schedules are rejected if incomplete, malformed, in the wrong time zone, too old, or outside the allowed date horizon. Sunrise is displayed but never scheduled as prayer Adhan. Reminder alarms use the configured lead time; the prayer-time alarm owns the Adhan event.

## Alarm engine

The engine uses `AlarmManager.setExactAndAllowWhileIdle` when exact alarms are authorized. Every event has a deterministic identifier derived from installation/config revision, local prayer date, prayer key, and event kind. PendingIntent identity and the delivered ledger prevent duplicate notification or playback after rescheduling and receiver races.

The engine schedules only a near-term window from the larger cached schedule. Refreshing configuration cancels obsolete alarms before installing the new set. If exact-alarm authorization is absent, the engine reports unhealthy native readiness and does not claim authority over prayer delivery.

Repair triggers include:

- app/config/schedule refresh;
- device boot and unlocked boot;
- package replacement;
- time or time-zone change;
- exact-alarm permission-state change; and
- periodic WorkManager refresh.

## Native Adhan playback

Adhan audio runs in a Media3 `MediaSessionService` with a media-playback foreground service declaration. The receiver starts playback only for a due, non-duplicate prayer event. The service exposes a stop action, publishes a media notification, and stops/releases itself after completion, explicit stop, or unrecoverable error.

Audio is sourced only from the server-approved HTTPS catalog. Downloads use bounded timeouts and size limits, validate response type, write to a temporary app-private file, compute and persist a digest, and atomically promote the file. Playback prefers a verified cache and may use the approved remote URL only as a controlled fallback. Native code never accepts arbitrary audio URLs from a bridge message.

The Settings 10-second test uses the same AlarmManager -> receiver -> notification/MediaSessionService path as a real event. It does not invoke HTMLAudio or a Web Push test when running in the Android app.

## Fail-safe multi-device dedupe

The server stores a minimal native-installation record tied to an authenticated user and, when available, one browser push subscription. Android generates an opaque installation ID and secret. Only a one-way digest of the secret is stored server-side.

A native readiness heartbeat renews an expiring authority lease only when Android reports all required capabilities healthy:

- notification permission granted;
- exact-alarm permission granted;
- current configuration accepted;
- published schedule present and fresh;
- alarm schedule successfully installed; and
- native engine not in an error state.

Foreground state changes send an immediate heartbeat. A periodic worker refreshes status; the server lease remains intentionally short. Prayer-reminder cron suppresses only the paired push subscription while a fresh healthy lease exists. Missing rows, expired leases, rejected credentials, stale schedules, permission revocation, sync errors, or server/query errors all leave Web Push enabled. Announcement/news delivery never consults native authority.

## Web and distribution behavior

Native capability detection is bridge-based, not user-agent based. Inside the Android TWA, Settings shows native permission/status controls and native 10-second tests. In browsers it retains the current PWA/Web Push controls.

`/download/android` is the permanent product link. It reads GitHub release metadata server-side, selects the newest public non-prerelease Android release containing the exact production APK asset name, and redirects to that asset. With no eligible release, it returns a controlled unavailable state. The implementation does not publish a release during this task.

## CI and signing trust boundary

Normal Android CI runs static checks, unit tests, lint, and debug compilation without secrets. A separate trusted release-candidate job runs only for same-repository branches/PRs, reconstructs the keystore in runner temporary storage, checks the alias certificate before building, and removes temporary material after use.

CI builds both release APK and AAB, then verifies:

- APK signature validity and exact permanent certificate SHA-256;
- package ID, version name/code, minSdk, and targetSdk;
- absence of a debug package suffix;
- AAB JAR signature and bundle structure;
- stable artifact names and SHA-256 checksums.

The workflow uploads immutable run artifacts to the Draft PR's exact head. It does not create a tag or GitHub Release.

## Acceptance evidence

Completion requires green web tests/build, Android JVM tests/lint/build, source-level security checks, signed APK/AAB CI artifacts, cryptographic identity verification, and an exact Draft PR/run/head mapping. Physical-device behavior remains the next user-owned gate; corrections, if any, stay on the same branch and Draft PR.
