# Android V2 Recovery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stabilize Danube Mosque Android localization, prayer delivery, fallback, security, Adhan playback, TWA lifecycle, and release verification without exposing partially repaired behavior through `main`.

**Architecture:** Implement on `recovery/android-v2`, created from the exact latest `main` SHA at recovery start. Each subsystem is developed test-first on a child branch and squash-merged into the recovery branch only after green checks; the recovery branch reaches `main` only after signed RC and full QA.

**Tech Stack:** Next.js 16.3.2, React 19.2.4, TypeScript 5, Vitest, Supabase/Postgres, service worker Web Push, Java Android TWA, Android Browser Helper, WorkManager, AlarmManager, Media3, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-08-23-android-v2-recovery-design.md`

## Global Constraints

- Permanent Android package: `de.donaumoschee.app`.
- Production origin: `https://donaumoschee.vercel.app`.
- Permanent signing SHA-256: `E9:98:4B:DB:36:FF:2F:8F:A5:58:29:5C:5C:06:6F:BA:ED:3A:BD:BD:CC:80:1C:83:5D:AE:1B:DD:4C:D7:0E:92`.
- Mosque-published prayer schedules remain authoritative; do not calculate geographic prayer times.
- Never fabricate missing production content.
- Read the relevant installed Next.js 16.3.2 docs under `node_modules/next/dist/docs/` before writing Next.js-specific API code.
- Every behavior change follows RED -> GREEN -> regression verification.
- Child PRs target `recovery/android-v2` and use squash merge only after green checks.
- Do not merge `recovery/android-v2` to `main`, create a public Android tag/release, or deploy a public Android release without separate user authorization.

---

### Task 1: Localization authority and prayer-table regression

**Files:**
- Create: `lib/i18n/detect-locale.ts`
- Create: `lib/i18n/localization-contract.test.ts`
- Modify: `lib/i18n/types.ts`
- Modify: `app/layout.tsx`
- Modify: `messages/de.json`
- Modify: `components/prayer/HomePrayerTimesCard.tsx`
- Modify: `components/prayer/HomePrayerTimesCard.test.tsx`

**Interfaces:**
- Produces: `detectSupportedLocale(acceptedLanguages: readonly string[]): Locale`.
- Produces root HTML with correct `lang`, `dir`, and machine-translation prevention.
- Produces canonical German prayer strings `Fajr`, `Dhuhr`, `Asr`, `Maghrib`, `Isha`.

- [ ] Write failing tests proving unsupported/no locale resolves to English, supported language preference resolves to `ar|en|de|tr`, root layout contains translation-prevention markers, English prayer names never contain machine-translated names, all message catalogs have key parity, German names are canonical, and long prayer labels cannot collide structurally with fixed time columns.
- [ ] Push the test-only commit and verify GitHub Actions fails for the expected missing behavior.
- [ ] Implement `detectSupportedLocale`, wire request language detection into the server layout while keeping cookie precedence, and add non-translation metadata/attributes.
- [ ] Normalize German prayer names and make the prayer-name column flexible while time/control columns remain fixed enough for 320px mobile widths.
- [ ] Push implementation and verify focused plus full web CI turns green.
- [ ] Open PR A against `recovery/android-v2`; squash merge only after green checks.

### Task 2: Native delivery state and capability correctness

**Files:**
- Create: `android-twa/app/src/main/java/de/donaumoschee/app/prayer/DeliveryState.java`
- Create: `android-twa/app/src/main/java/de/donaumoschee/app/prayer/DeliveryRecord.java`
- Modify: `android-twa/app/src/main/java/de/donaumoschee/app/storage/NativeStore.java`
- Modify: `android-twa/app/src/main/java/de/donaumoschee/app/prayer/PrayerAlarmReceiver.java`
- Modify: `android-twa/app/src/main/java/de/donaumoschee/app/prayer/NotificationCapabilities.java`
- Modify: `android-twa/app/src/main/java/de/donaumoschee/app/adhan/AdhanPlaybackService.java`
- Add/modify matching JUnit tests under `android-twa/app/src/test/...`.

**Interfaces:**
- Produces persistent event states `SCHEDULED`, `FIRING`, `DELIVERED`, `FAILED`.
- Produces independent reminder/Adhan capability evaluation.

- [ ] Write failing tests for missing-channel=false, delivered-after-success only, failed notification state, failed playback state, bounded delivery record retention, and duplicate event rejection.
- [ ] Verify RED through Android CI.
- [ ] Implement minimal delivery record store and receiver/service transitions.
- [ ] Verify Android unit/lint/build checks green and squash merge PR B into recovery.

### Task 3: Canonical event IDs, server receipts, and fallback-v2 schema

**Files:**
- Create: `lib/android/prayer-event-id.ts`
- Create: `lib/android/prayer-event-id.test.ts`
- Create: new ordered Supabase migration for native delivery receipts/capabilities.
- Modify: `lib/android/native-authority.ts`
- Modify: `app/api/cron/prayer-reminders/route.ts`
- Modify: `lib/prayer-reminder-delivery.ts`
- Modify: `public/sw.js`
- Add migration/RLS tests.

**Interfaces:**
- Produces deterministic `prayerEventId(...)`.
- Produces short-retention server-only native delivery receipts.
- Prayer push payload includes `eventId`, `dueAt`, `expiresAt`.

- [ ] Write failing TS and migration tests for deterministic IDs, RLS denial to normal clients, receipt-aware fallback, independent reminder/Adhan capability, and stale-push suppression.
- [ ] Verify RED.
- [ ] Implement schema and server logic fail-open toward delivery.
- [ ] Verify clean Supabase reset/lint plus web CI and squash merge PR C.

### Task 4: Native scheduler-v2 and receipt reporting

**Files:**
- Modify: `android-twa/.../prayer/AlarmEvent.java`
- Modify: `android-twa/.../prayer/AlarmPlanner.java`
- Modify: `android-twa/.../prayer/PrayerScheduler.java`
- Modify: `android-twa/.../workers/NativeWork.java`
- Modify: `android-twa/.../workers/NativeRefreshWorker.java`
- Modify: `android-twa/.../system/ScheduleRepairReceiver.java`
- Create focused receipt retry worker/client classes and tests.

**Interfaces:**
- Consumes canonical event-ID fixtures from Task 3.
- Produces ~14-day exact-alarm horizon and queued delivery receipts.

- [ ] Add failing Java fixtures matching TypeScript event IDs and tests for 14-day horizon, reboot/time repair, offline receipt queue, and generation guards.
- [ ] Verify RED.
- [ ] Implement planner/worker split and receipt retry.
- [ ] Verify Android CI and squash merge PR D.

### Task 5: Native secret boundary and account generation

**Files:**
- Modify: `android-twa/.../prayer/NativeStatus.java`
- Modify: `android-twa/.../bridge/BridgeHandler.java`
- Modify: `android-twa/.../storage/NativeStore.java`
- Modify: `components/providers/NativeAndroidProvider.tsx`
- Modify: `lib/android/native-web.ts`
- Modify/add Android API routes for native-owned enrollment/revocation.
- Add security/contract tests.

**Interfaces:**
- Native credential remains Android-private.
- JS receives non-secret installation/status data only.

- [ ] Write failing tests proving bridge status never serializes credential and account reset invalidates older generations.
- [ ] Verify RED.
- [ ] Implement native-owned authenticated server calls and safe offline revocation retry.
- [ ] Verify web + Android CI and squash merge PR E.

### Task 6: Native locale, precise permissions, and truthful diagnostics

**Files:**
- Modify: `android-twa/.../prayer/NativeConfig.java`
- Modify: `android-twa/.../NativePermissionActivity.java`
- Modify: native notification helpers/resources.
- Modify: `components/settings/PrayerSystemTestControls.tsx`
- Modify: `components/providers/NativeAndroidProvider.tsx`
- Add native test-result persistence and tests.

**Interfaces:**
- Native config carries app locale.
- Test flow returns persisted actual outcome by `testId`.

- [ ] Write failing tests for selected-locale native copy, precise channel/app/exact-alarm settings intents, and no success without actual delivery/playback state.
- [ ] Verify RED.
- [ ] Implement locale context, diagnostic states, deep links, and result polling.
- [ ] Verify and squash merge PR F.

### Task 7: Adhan cache integrity and prayer-time offline reliability

**Files:**
- Modify: `lib/adhan-audio.ts`
- Modify: `android-twa/.../adhan/AdhanCatalog.java`
- Modify: `android-twa/.../adhan/AudioCache.java`
- Modify: `android-twa/.../adhan/AdhanPlaybackService.java`
- Add cross-catalog and cache integrity tests.

**Interfaces:**
- Approved sounds carry expected integrity metadata.
- Prayer-time playback accepts verified local media only.

- [ ] Add failing tests for mismatched hash, missing cache, valid cache, atomic replacement, and no network fallback at prayer time.
- [ ] Verify RED.
- [ ] Implement known-hash verification and cached-only playback.
- [ ] Verify and squash merge PR G.

### Task 8: TWA/install/update hardening

**Files:**
- Characterize then modify `android-twa/.../LauncherActivity.java` and Android manifest/resources.
- Modify install/update detection components/providers.
- Add adaptive icon resources and launcher/install contract tests.

**Interfaces:**
- Browser fallback cannot advertise native readiness.
- Install state distinguishes browser, PWA, native Android, and iOS PWA.

- [ ] Write characterization/failing tests before launcher changes.
- [ ] Use Android Browser Helper supported provider/verification primitives where compatible with the verified postMessage contract.
- [ ] Implement install-state and update UX hardening without broad self-install permission.
- [ ] Verify and squash merge PR H.

### Task 9: QA, CI, observability, and release hardening

**Files:**
- Add Android `androidTest` instrumentation suite.
- Modify `.github/workflows/android-twa.yml` path triggers and emulator gates.
- Modify production/live-download verification workflow to run certificate inspection on the downloaded APK.
- Remove obsolete one-shot repair workflow after verifying no dependency on it.
- Add structured non-secret delivery diagnostics.

**Interfaces:**
- CI covers web/native contract changes, Android framework behavior, package/certificate identity, and live APK verification.

- [ ] Add failing contract checks proving currently uncovered files do not trigger Android validation and live smoke does not verify cert.
- [ ] Implement expanded triggers/emulator suite/live `apksigner` verification.
- [ ] Run full web, Android, Supabase, and release-candidate validation on one exact integration SHA.
- [ ] Generate signed private RC only through the protected signing workflow.
- [ ] Execute physical-device matrix on Samsung and Pixel-class devices.
- [ ] Open final recovery PR against `main` only after all scoped P0/P1 issues are closed and all evidence is attached; do not merge/release without separate authorization.
