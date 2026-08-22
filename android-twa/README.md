# Danube Mosque Android TWA

Production Android application for the Danube Mosque PWA, including native exact prayer alarms and locked-screen Adhan playback.

## Architecture

- Web/PWA source of truth: `https://donaumoschee.vercel.app/`
- Android package ID: `de.donaumoschee.app`
- Android shell: verified Trusted Web Activity (TWA) with an AndroidX Browser postMessage session
- Compile/target SDK: API 36
- Minimum SDK: API 23
- Android Browser Helper: 2.7.3
- Android Gradle Plugin: 8.11.1
- Gradle: 8.13
- JDK: 17

The web application remains the UI, account/configuration authority, and source of the mosque-published prayer schedule. Native Android caches only normalized published rows, schedules deterministic exact alarms, posts prayer notifications, and plays an approved Adhan through Media3. It does not calculate geographic prayer times.

The TWA bridge uses Digital Asset Links `use_as_origin`, a retained `CustomTabsSession`, relationship validation, and the official postMessage channel. It does not expose a WebView JavaScript interface. A short-lived server readiness lease suppresses only the paired prayer Web Push subscription while runtime notification permission, global app notification delivery, both native notification channels, exact-alarm access, schedule freshness, installed alarms, cached selected audio, and engine health are all confirmed. Any missing/stale/error state fails open to Web Push. Announcement/news pushes do not use this lease.

`twa-manifest.json` is the Android configuration source of truth for package/host/SDK/version settings used by Gradle. Android localized launcher labels live in `app/src/main/res/values-*` because Android chooses them from the device locale.

## Local build

Install Android SDK API 36 and JDK 17, then run the checked-in Gradle wrapper:

```bash
./gradlew --no-daemon :app:testDebugUnitTest :app:lintDebug :app:assembleDebug
```

GitHub Actions performs debug and unsigned release tests/builds for every applicable PR without exposing permanent signing secrets. It uploads an exact-head `danube-mosque-unsigned-candidate` containing the unsigned APK/AAB, checksums, and source metadata.

Release-candidate signing is a separate, explicitly dispatched `SIGN_ANDROID_RC` job protected by the `android-production` environment. It validates a successful unsigned PR run and the still-current same-repository PR head, downloads that artifact, and does not check out or execute PR source while signing secrets are present. It signs and verifies the APK/AAB in isolation, removes the temporary keystore, and uploads `danube-mosque-android-rc-<source-sha>`. Once this workflow is on `main`, future signing workflow definitions are sourced from trusted main; the current PR may use the same isolated job only after explicit environment authorization and exact-head review.

The protected signing jobs require these secrets by name: `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, and `ANDROID_KEY_PASSWORD`. Their values must never appear in logs, artifacts, source, or documentation. The alias is permanently `danube-mosque-release`.

## Production signing identity

The existing release key is the permanent Android identity of this app. Never regenerate, replace, print, or commit it. Its required SHA-256 certificate fingerprint is:

```text
E9:98:4B:DB:36:FF:2F:8F:A5:58:29:5C:5C:06:6F:BA:ED:3A:BD:BD:CC:80:1C:83:5D:AE:1B:DD:4C:D7:0E:92
```

Copy `signing.properties.example` to `signing.properties` and fill in the local values. `signing.properties`, `*.jks`, and `*.keystore` are ignored by Git.

Print the SHA-256 certificate fingerprint with:

```bash
keytool -list -v -keystore danube-mosque-release.jks -alias danube-mosque-release
```

The production Digital Asset Links document is tracked at `public/.well-known/assetlinks.json` and is served at:

```text
https://donaumoschee.vercel.app/.well-known/assetlinks.json
```

It contains both `handle_all_urls` and `use_as_origin` for the production package and certificate. A placeholder or debug fingerprint must never be published.

## Release build

After `signing.properties` points at the permanent keystore:

```bash
./gradlew --no-daemon :app:lintRelease :app:testReleaseUnitTest :app:assembleRelease :app:bundleRelease
```

Outputs:

- APK: `app/build/outputs/apk/release/`
- AAB: `app/build/outputs/bundle/release/`

For direct distribution outside Google Play, use the signed release APK. Keep the same package ID and signing key for every future update.

## TWA verification

A real fullscreen TWA requires both sides of Digital Asset Links:

1. The Android app declares trust for `https://donaumoschee.vercel.app` using `asset_statements`.
2. The website publishes `/.well-known/assetlinks.json` containing package `de.donaumoschee.app` and the SHA-256 fingerprint of the permanent release certificate.

If verification is missing or wrong, Android Browser Helper intentionally falls back to a Custom Tab instead of pretending that the origin is trusted.

## Native lifecycle and testing

- `Application` creates notification channels, initializes WorkManager, and repairs the current alarm window.
- `ScheduleRepairReceiver` repairs after boot, package replacement, clock/time-zone changes, and exact-alarm permission changes.
- `NativeRefreshWorker` refreshes the published schedule and sends readiness heartbeats; the authority lease expires if refresh cannot confirm health.
- `AudioCacheWorker` downloads only allowlisted HTTPS Adhan files into app-private storage with size/type/digest checks and an atomic promotion.
- `PrayerAlarmReceiver` uses a persistent delivered-event ledger and starts `AdhanPlaybackService` only for a due, non-duplicate Adhan event.
- Android 13+ notification access is requested natively only from the prayer setup flow. Runtime permission, `areNotificationsEnabled()`, `prayer-reminders-v1`, and `adhan-playback-v1` are reported separately; disabling the app or either channel revokes native authority. Android 12+ exact-alarm access uses `SCHEDULE_EXACT_ALARM`, `canScheduleExactAlarms()`, and an Activity Result callback from the official system settings screen; the callback re-checks current capability and denial leaves Web Push active.
- Prayer reminders use the stable `prayer-reminders-v1` notification channel. Media3 uses the separate stable `adhan-playback-v1` channel and exposes a Stop control. The Adhan channel participates in readiness because visible media controls are part of native Adhan delivery.
- The Settings 10-second tests use `AlarmManager -> PrayerAlarmReceiver -> notification/AdhanPlaybackService` inside the Android app. Browser clients retain the Web Push tests.

For adb diagnosis, filter `logcat` by the `DanubePrayer` tag. It records relationship/channel validation, config sync, alarm schedule/cancel/fire, schedule refresh, permission results, audio-cache readiness, and playback source/completion/error without logging credentials, endpoints, or tokens.

The permanent public download link is `/download/android`. It redirects only to the exact `danube-mosque.apk` asset on the newest stable public `android-v*` GitHub release and returns a controlled 503 while no public Android release exists.

## Release discipline

- Never change `de.donaumoschee.app` after public distribution.
- Never replace or lose the permanent signing key.
- `twa-manifest.json` is the only Android package/version/SDK authority. Bump `versionCode` for every native Android release; production publication compares it to the newest stable Android release and requires a strictly greater value.
- The production tag must equal `android-v<versionName>` exactly.
- Keep `targetSdkVersion` current as Android requirements move.
- Update Android Browser Helper deliberately and validate notifications, app links, back navigation, cold start, background behavior and the Adhan flow on real Android hardware.
- Normal PWA UI/content updates do not require a new APK when the TWA shell itself is unchanged.
- Draft-PR release candidates are private Actions artifacts. Public publication requires the separate `Android production release` workflow to be dispatched from `refs/heads/main`, a successful current-main Android run, manifest-derived identity/version checks, the `android-production` environment, and the exact confirmation phrase. Do not invoke it during release-candidate QA.

If Google Play App Signing is enabled later, the Play-distributed APK may use a different app-signing certificate from this direct-download/upload certificate. Add that Play app-signing SHA-256 as an additional accepted fingerprint in `assetlinks.json`; do not replace the current direct-APK fingerprint.

## Physical-device release-candidate QA

Install `danube-mosque.apk` from the private `danube-mosque-android-rc-<source-sha>` Actions artifact, then verify:

1. Launch opens the trusted production origin. Until the PR is merged/deployed, the live origin cannot serve the new Asset Links file or native bridge/API code, so full TWA/native testing must wait for an authorized deployment.
2. In prayer setup, allow notifications and exact prayer timing; confirm Settings reports both permissions, fresh schedule, cached Adhan, and native engine ready.
3. Run the 10-second reminder test, immediately lock the phone, and confirm the native reminder appears.
4. Run the 10-second Adhan test, immediately lock the phone, and confirm full native playback, the media notification, and Stop.
5. Repeat after removing the TWA activity from recents.
6. Let the chosen Adhan become cached, disable connectivity, and repeat the Adhan test.
7. With future alarms configured, reboot and confirm the schedule is repaired.
8. Revoke notification or exact-alarm access and confirm the app does not crash, reports fallback, and prayer Web Push remains eligible.

Android cannot bypass force-stop, revoked permissions, disabled system notifications, restrictive OEM policy, or user media controls. The engine detects/rechecks those states on the next supported lifecycle event and fails open to Web Push rather than claiming native readiness.
