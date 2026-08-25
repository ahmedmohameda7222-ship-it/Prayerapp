# Android 17 / Play Protect Hardening Design

Date: 2026-08-25
Status: Approved design, pending written-spec review
Scope: Danube Mosque Android TWA application (`de.donaumoschee.app`)

## 1. Objective

Migrate the Android application from API 36 to API 37 while preserving broad device support and the current direct-APK distribution model.

The migration has three P0 outcomes that must all pass before publication:

1. **P0-A — Reliable native Adhan delivery:** the Adhan must start at the scheduled prayer time from the native APK while the app is backgrounded or not in the foreground, including screen-locked and idle/Doze conditions, subject only to Android states that no app can bypass such as user Force Stop, powered-off device, revoked exact-alarm access, or revoked notification permission where applicable.
2. **P0-B — Reliable native prayer reminders:** prayer reminders must be delivered by the native Android path at their scheduled time under the same supported lifecycle conditions, including after reboot and schedule repair.
3. **P0-C — No old-Android/privacy compatibility warning:** a fresh install of the final API-37 signed APK on a modern Android device such as a Samsung Galaxy S25 must not display the Play Protect warning that the app was built for an older Android version and does not include the latest privacy protections.

The release is not complete if any one of these gates fails.

## 2. Distribution and compatibility constraints

The primary distribution method remains direct APK download from the Danube Mosque website. Google Play publication is outside this phase.

The application remains a single APK rather than separate legacy and modern APKs.

Target platform configuration:

- `minSdkVersion`: **23** (Android 6.0+ support retained)
- `compileSdkVersion`: **37**
- `targetSdkVersion`: **37**
- package ID: **`de.donaumoschee.app`**
- permanent production signing certificate: unchanged
- production origin: **`https://donaumoschee.vercel.app`**
- next intended production version: **`1.0.3` / `versionCode 6`**

Targeting API 37 does not mean the application becomes Android-17-only. Newer APIs must be guarded where needed so the same APK remains functional down to API 23.

## 3. Architecture decision

Preserve the current native prayer-delivery architecture. Do not replace it with browser-only scheduling or PWA notification assumptions.

The intended Adhan delivery path remains:

`AlarmManager exact alarm` → `PrayerAlarmReceiver` → `AdhanPlaybackService` foreground media service → verified locally cached Adhan audio.

The current implementation already has the important Android 17-compatible building blocks:

- exact alarms via `AlarmManager.setExactAndAllowWhileIdle()`;
- `SCHEDULE_EXACT_ALARM` capability checks;
- native `BroadcastReceiver` delivery;
- `ContextCompat.startForegroundService()` for Adhan playback;
- `MediaSessionService` / Media3 playback;
- manifest `foregroundServiceType="mediaPlayback"`;
- audio attributes using `USAGE_ALARM`;
- verified local audio cache;
- native delivery ledger and receipt synchronization;
- boot/time/timezone/package-replacement schedule repair.

The migration should harden and verify this architecture rather than redesign it without evidence.

## 4. Exact alarms

Keep `SCHEDULE_EXACT_ALARM` and the existing exact-alarm permission model.

Do not change to `USE_EXACT_ALARM` merely to avoid user-controlled special access. The application must continue to check whether exact alarm scheduling is actually available and report delivery readiness truthfully.

Expected behavior:

- API levels where exact-alarm special access is not required continue through the compatible legacy path.
- API 31+ uses the existing exact-alarm capability check.
- If exact-alarm access is unavailable, the native scheduler must not claim that prayer events are installed.
- Grant/revoke state changes must trigger schedule repair where supported.
- Time, date, timezone, package replacement, and reboot events must continue to reconstruct the native schedule.

## 5. Adhan background playback

Adhan reliability is the highest-priority functional requirement.

The application must continue to use a foreground media service for playback and `USAGE_ALARM` audio semantics.

API-37 migration work must explicitly verify the following states:

- app foreground;
- app background;
- normal user swipe-away / no foreground UI;
- screen locked;
- device idle / Doze;
- process reclaimed by Android, where the scheduled alarm can recreate the required component path;
- after reboot and schedule restoration;
- offline after the required Adhan file is already cached and verified.

The release is blocked if playback only works while the app UI is open.

Force Stop is not treated as a supported background-delivery state because Android intentionally suppresses app execution until the user launches the app again. Likewise, no delivery guarantee can be made while the device is powered off or while the user has disabled capabilities required by Android.

## 6. Native prayer notifications

Prayer reminders must remain native Android notifications, not browser-only notifications.

The API-37 pass must verify:

- notification permission handling on Android 13+;
- reminder delivery while app is backgrounded;
- reminder delivery while screen is locked;
- reminder delivery in idle/Doze conditions through the exact-alarm path;
- reminder delivery after reboot and schedule reconstruction;
- notification tap/deep-link behavior;
- denial and later re-enablement of notification permission;
- truthful native diagnostics when notification delivery is unavailable.

No new notification-related permission should be added unless Android 17 actually requires it for a current feature.

## 7. Android 17 privacy and security posture

The application should adopt API-37 behavior while preserving least privilege.

The migration must audit Android 17 behavior changes that apply to:

- background audio and foreground-service startup;
- activity-launch security;
- network/TLS behavior;
- local-network access controls;
- native/dynamic code loading restrictions;
- permission behavior;
- notification and exact-alarm behavior;
- TWA/browser integration.

The application must not request permissions simply because they are new.

Explicitly prohibited unless a future feature requires them:

- contacts;
- SMS;
- call logs;
- accessibility service access;
- broad/shared-storage access;
- local network access.

The current required permission set should remain narrowly limited to capabilities such as Internet access, notifications, exact alarms, boot reception, foreground media playback, wake lock, and existing TWA task behavior.

The Adhan cache contains data/audio files only; the app must not download executable DEX/JAR/native code to writable storage and execute it.

## 8. Dependency strategy

Do not combine the API-37 migration with an indiscriminate dependency modernization.

Review the existing Android dependencies individually, especially:

- Android Browser Helper;
- AndroidX Browser;
- AndroidX Activity;
- WorkManager;
- Media3 / ExoPlayer;
- desugaring libraries;
- Android Gradle Plugin / Gradle where required.

Upgrade only when one of the following is true:

1. API 37 requires a newer version;
2. the current version has a relevant compatibility or security defect;
3. the current version cannot build/test correctly against the new SDK.

Each material dependency upgrade should be isolated enough that regressions can be attributed to a specific change.

## 9. TWA and application identity

The package name, permanent production certificate, and website origin remain unchanged.

Digital Asset Links must continue to bind:

`https://donaumoschee.vercel.app` ↔ `de.donaumoschee.app` ↔ permanent production certificate.

Loss of TWA trust, unexpected browser chrome, or fallback caused by a broken asset-link relationship is a release blocker.

Debug and production identities remain separate.

## 10. Play Protect and compatibility warning

The final signed APK itself, not only source configuration, must independently verify:

- package ID `de.donaumoschee.app`;
- `versionName 1.0.3`;
- `versionCode 6`;
- `targetSdkVersion 37`;
- production signing certificate fingerprint;
- APK signature validity;
- APK checksum matching published release metadata.

The S25 acceptance test is performed from a clean state:

1. uninstall any installed Danube Mosque package;
2. remove previously downloaded Danube Mosque APK files;
3. download the signed API-37 release candidate or final release through the intended path;
4. initiate installation;
5. confirm that the specific old-Android/latest-privacy-protections warning does not appear;
6. confirm the installed package metadata is the expected API-37 build.

A generic sideload reputation message such as Play Protect not having seen an app before is a separate classification from the old-target compatibility warning and must be recorded separately.

If a freshly downloaded, independently verified API-37 production-signed APK still receives the exact old-Android/privacy compatibility warning, stop speculative code changes. Capture package metadata, APK SHA-256, device/OS details, Play Protect version/state, and the warning evidence, then treat it as a Play Protect classification issue and use Google's developer appeal path.

## 11. Direct-download architecture

Keep the canonical public route:

`/download/android/danube-mosque.apk`

The website must continue resolving this route to the latest approved public Android release.

The download system must ensure that the user-facing route cannot silently serve an older release after a new production version is published. Existing server-side release lookup can remain, but caching behavior must be reviewed end-to-end.

The live download smoke test must follow the production route and inspect the actual downloaded APK for:

- checksum;
- signature/certificate;
- package name;
- version code/name;
- target SDK;
- non-debug identity.

The website serving an APK different from the currently approved release is a release blocker.

## 12. CI and instrumentation design

Reuse and extend the existing workflows rather than creating a parallel release architecture.

### Android TWA workflow

Move build tooling and target assertions from API 36 to API 37.

The workflow must continue to run:

- debug and release unit tests;
- debug and release lint;
- debug APK build;
- debug instrumentation APK build;
- unsigned release APK;
- release AAB;
- exact-head candidate metadata/checksums.

The principal instrumentation environment should move to Android 17 / API 37.

Add Android-17-specific validation for background audio hardening. Where supported by the emulator/runtime, enable the platform audio hardening diagnostic mode during Adhan lifecycle tests so invalid background playback behavior fails loudly during testing rather than only on physical devices.

### Compatibility coverage

Keep API 23 as the minimum-supported contract and add representative compatibility coverage rather than duplicating the full suite at every Android release.

Representative matrix:

- API 23 / Android 6: minimum-supported install/runtime smoke;
- API 26+ / Android 8: service/background compatibility;
- API 31 / Android 12: exact-alarm + foreground-service behavior;
- API 33/34: notification permission and modern alarm behavior;
- API 35/36: recent production compatibility;
- API 37 / Android 17: full modern instrumentation and privacy/security behavior.

The exact matrix can be optimized during implementation for CI cost, but API 23 and API 37 coverage are mandatory acceptance boundaries.

## 13. Signed release-candidate strategy

Do not publish `1.0.3` merely to test it on the S25.

Use the existing isolated signing workflow to create a production-certificate-signed release candidate from an exact tested PR-head artifact.

This preserves:

- source provenance;
- permanent certificate continuity;
- production-key isolation;
- ability to perform Play Protect and physical-device testing before merge/public release.

The signing job must continue to verify source SHA, repository, package identity, version metadata, target SDK, signing alias, permanent certificate fingerprint, APK signature, and AAB signature.

## 14. Physical-device P0 acceptance

Before merge/publication, install the signed release candidate on the modern physical Android test device and run the following P0 checks.

### P0-A Adhan

Pass only if the scheduled Adhan fires through the native path under supported background conditions, including locked-screen/idle testing and post-reboot schedule restoration.

### P0-B Reminder notifications

Pass only if scheduled native prayer reminders are delivered correctly under supported background conditions and after reboot, with correct notification permission handling.

### P0-C Play Protect old-target warning

Pass only if the clean install does not display the warning that the app was built for an older Android version and lacks the latest privacy protections.

A failed P0 blocks merge/public release.

## 15. Release flow

1. Create isolated implementation branch from current `main`.
2. Implement API-37 migration using TDD and focused commits.
3. Keep `minSdkVersion 23` unless an independently verified hard platform/toolchain incompatibility makes that impossible; any proposal to raise it requires explicit user approval.
4. Make Android-17/API-37 CI and instrumentation green.
5. Produce an exact-head production-signed RC using the protected isolated signing job.
6. Run P0-A/P0-B/P0-C on the physical modern Android device.
7. Do not merge if any P0 fails.
8. After all P0 gates pass, merge through the normal reviewed workflow.
9. Re-run CI and Android TWA verification on the exact `main` merge SHA.
10. Set/finalize release metadata as `1.0.3 / versionCode 6` if not already finalized during the branch work.
11. Trigger the protected Android production release workflow from the exact green `main` run.
12. Publish immutable APK/AAB/checksums/release metadata with the permanent certificate.
13. Run the live public-download smoke against the website route.
14. Perform one final fresh website-download install check on the modern Android device.

## 16. Rollback and failure policy

The safest rollback is to prevent a broken version from being published.

Because Android application updates require monotonically increasing `versionCode`, a published `versionCode 6` cannot be replaced for users by downgrading to code 5.

If a severe defect is found after `1.0.3 / code 6` publication, issue a corrected release such as `1.0.4 / code 7` rather than overwriting the immutable release or attempting a downgrade.

Never weaken production signing, package identity, exact-source provenance, or monotonic version checks to speed up a hotfix.

## 17. Future Android Developer Verification readiness

Direct website APK distribution remains the chosen model.

Track Android Developer Verification readiness separately from the API-37 migration. The future task should cover developer identity verification, registration of `de.donaumoschee.app`, and association with the existing production signing identity while preserving direct website distribution.

This future registration work must not block API-37 implementation unless Google changes enforcement requirements before release.

## 18. Non-goals

This phase does not include:

- moving primary distribution to Google Play;
- redesigning the prayer/reminder UX;
- replacing native scheduling with web push/PWA scheduling;
- changing Adhan content;
- changing the production package ID;
- changing the permanent signing key;
- removing support for Android 6+ without explicit approval;
- broad dependency upgrades unrelated to API-37 compatibility/security;
- adding unnecessary permissions.

## 19. Definition of done

The Android 17 / Play Protect hardening phase is complete only when all of the following are true:

- `minSdkVersion` remains 23;
- `compileSdkVersion` is 37;
- `targetSdkVersion` is 37;
- API-37 Android build/lint/unit/instrumentation verification is green;
- representative minimum/legacy compatibility checks pass;
- native Adhan delivery passes P0-A;
- native prayer notifications pass P0-B;
- the S25 clean-install old-Android/privacy warning passes P0-C;
- permanent signing identity is unchanged and verified;
- Digital Asset Links / TWA trust remains valid;
- no unnecessary Android permissions were introduced;
- the website live-download path serves the exact approved production APK;
- the production APK's package/version/target/signature/checksum all match release metadata;
- post-publication smoke verification passes.

## 20. Primary official references

- Android 17 behavior changes for apps targeting Android 17: https://developer.android.com/about/versions/17/behavior-changes-17
- Android 17 background audio changes: https://developer.android.com/about/versions/17/changes/bg-audio
- Foreground-service background-start restrictions: https://developer.android.com/develop/background-work/services/fgs/restrictions-bg-start
- Play Protect warning guidance for developers: https://developers.google.com/android/play-protect/warning-dev-guidance
- Android exact alarm APIs/permissions: https://developer.android.com/reference/android/app/AlarmManager
- Android Developer Verification FAQ: https://developer.android.com/developer-verification/guides/faq
