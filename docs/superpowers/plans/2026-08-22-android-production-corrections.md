# Android Production Corrections Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Correct the five security/runtime defects and two release-safety defects blocking deployment and physical Android testing on Draft PR #46.

**Architecture:** The web catalog remains product authority and is checked against the native catalog. Android reports runtime permission and delivery capabilities separately; server parsing independently derives fail-open native readiness. PR CI builds unsigned artifacts, while a manually authorized isolated signing job downloads a validated exact-head artifact and never checks out PR code with secrets present. Production publication runs only from main and derives all Android metadata from `twa-manifest.json`.

**Tech Stack:** Next.js 16.2.9, TypeScript/Vitest, Supabase/Postgres, Java 17/Android API 36, AndroidX Core/Activity, Gradle, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-08-22-android-production-corrections.md`

## Global Constraints

- Same branch `codex/android-production-complete` and same Draft PR #46.
- No merge, production deployment, tag, or public release.
- Current identity remains `de.donaumoschee.app`, versionCode `2`, versionName `1.0.0`, targetSdk `36`.
- Permanent signing secrets must never enter an automatic pull-request job or PR build process.
- Every production-code correction follows a witnessed red-green test cycle.

---

### Task 1: Restore and lock catalog parity

**Files:**
- Modify: `lib/__tests__/android-production-contract.test.ts`
- Modify: `android-twa/app/src/test/java/de/donaumoschee/app/adhan/AdhanCatalogTest.java`
- Modify: `lib/adhan-audio.ts`
- Modify: `android-twa/app/src/main/java/de/donaumoschee/app/adhan/AdhanCatalog.java`

**Interfaces:**
- Web authority: `ADHAN_SOUNDS` entries `{ id, kind, audioUrl }`.
- Native export: `AdhanCatalog.approvedSounds(): Map<String, ApprovedSound>` where `ApprovedSound` exposes `url` and `kind`.

- [x] Write a web/native parity test with a literal nine-entry expected catalog, including `fajr-madinah -> /Azan/19.mp3` and `kind=fajr`.
- [x] Run the focused Vitest and JVM tests; confirm failure on the current `/Azan/20.mp3` implementation and missing native kind export.
- [x] Restore only `fajr-madinah` to `/Azan/19.mp3` and expose an immutable native approved-sound map.
- [x] Re-run focused tests and confirm pass.

### Task 2: Model real notification delivery and fail open server authority

**Files:**
- Create: `android-twa/app/src/main/java/de/donaumoschee/app/prayer/NotificationCapabilities.java`
- Create: `android-twa/app/src/test/java/de/donaumoschee/app/prayer/NotificationCapabilitiesTest.java`
- Modify: `android-twa/app/src/main/java/de/donaumoschee/app/prayer/NativeStatus.java`
- Modify: `android-twa/app/src/main/java/de/donaumoschee/app/prayer/NativeReadiness.java`
- Modify: `android-twa/app/src/test/java/de/donaumoschee/app/prayer/NativeReadinessTest.java`
- Modify: `android-twa/app/src/main/java/de/donaumoschee/app/workers/NativeRefreshWorker.java`
- Modify: `lib/android/contracts.ts`
- Modify: `lib/android/native-web.ts`
- Modify: `lib/__tests__/android-native-contracts.test.ts`
- Modify: `lib/__tests__/native-prayer-authority.test.ts`
- Modify: `app/api/android/native-authority/heartbeat/route.ts`
- Modify: `supabase/migrations/20260821220800_android_native_authority.sql`

**Interfaces:**
- `NotificationCapabilities.evaluate(int sdk, boolean runtimeGranted, boolean appEnabled, int reminderImportance, int adhanImportance)`.
- Payload fields: `notificationPermission`, `notificationDeliveryEnabled`, `reminderChannelEnabled`, `adhanChannelEnabled`.
- `NativeReadiness.isReady(...)` requires notification delivery and both channels in addition to existing capabilities.

- [x] Add literal tests for pre-33 app-disabled, 33+ permission-denied, globally disabled, reminder-channel disabled, Adhan-channel disabled, and fully enabled states.
- [x] Add heartbeat parser/lease tests proving each disabled delivery state yields `nativeReady=false` and fails open.
- [x] Run focused JVM/Vitest tests and confirm expected failures.
- [x] Implement capability collection using `NotificationManagerCompat.areNotificationsEnabled()` and API-26 channel importance checks; treat an absent channel as creatable, but `IMPORTANCE_NONE` as disabled.
- [x] Persist the separated status fields and make server readiness independently require all delivery fields.
- [x] Re-run focused tests and the clean local Supabase migration/bootstrap checks.

### Task 3: Replace fragile exact-alarm resume handling

**Files:**
- Modify: `android-twa/app/src/main/java/de/donaumoschee/app/NativePermissionActivity.java`
- Modify: `android-twa/app/build.gradle`
- Modify: `lib/__tests__/android-production-contract.test.ts`

**Interfaces:**
- `ActivityResultLauncher<Intent>` registered before launch.
- Callback ignores `resultCode` as authority, calls `NativeStatus.hasExactAlarmPermission()`, and only reschedules through `finishAndRepair()` using current capability.

- [x] Add a regression contract that rejects `waitingForExactSettings`/`onResume` and requires an Activity Result launcher plus a post-return capability check.
- [x] Run the focused test and confirm it fails.
- [x] Add the direct AndroidX Activity dependency already resolved transitively at 1.9.0 and convert the activity to `ComponentActivity`/`StartActivityForResult`.
- [x] Re-run focused tests, compile, and Android lint.

### Task 4: Secure CI signing and centralize release metadata

**Files:**
- Modify: `.github/workflows/android-twa.yml`
- Modify: `.github/workflows/android-production-release.yml`
- Modify: `lib/__tests__/android-twa-contract.test.ts`
- Modify: `android-twa/README.md`

**Interfaces:**
- Automatic PR job uploads `danube-mosque-unsigned-candidate` containing unsigned APK/AAB and exact source metadata; it has no signing secret references.
- Manual RC signing job requires `SIGN_ANDROID_RC`, `run_id`, and `source_sha`, uses `android-production`, downloads the prior artifact, performs no checkout, signs, verifies, cleans up, and uploads `danube-mosque-android-rc-<source-sha>`.
- Production workflow job guard: `github.ref == 'refs/heads/main'`; metadata comes from `twa-manifest.json`; input tag equals `android-v${versionName}`.

- [x] Replace old workflow assertions with security/metadata tests that fail while automatic PR signing and hardcoded `1.0.0`/`versionCode=2` verification remain.
- [x] Run focused workflow tests and confirm expected failures.
- [x] Implement unsigned PR artifact generation and isolated manual RC signing.
- [x] Harden production dispatch to main and derive package/version/SDK; compare versionCode with the latest stable Android release APK when available.
- [x] Run focused tests and YAML parsing; confirm no secret-bearing automatic PR path remains.

### Task 5: Full verification, exact-head RC, and Draft PR update

**Files:**
- Modify only if verification exposes a scoped defect.

- [x] Run `git diff --check`, `npm ci`, lint, TypeScript, full Vitest, and Next build.
- [x] Run clean Supabase migration bootstrap, DB lint, RLS/grant checks, and stop the local stack.
- [x] Run debug/release JVM tests, Android lint, debug/release APK builds, and AAB build.
- [x] Verify zero retired-domain references and zero committed signing material.
- [ ] Commit only scoped paths and push the existing branch.
- [ ] Wait for exact-head normal CI and unsigned Android CI.
- [ ] Manually dispatch the isolated RC signer for the exact approved head; if the protected environment requests external approval, report that single blocker.
- [ ] Download and independently verify the replacement APK/AAB package, version, target SDK, certificate, structure, and SHA-256.
- [ ] Update Draft PR #46 with exact-head evidence without merging, deploying, tagging, or publishing.
