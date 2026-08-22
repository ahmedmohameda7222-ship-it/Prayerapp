# Android Production Corrections Specification

## Authority

This correction specification implements the binding continuation brief supplied on 2026-08-22 for the existing branch `codex/android-production-complete` and Draft PR #46.

## Required corrections

1. Restore `fajr-madinah` to the pre-PR URL `https://www.ashefaa.com/ruqia/Azan/19.mp3` in both catalogs and enforce full web/native catalog parity.
2. Separate notification runtime permission from actual notification delivery capability. Native authority must require global app notifications, the prayer reminder channel, and the Adhan media channel to be deliverable.
3. Remove permanent signing secrets from automatic pull-request jobs. Normal PR CI must produce unsigned diagnostics only. A manually authorized RC signing path must sign a previously built exact-head unsigned artifact without checking out or executing PR build code while secrets are present.
4. Treat `android-twa/twa-manifest.json` as the single Android identity/version source. Release tag, embedded version, package ID, versionCode, and target SDK must be derived and cross-checked; versionCode must exceed the latest published Android APK when one exists.
5. Refuse production publication unless the workflow dispatch itself runs from `refs/heads/main`.
6. Replace the exact-alarm resume flag with an Activity Result callback and re-check `canScheduleExactAlarms()` after return before repair/rescheduling.
7. Re-run the complete web, Supabase, Android, CI, catalog, domain, secret, and signed-artifact validation suite.

## Boundaries

- Stay on the same branch and Draft PR #46.
- Do not merge, deploy, tag, or publish a production release.
- Do not create a replacement signing identity or reveal signing secrets.
- Preserve package `de.donaumoschee.app`, versionCode `2`, versionName `1.0.0`, targetSdk `36`, and production certificate SHA-256 `E9:98:4B:DB:36:FF:2F:8F:A5:58:29:5C:5C:06:6F:BA:ED:3A:BD:BD:CC:80:1C:83:5D:AE:1B:DD:4C:D7:0E:92` for this RC.
