# Android 17 / Play Protect Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship Danube Mosque Android `1.0.3 / versionCode 6` as a single Android 6+ APK targeting Android 17 / API 37, with reliable native Adhan/reminder delivery and no Play Protect old-Android/latest-privacy-protections compatibility warning on a clean modern-device install.

**Architecture:** Preserve the current native prayer path (`AlarmManager` → `PrayerAlarmReceiver` → native notification or `AdhanPlaybackService`) and the direct website APK distribution model. Upgrade only the Android build toolchain required for API 37, add API-37/API-23 verification boundaries, refuse stale public APKs, then test an exact-head production-signed RC on the physical device before merge/publication.

**Tech Stack:** Java 17, Android Gradle Plugin 9.1.1, Gradle 9.3.1, Android SDK API 37, SDK Build Tools 36.0.0, AndroidX, WorkManager, Media3/ExoPlayer, Android Browser Helper/TWA, Next.js 16, TypeScript, Vitest, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-08-25-android-17-play-protect-hardening-design.md`

## Global Constraints

- Keep package ID exactly `de.donaumoschee.app`.
- Keep production origin exactly `https://donaumoschee.vercel.app`.
- Keep `minSdkVersion` exactly `23`; any proposal to raise it requires explicit user approval.
- Set `compileSdkVersion` and `targetSdkVersion` to exactly `37`.
- Final RC and public release identity is exactly `versionName 1.0.3` / `versionCode 6`.
- Keep `minimumSupportedVersionCode` at `3` unless a separate product decision explicitly changes it.
- Keep the permanent production certificate SHA-256 exactly `E9:98:4B:DB:36:FF:2F:8F:A5:58:29:5C:5C:06:6F:BA:ED:3A:BD:BD:CC:80:1C:83:5D:AE:1B:DD:4C:D7:0E:92`.
- Direct website APK remains the primary distribution path; Google Play publication is out of scope.
- Preserve native Adhan scheduling/playback and native reminder delivery; do not replace either with browser/PWA-only delivery.
- Preserve `SCHEDULE_EXACT_ALARM`, `FOREGROUND_SERVICE_MEDIA_PLAYBACK`, and `USAGE_ALARM` semantics.
- Do not add contacts, SMS, call-log, accessibility, broad storage, or `ACCESS_LOCAL_NETWORK` permissions.
- Do not reintroduce the removed Adhan rights publication gate.
- Do not broadly modernize dependencies. API 37 requires AGP 9.1.1+; choose AGP 9.1.1 + Gradle 9.3.1 to minimize unrelated change. JDK 17 and Build Tools 36.0.0 remain valid for AGP 9.1.1.
- Android 17 audio-hardening clarification: normal Android 17 behavior is the P0 pass condition. `adb shell cmd audio set-enable-hardening throw` is diagnostics-only because Google documents that `throw` deliberately enforces WIU restrictions even for exact-alarm + `USAGE_ALARM` traffic; do not require the legitimate alarm path to pass under `throw`.
- No merge or public `1.0.3` release until P0-A Adhan, P0-B native reminders, and P0-C Play Protect old-target-warning checks all pass on the exact signed RC.
- If P0-C still shows the exact old-target/privacy warning after independent verification of `targetSdkVersion 37`, stop speculative code changes and use Play Protect classification evidence/appeal instead.

## File Structure / Responsibility Map

- `android-twa/twa-manifest.json` — canonical Android SDK and release identity.
- `android-twa/build.gradle` — Android Gradle Plugin version.
- `android-twa/gradle/wrapper/gradle-wrapper.properties` — Gradle runtime version.
- `android-twa/app/build.gradle` — app build configuration and dependencies; do not change dependency versions unless API-37 build evidence requires it.
- `android-twa/app/src/main/AndroidManifest.xml` — production permissions/components; preserve least privilege.
- `android-twa/app/src/main/java/de/donaumoschee/app/adhan/AdhanPlaybackService.java` — native Adhan `MediaSessionService` using `USAGE_ALARM` and verified local audio.
- `android-twa/app/src/main/java/de/donaumoschee/app/prayer/PrayerAlarmReceiver.java` — exact-alarm delivery entrypoint.
- `android-twa/app/src/main/java/de/donaumoschee/app/prayer/PrayerScheduler.java` — exact scheduling and immutable `PendingIntent` creation.
- `android-twa/app/src/main/java/de/donaumoschee/app/system/ScheduleRepairReceiver.java` — reboot/time/timezone/package-replacement repair.
- `android-twa/app/src/test/java/de/donaumoschee/app/Android17BehaviorSourceContractTest.java` — new static guardrail for API-37 privacy and native delivery architecture.
- `android-twa/app/src/androidTest/java/de/donaumoschee/app/Android17PlatformInstrumentationTest.java` — new installed-package/manifest/service runtime verification.
- `android-twa/app/src/test/java/de/donaumoschee/app/AndroidInstrumentationSuiteSourceContractTest.java` — require new instrumentation coverage.
- `lib/android-release.ts` — pure release-selection/identity helpers.
- `lib/android-release-server.ts` — server release lookup; must refuse an older public release when deployed source expects a newer Android identity.
- `lib/__tests__/android-twa-contract.test.ts` — canonical SDK/toolchain/signing/TWA contracts.
- `lib/__tests__/android-ci-coverage-contract.test.ts` — CI/emulator coverage contracts.
- `lib/__tests__/android-download-regression.test.ts` — direct APK distribution and stale-release regression contracts.
- `lib/__tests__/android-live-apk-cert-contract.test.ts` — live APK verification toolchain/certificate contract.
- `lib/__tests__/android-production-release-workflow.test.ts` — protected release-policy contract.
- `lib/__tests__/android-update-system.test.ts` — immutable release/version contract.
- `.github/workflows/android-twa.yml` — unsigned exact-head build, API-23/API-37 instrumentation, isolated manual signing.
- `.github/workflows/android-production-release.yml` — protected production build/sign/publish.
- `.github/workflows/android-download-smoke.yml` — post-publication website APK verification.
- `docs/superpowers/qa/2026-08-25-android-17-p0-device-acceptance.md` — exact physical-device P0 procedure/evidence.

---

### Task 1: Move the Android build toolchain to API 37 without changing release identity yet

**Files:**
- Modify: `lib/__tests__/android-twa-contract.test.ts`
- Modify: `android-twa/twa-manifest.json`
- Modify: `android-twa/build.gradle`
- Modify: `android-twa/gradle/wrapper/gradle-wrapper.properties`

**Interfaces:**
- Consumes: existing JSON-driven `compileSdk`, `targetSdk`, `minSdk` wiring in `android-twa/app/build.gradle`.
- Produces: API-37 build baseline using AGP `9.1.1`, Gradle `9.3.1`, JDK 17, Build Tools `36.0.0`, while temporarily retaining `1.0.2/code5` until the final RC task.

- [ ] **Step 1: Change the web contract test first so the current tree fails for API 37**

Update the first test in `lib/__tests__/android-twa-contract.test.ts` to include these exact assertions:

```ts
const wrapper = read("android-twa/gradle/wrapper/gradle-wrapper.properties");

expect(config.compileSdkVersion).toBe(37);
expect(config.targetSdkVersion).toBe(37);
expect(config.minSdkVersion).toBe(23);
expect(config.versionCode).toBe(5);
expect(config.versionName).toBe("1.0.2");
expect(config.minimumSupportedVersionCode).toBe(3);
expect(rootGradle).toContain("com.android.application' version '9.1.1'");
expect(wrapper).toContain("gradle-9.3.1-bin.zip");
```

Also change the test title from `current API-36 toolchain` to `current API-37 toolchain`.

- [ ] **Step 2: Run the focused contract test and confirm RED**

Run:

```bash
npm test -- lib/__tests__/android-twa-contract.test.ts
```

Expected: FAIL on compile SDK `36`, target SDK `36`, AGP `8.11.1`, and Gradle `8.13` expectations.

- [ ] **Step 3: Apply the minimum compatible API-37 toolchain**

Change `android-twa/twa-manifest.json` only at this stage:

```json
"compileSdkVersion": 37,
"targetSdkVersion": 37,
"minSdkVersion": 23,
"versionCode": 5,
"versionName": "1.0.2",
"minimumSupportedVersionCode": 3
```

Change `android-twa/build.gradle` to:

```groovy
plugins {
    id 'com.android.application' version '9.1.1' apply false
}
```

Change the Gradle wrapper URL to:

```properties
distributionUrl=https\://services.gradle.org/distributions/gradle-9.3.1-bin.zip
```

Do not change Java 17 or application dependency versions in this task.

- [ ] **Step 4: Verify the Gradle runtime and focused web contract**

Run:

```bash
cd android-twa
./gradlew --version
cd ..
npm test -- lib/__tests__/android-twa-contract.test.ts
```

Expected: Gradle reports `9.3.1`; Vitest passes.

- [ ] **Step 5: Prove API-37 debug/release builds work before touching dependencies**

Run:

```bash
cd android-twa
./gradlew --no-daemon \
  :app:testDebugUnitTest :app:lintDebug :app:assembleDebug :app:assembleDebugAndroidTest \
  :app:testReleaseUnitTest :app:lintRelease :app:assembleRelease :app:bundleRelease \
  --stacktrace
```

Expected: PASS. If this exact build is green, do not upgrade Android Browser Helper, AndroidX, WorkManager, Media3, Activity, Browser, or desugaring libraries merely because newer versions exist.

- [ ] **Step 6: Independently inspect the unsigned release APK identity**

Run:

```bash
$ANDROID_HOME/build-tools/36.0.0/aapt dump badging \
  android-twa/app/build/outputs/apk/release/app-release-unsigned.apk \
  | grep -E "package:|sdkVersion:|targetSdkVersion:"
```

Expected output contains package `de.donaumoschee.app`, `sdkVersion:'23'`, and `targetSdkVersion:'37'`.

- [ ] **Step 7: Commit**

```bash
git add \
  lib/__tests__/android-twa-contract.test.ts \
  android-twa/twa-manifest.json \
  android-twa/build.gradle \
  android-twa/gradle/wrapper/gradle-wrapper.properties
git commit -m "build(android): move toolchain to API 37"
```

---

### Task 2: Freeze the Android 17 least-privilege and native delivery architecture as source contracts

**Files:**
- Create: `android-twa/app/src/test/java/de/donaumoschee/app/Android17BehaviorSourceContractTest.java`
- Modify: `android-twa/app/src/test/java/de/donaumoschee/app/prayer/NotificationCapabilitiesTest.java`

**Interfaces:**
- Consumes: `AndroidManifest.xml`, `AdhanPlaybackService`, `PrayerAlarmReceiver`, `PrayerScheduler`, `ScheduleRepairReceiver`.
- Produces: a regression guard proving the API-37 migration does not add high-risk permissions or replace the intended exact-alarm → native delivery path.

- [ ] **Step 1: Add the Android 17 source contract**

Create `Android17BehaviorSourceContractTest.java` with this structure:

```java
package de.donaumoschee.app;

import org.junit.Test;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;

import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

public final class Android17BehaviorSourceContractTest {
    private static Path repositoryRoot() {
        Path current = Path.of(System.getProperty("user.dir")).toAbsolutePath();
        for (Path cursor = current; cursor != null; cursor = cursor.getParent()) {
            if (Files.exists(cursor.resolve("android-twa/app/src/main"))) return cursor;
            if (cursor.getFileName() != null
                    && "android-twa".equals(cursor.getFileName().toString())
                    && Files.exists(cursor.resolve("app/src/main"))) return cursor.getParent();
        }
        throw new IllegalStateException("Repository root not found");
    }

    private static String source(String path) throws IOException {
        return Files.readString(repositoryRoot().resolve(path), StandardCharsets.UTF_8);
    }

    @Test
    public void manifestKeepsLeastPrivilegeForAndroid17() throws IOException {
        String manifest = source("android-twa/app/src/main/AndroidManifest.xml");
        for (String required : List.of(
                "android.permission.INTERNET",
                "android.permission.POST_NOTIFICATIONS",
                "android.permission.SCHEDULE_EXACT_ALARM",
                "android.permission.RECEIVE_BOOT_COMPLETED",
                "android.permission.FOREGROUND_SERVICE",
                "android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK",
                "android.permission.WAKE_LOCK"
        )) assertTrue(required, manifest.contains(required));

        for (String forbidden : List.of(
                "android.permission.ACCESS_LOCAL_NETWORK",
                "android.permission.READ_SMS",
                "android.permission.RECEIVE_SMS",
                "android.permission.READ_CONTACTS",
                "android.permission.READ_CALL_LOG",
                "android.permission.MANAGE_EXTERNAL_STORAGE",
                "android.permission.WRITE_EXTERNAL_STORAGE",
                "android.permission.BIND_ACCESSIBILITY_SERVICE"
        )) assertFalse(forbidden, manifest.contains(forbidden));

        assertTrue(manifest.contains("android:allowBackup=\"false\""));
        assertTrue(manifest.contains("android:usesCleartextTraffic=\"false\""));
    }

    @Test
    public void adhanUsesExactAlarmMediaForegroundServiceAndAlarmAudio() throws IOException {
        String manifest = source("android-twa/app/src/main/AndroidManifest.xml");
        String service = source("android-twa/app/src/main/java/de/donaumoschee/app/adhan/AdhanPlaybackService.java");
        String receiver = source("android-twa/app/src/main/java/de/donaumoschee/app/prayer/PrayerAlarmReceiver.java");
        String scheduler = source("android-twa/app/src/main/java/de/donaumoschee/app/prayer/PrayerScheduler.java");
        String repair = source("android-twa/app/src/main/java/de/donaumoschee/app/system/ScheduleRepairReceiver.java");

        assertTrue(manifest.contains("android:foregroundServiceType=\"mediaPlayback\""));
        assertTrue(service.contains("extends MediaSessionService"));
        assertTrue(service.contains("setUsage(C.USAGE_ALARM)"));
        assertTrue(service.contains("AudioCache.verifiedFile(this, soundId)"));
        assertTrue(receiver.contains("ContextCompat.startForegroundService(context, playback)"));
        assertTrue(scheduler.contains("setExactAndAllowWhileIdle"));
        assertFalse(repair.contains("AdhanPlaybackService"));
    }
}
```

- [ ] **Step 2: Update API-36-only numeric unit examples to exercise API 37 instead**

In `NotificationCapabilitiesTest.java`, change modern example SDK literals from `36` to `37` where the test is expressing current-modern behavior. Do not change the tests intentionally covering SDK 32 or 33 boundaries.

Example:

```java
NotificationCapabilities state = NotificationCapabilities.evaluate(37, true, false, ENABLED, ENABLED);
```

and:

```java
Object optimized = evaluate.invoke(null, 37, false);
```

- [ ] **Step 3: Run the Android unit suite**

Run:

```bash
cd android-twa
./gradlew --no-daemon :app:testDebugUnitTest :app:testReleaseUnitTest --stacktrace
```

Expected: PASS.

- [ ] **Step 4: Commit the guardrails**

```bash
git add \
  android-twa/app/src/test/java/de/donaumoschee/app/Android17BehaviorSourceContractTest.java \
  android-twa/app/src/test/java/de/donaumoschee/app/prayer/NotificationCapabilitiesTest.java
git commit -m "test(android): lock Android 17 delivery and privacy invariants"
```

---

### Task 3: Add installed-runtime API-37 checks and require them in the instrumentation suite

**Files:**
- Create: `android-twa/app/src/androidTest/java/de/donaumoschee/app/Android17PlatformInstrumentationTest.java`
- Modify: `android-twa/app/src/test/java/de/donaumoschee/app/AndroidInstrumentationSuiteSourceContractTest.java`

**Interfaces:**
- Consumes: Android installed `ApplicationInfo`, `PackageInfo`, `ServiceInfo`, and production manifest merge result.
- Produces: runtime proof that the installed debug candidate targets API 37, still declares min API 23, keeps the Adhan service private, and declares the media-playback FGS type.

- [ ] **Step 1: Add the new test to the required instrumentation list first**

Add this path to `requiredTests` in `AndroidInstrumentationSuiteSourceContractTest.java`:

```java
"android-twa/app/src/androidTest/java/de/donaumoschee/app/Android17PlatformInstrumentationTest.java"
```

- [ ] **Step 2: Run the source contract and confirm RED because the file does not exist yet**

Run:

```bash
cd android-twa
./gradlew --no-daemon :app:testDebugUnitTest --tests de.donaumoschee.app.AndroidInstrumentationSuiteSourceContractTest --stacktrace
```

Expected: FAIL with `Missing instrumentation test` for `Android17PlatformInstrumentationTest.java`.

- [ ] **Step 3: Create the instrumentation test**

Create the file with these tests:

```java
package de.donaumoschee.app;

import android.app.Service;
import android.content.ComponentName;
import android.content.Context;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.content.pm.ServiceInfo;
import android.os.Build;

import androidx.test.core.app.ApplicationProvider;
import androidx.test.ext.junit.runners.AndroidJUnit4;

import de.donaumoschee.app.adhan.AdhanPlaybackService;

import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;

import java.util.Arrays;
import java.util.List;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

@RunWith(AndroidJUnit4.class)
public final class Android17PlatformInstrumentationTest {
    private Context context;
    private PackageManager packageManager;

    @Before
    public void setUp() {
        context = ApplicationProvider.getApplicationContext();
        packageManager = context.getPackageManager();
    }

    @Test
    public void installedCandidateTargets37AndRetainsMin23() throws Exception {
        ApplicationInfo info = packageManager.getApplicationInfo(context.getPackageName(), 0);
        assertEquals(37, info.targetSdkVersion);
        if (Build.VERSION.SDK_INT >= 24) assertEquals(23, info.minSdkVersion);
    }

    @Test
    public void installedManifestKeepsLeastPrivilege() throws Exception {
        PackageInfo info = packageManager.getPackageInfo(
                context.getPackageName(), PackageManager.GET_PERMISSIONS);
        List<String> permissions = info.requestedPermissions == null
                ? List.of() : Arrays.asList(info.requestedPermissions);
        assertTrue(permissions.contains("android.permission.SCHEDULE_EXACT_ALARM"));
        assertTrue(permissions.contains("android.permission.POST_NOTIFICATIONS"));
        assertTrue(permissions.contains("android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK"));
        assertFalse(permissions.contains("android.permission.ACCESS_LOCAL_NETWORK"));
        assertFalse(permissions.contains("android.permission.READ_SMS"));
        assertFalse(permissions.contains("android.permission.MANAGE_EXTERNAL_STORAGE"));
    }

    @Test
    public void adhanServiceIsPrivateMediaPlaybackForegroundService() throws Exception {
        ServiceInfo service = packageManager.getServiceInfo(
                new ComponentName(context, AdhanPlaybackService.class), 0);
        assertFalse(service.exported);
        if (Build.VERSION.SDK_INT >= 28) {
            assertTrue((service.foregroundServiceType
                    & ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK) != 0);
        }
    }
}
```

Remove the unused `android.app.Service` import if the compiler flags it.

- [ ] **Step 4: Build instrumentation and re-run source contract**

Run:

```bash
cd android-twa
./gradlew --no-daemon \
  :app:testDebugUnitTest \
  :app:assembleDebug :app:assembleDebugAndroidTest \
  --stacktrace
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add \
  android-twa/app/src/androidTest/java/de/donaumoschee/app/Android17PlatformInstrumentationTest.java \
  android-twa/app/src/test/java/de/donaumoschee/app/AndroidInstrumentationSuiteSourceContractTest.java
git commit -m "test(android): add API 37 installed-runtime checks"
```

---

### Task 4: Move Android CI to mandatory API 23 and API 37 boundaries

**Files:**
- Modify: `lib/__tests__/android-ci-coverage-contract.test.ts`
- Modify: `lib/__tests__/android-twa-contract.test.ts`
- Modify: `.github/workflows/android-twa.yml`

**Interfaces:**
- Consumes: API-37 toolchain and instrumentation files from Tasks 1–3.
- Produces: PR/main Android workflow that builds against API 37 and runs connected instrumentation on both the minimum supported Android 6 boundary and Android 17.

- [ ] **Step 1: Make CI contract tests require API 37 + API 23**

Replace the old single-emulator assertions in `android-ci-coverage-contract.test.ts` with assertions equivalent to:

```ts
expect(source).toContain("api_level: 23");
expect(source).toContain("api_level: 37");
expect(source).toContain("reactivecircus/android-emulator-runner@v2");
expect(source).toContain("api-level: ${{ matrix.api_level }}");
expect(source).toContain("./gradlew --no-daemon :app:connectedDebugAndroidTest --stacktrace");
```

In `android-twa-contract.test.ts`, change the Android workflow SDK assertion to:

```ts
expect(workflow).toContain('sdkmanager "platforms;android-37" "build-tools;36.0.0"');
```

- [ ] **Step 2: Run the two focused Vitest files and confirm RED**

```bash
npm test -- \
  lib/__tests__/android-ci-coverage-contract.test.ts \
  lib/__tests__/android-twa-contract.test.ts
```

Expected: FAIL because the workflow still installs platform 36 and runs only API 35 instrumentation.

- [ ] **Step 3: Update Android SDK installation and signing target verification**

In `.github/workflows/android-twa.yml`:

```yaml
- name: Install Android API 37
  run: sdkmanager "platforms;android-37" "build-tools;36.0.0"
```

In the isolated signing job, change:

```bash
test "$target_sdk" = "37"
```

Also read/validate the other boundaries from `source-metadata.json`:

```bash
compile_sdk="$(jq -r '.android.compileSdkVersion' source-metadata.json)"
min_sdk="$(jq -r '.android.minSdkVersion' source-metadata.json)"
test "$compile_sdk" = "37"
test "$target_sdk" = "37"
test "$min_sdk" = "23"
```

Keep signing tools on `build-tools;36.0.0`.

- [ ] **Step 4: Replace the API-35-only instrumentation job with a two-boundary matrix**

Use this job shape:

```yaml
instrumentation:
  name: Run Android instrumentation tests (API ${{ matrix.api_level }})
  if: github.event_name != 'workflow_dispatch' || inputs.confirmation != 'SIGN_ANDROID_RC'
  needs: verify
  runs-on: ubuntu-latest
  timeout-minutes: 35
  strategy:
    fail-fast: false
    matrix:
      include:
        - api_level: 23
          target: default
          arch: x86
        - api_level: 37
          target: google_apis
          arch: x86_64
  steps:
    - uses: actions/checkout@v4
      with:
        ref: ${{ github.event.pull_request.head.sha || github.sha }}
    - name: Set up JDK 17
      uses: actions/setup-java@v4
      with:
        distribution: temurin
        java-version: "17"
    - name: Enable KVM group permissions
      shell: bash
      run: |
        echo 'KERNEL=="kvm", GROUP="kvm", MODE="0666", OPTIONS+="static_node=kvm"' | sudo tee /etc/udev/rules.d/99-kvm4all.rules
        sudo udevadm control --reload-rules
        sudo udevadm trigger --name-match=kvm || true
    - name: Run instrumentation tests
      uses: reactivecircus/android-emulator-runner@v2
      with:
        api-level: ${{ matrix.api_level }}
        target: ${{ matrix.target }}
        arch: ${{ matrix.arch }}
        profile: pixel_7_pro
        emulator-boot-timeout: 600
        disable-linux-hw-accel: auto
        working-directory: android-twa
        script: ./gradlew --no-daemon :app:connectedDebugAndroidTest --stacktrace
```

Do not use `force-stop` as a reliability test; Android intentionally suppresses alarms after Force Stop.

- [ ] **Step 5: Keep Android 17 audio hardening in normal production mode for the passing suite**

Do **not** add `set-enable-hardening throw` as a success requirement. Google documents `throw` as a diagnostic mode that also disables the exact-alarm + `USAGE_ALARM` exemption. The physical-device failure diagnostic is defined in Task 9.

- [ ] **Step 6: Run local contract/build checks**

```bash
npm test -- \
  lib/__tests__/android-ci-coverage-contract.test.ts \
  lib/__tests__/android-twa-contract.test.ts
cd android-twa
./gradlew --no-daemon :app:testDebugUnitTest :app:assembleDebugAndroidTest --stacktrace
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add \
  lib/__tests__/android-ci-coverage-contract.test.ts \
  lib/__tests__/android-twa-contract.test.ts \
  .github/workflows/android-twa.yml
git commit -m "ci(android): verify API 23 and API 37"
```

---

### Task 5: Refuse stale APK releases instead of silently serving the previous Android version

**Files:**
- Modify: `lib/android-release.ts`
- Modify: `lib/android-release-server.ts`
- Modify: `lib/__tests__/android-download-regression.test.ts`

**Interfaces:**
- Produces: `matchesExpectedAndroidRelease(release, expected)` pure helper.
- Server contract: deployed source only exposes a GitHub release whose `versionCode` and `versionName` exactly match the deployed `android-twa/twa-manifest.json`; if that release is not published/visible yet, return `null` so the API/download route produces 503 rather than code5 after source has moved to code6.

- [ ] **Step 1: Write the failing pure release-identity test**

Import the new helper in `android-download-regression.test.ts`:

```ts
import { matchesExpectedAndroidRelease, type AndroidRelease } from "@/lib/android-release";
```

Add:

```ts
it("refuses a previous public release when deployed source expects a newer identity", () => {
  const release = {
    packageId: "de.donaumoschee.app",
    versionCode: 5,
    versionName: "1.0.2",
    minimumSupportedVersionCode: 3,
    publishedAt: "2026-08-25T03:52:22Z",
    apkAsset: "danube-mosque.apk",
    apkSha256: "a".repeat(64),
    certificateSha256: "E9:98:4B:DB:36:FF:2F:8F:A5:58:29:5C:5C:06:6F:BA:ED:3A:BD:BD:CC:80:1C:83:5D:AE:1B:DD:4C:D7:0E:92",
    tagName: "android-v1.0.2",
    downloadUrl: "https://github.com/example/release.apk",
  } satisfies AndroidRelease;

  expect(matchesExpectedAndroidRelease(release, { versionCode: 6, versionName: "1.0.3" })).toBe(false);
  expect(matchesExpectedAndroidRelease(release, { versionCode: 5, versionName: "1.0.2" })).toBe(true);
  expect(matchesExpectedAndroidRelease(null, { versionCode: 6, versionName: "1.0.3" })).toBe(false);
});
```

Also add a source assertion that `lib/android-release-server.ts` imports `android-twa/twa-manifest.json` and uses `matchesExpectedAndroidRelease`.

- [ ] **Step 2: Run focused test and confirm RED**

```bash
npm test -- lib/__tests__/android-download-regression.test.ts
```

Expected: FAIL because `matchesExpectedAndroidRelease` does not exist.

- [ ] **Step 3: Implement the pure helper**

Add to `lib/android-release.ts` after `AndroidRelease`:

```ts
export type AndroidReleaseIdentity = Pick<AndroidReleaseMetadata, "versionCode" | "versionName">;

export function matchesExpectedAndroidRelease(
  release: AndroidRelease | null,
  expected: AndroidReleaseIdentity,
): release is AndroidRelease {
  return release !== null
    && release.versionCode === expected.versionCode
    && release.versionName === expected.versionName;
}
```

- [ ] **Step 4: Pin the server resolver to the deployed manifest identity**

In `lib/android-release-server.ts`, add:

```ts
import twaManifest from "@/android-twa/twa-manifest.json";
```

Import `matchesExpectedAndroidRelease`, then replace the final return with:

```ts
const selected = selectLatestAndroidRelease(releases, metadataByTag);
return matchesExpectedAndroidRelease(selected, {
  versionCode: twaManifest.versionCode,
  versionName: twaManifest.versionName,
}) ? selected : null;
```

Keep the existing five-minute GitHub fetch revalidation. The important change is that a cached list missing the new release now yields temporary 503 instead of redirecting users to the previous APK.

- [ ] **Step 5: Run download/release unit tests**

```bash
npm test -- \
  lib/__tests__/android-download-regression.test.ts \
  lib/__tests__/android-update-system.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add \
  lib/android-release.ts \
  lib/android-release-server.ts \
  lib/__tests__/android-download-regression.test.ts
git commit -m "fix(android): refuse stale public APK releases"
```

---

### Task 6: Upgrade production/signing/live-download workflows to API 37 and make live smoke post-publication aware

**Files:**
- Modify: `lib/__tests__/android-live-apk-cert-contract.test.ts`
- Modify: `lib/__tests__/android-production-release-workflow.test.ts`
- Modify: `lib/__tests__/android-download-regression.test.ts`
- Modify: `.github/workflows/android-production-release.yml`
- Modify: `.github/workflows/android-download-smoke.yml`

**Interfaces:**
- Consumes: manifest target 37, stale-release refusal.
- Produces: production build/sign verification on API 37; live smoke runs after Android release publication rather than failing simply because main was bumped before the tag exists.

- [ ] **Step 1: Change workflow contract tests first**

In `android-live-apk-cert-contract.test.ts` require:

```ts
expect(source).toContain('sdkmanager "platforms;android-37" "build-tools;36.0.0"');
```

In `android-production-release-workflow.test.ts` add:

```ts
expect(workflow).toContain('sdkmanager "platforms;android-37" "build-tools;36.0.0"');
expect(workflow).toContain('test "$target_sdk" = "37"');
expect(workflow).toContain('test "$compile_sdk" = "37"');
expect(workflow).toContain('test "$min_sdk" = "23"');
```

In `android-download-regression.test.ts` require the live smoke workflow to contain:

```ts
expect(smoke).toContain("release:");
expect(smoke).toContain("types: [published]");
expect(smoke).toContain("workflow_dispatch:");
```

- [ ] **Step 2: Run focused tests and confirm RED**

```bash
npm test -- \
  lib/__tests__/android-live-apk-cert-contract.test.ts \
  lib/__tests__/android-production-release-workflow.test.ts \
  lib/__tests__/android-download-regression.test.ts
```

Expected: FAIL on platform 36 / absent release trigger / absent explicit API boundaries.

- [ ] **Step 3: Harden the production workflow boundaries**

In `.github/workflows/android-production-release.yml`, derive these fields:

```bash
compile_sdk="$(jq -r ".compileSdkVersion" android-twa/twa-manifest.json)"
target_sdk="$(jq -r ".targetSdkVersion" android-twa/twa-manifest.json)"
min_sdk="$(jq -r ".minSdkVersion" android-twa/twa-manifest.json)"
test "$compile_sdk" = "37"
test "$target_sdk" = "37"
test "$min_sdk" = "23"
```

Install:

```yaml
- name: Install verification tools
  run: sdkmanager "platforms;android-37" "build-tools;36.0.0"
```

Keep all `apksigner`, `aapt`, and `zipalign` paths on `$ANDROID_HOME/build-tools/36.0.0`.

In artifact verification, add minimum SDK proof:

```bash
printf '%s\n' "$badging" | grep -F "sdkVersion:'23'"
printf '%s\n' "$badging" | grep -F "targetSdkVersion:'$TARGET_SDK'"
```

- [ ] **Step 4: Move live smoke to API 37 and add release publication trigger**

Set the workflow trigger to include:

```yaml
on:
  release:
    types: [published]
  workflow_dispatch:
  push:
    branches:
      - main
    paths:
      - ".github/workflows/android-download-smoke.yml"
      - "app/download/android/**"
      - "app/api/android/release/**"
      - "lib/android-release.ts"
      - "lib/android-release-server.ts"
      - ".github/workflows/android-production-release.yml"
```

Remove `android-twa/twa-manifest.json` from the **push** path list so a version bump does not create a guaranteed pre-publication failure. The `release: published` event becomes the production-version smoke trigger.

Guard the job so unrelated GitHub releases do not run Android verification:

```yaml
if: github.event_name != 'release' || startsWith(github.event.release.tag_name, 'android-v')
```

Install:

```yaml
run: sdkmanager "platforms;android-37" "build-tools;36.0.0"
```

Change:

```bash
test "$target_sdk" = "37"
```

and add:

```bash
min_sdk="$(jq -r '.minSdkVersion' android-twa/twa-manifest.json)"
test "$min_sdk" = "23"
...
printf '%s\n' "$badging" | grep -F "sdkVersion:'$min_sdk'"
```

- [ ] **Step 5: Run focused and full web tests**

```bash
npm test -- \
  lib/__tests__/android-live-apk-cert-contract.test.ts \
  lib/__tests__/android-production-release-workflow.test.ts \
  lib/__tests__/android-download-regression.test.ts \
  lib/__tests__/android-twa-contract.test.ts
npm test
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add \
  lib/__tests__/android-live-apk-cert-contract.test.ts \
  lib/__tests__/android-production-release-workflow.test.ts \
  lib/__tests__/android-download-regression.test.ts \
  .github/workflows/android-production-release.yml \
  .github/workflows/android-download-smoke.yml
git commit -m "ci(android): harden API 37 production verification"
```

---

### Task 7: Finalize the exact `1.0.3 / code 6 / target 37` release-candidate identity

**Files:**
- Modify: `android-twa/twa-manifest.json`
- Modify: `lib/__tests__/android-twa-contract.test.ts`
- Modify: `lib/__tests__/android-update-system.test.ts`

**Interfaces:**
- Produces: the exact identity that will be signed for S25 P0 testing and later published unchanged.

- [ ] **Step 1: Change release tests to code6/1.0.3 first**

In `android-twa-contract.test.ts`:

```ts
expect(config.versionCode).toBe(6);
expect(config.versionName).toBe("1.0.3");
```

Update the later production identity assertions in the same file to `6` / `1.0.3`.

In `android-update-system.test.ts`, rename the final test description to describe the release after public `1.0.2/code5`, then assert:

```ts
expect(manifest.versionCode).toBe(6);
expect(manifest.versionName).toBe("1.0.3");
expect(manifest.minimumSupportedVersionCode).toBe(3);
```

- [ ] **Step 2: Run focused tests and confirm RED**

```bash
npm test -- \
  lib/__tests__/android-twa-contract.test.ts \
  lib/__tests__/android-update-system.test.ts
```

Expected: FAIL because manifest is still `1.0.2/code5`.

- [ ] **Step 3: Bump only immutable release metadata**

Set in `android-twa/twa-manifest.json`:

```json
"compileSdkVersion": 37,
"targetSdkVersion": 37,
"minSdkVersion": 23,
"versionCode": 6,
"versionName": "1.0.3",
"minimumSupportedVersionCode": 3
```

- [ ] **Step 4: Search for stale hard-coded release assertions**

Run:

```bash
rg -n '1\.0\.2|versionCode[^\n]*5|toBe\(5\)' \
  android-twa lib .github/workflows \
  --glob '!**/build/**'
```

Expected: only historical/legacy data intentionally describing prior releases may remain. Any contract that claims the **current** release is `1.0.2/code5` must be updated in this task.

- [ ] **Step 5: Verify exact release identity locally**

```bash
npm test -- \
  lib/__tests__/android-twa-contract.test.ts \
  lib/__tests__/android-update-system.test.ts
cd android-twa
./gradlew --no-daemon :app:testReleaseUnitTest :app:lintRelease :app:assembleRelease :app:bundleRelease --stacktrace
$ANDROID_HOME/build-tools/36.0.0/aapt dump badging app/build/outputs/apk/release/app-release-unsigned.apk \
  | grep -E "package:|sdkVersion:|targetSdkVersion:"
```

Expected: `de.donaumoschee.app`, `versionCode='6'`, `versionName='1.0.3'`, `sdkVersion:'23'`, `targetSdkVersion:'37'`.

- [ ] **Step 6: Commit**

```bash
git add \
  android-twa/twa-manifest.json \
  lib/__tests__/android-twa-contract.test.ts \
  lib/__tests__/android-update-system.test.ts
git commit -m "release(android): prepare 1.0.3 code 6"
```

---

### Task 8: Run full exact-head verification and obtain green PR CI before signing

**Files:** no planned source changes; fix only demonstrated regressions before continuing.

**Interfaces:**
- Consumes: Tasks 1–7 exact head.
- Produces: one PR head SHA with green web CI, green Android build/lint/unit checks, and green API-23 + API-37 instrumentation.

- [ ] **Step 1: Run full local web verification**

```bash
npm ci
npm run lint
npm test
npm run build
```

Expected: all PASS.

- [ ] **Step 2: Run full local Android verification**

```bash
cd android-twa
./gradlew --no-daemon \
  :app:testDebugUnitTest :app:lintDebug :app:assembleDebug :app:assembleDebugAndroidTest \
  :app:testReleaseUnitTest :app:lintRelease :app:assembleRelease :app:bundleRelease \
  --stacktrace
```

Expected: PASS.

- [ ] **Step 3: Inspect final unsigned package permissions and identity**

```bash
APK=android-twa/app/build/outputs/apk/release/app-release-unsigned.apk
$ANDROID_HOME/build-tools/36.0.0/aapt dump badging "$APK" | grep -E "package:|sdkVersion:|targetSdkVersion:"
$ANDROID_HOME/build-tools/36.0.0/aapt dump permissions "$APK"
```

Expected identity: package `de.donaumoschee.app`, code `6`, name `1.0.3`, min `23`, target `37`.

Expected permissions include the approved native/TWA set and do **not** include `ACCESS_LOCAL_NETWORK`, SMS, contacts, call-log, accessibility-service, or broad-storage permissions.

- [ ] **Step 4: Push implementation branch and open/update the PR**

Execution branch name:

```bash
android/android-17-play-protect-hardening
```

PR title:

```text
Harden Android 17 privacy, delivery, and Play Protect compatibility
```

PR body must state the three release blockers explicitly: P0-A Adhan background delivery, P0-B native reminders, P0-C no old-target/privacy warning.

- [ ] **Step 5: Wait for exact PR-head checks**

Derive the source SHA locally:

```bash
SOURCE_SHA="$(git rev-parse HEAD)"
echo "$SOURCE_SHA"
```

Required remote outcomes on that exact SHA:

```text
CI: success
Android TWA / Verify Android project and build unsigned candidate: success
Android TWA / Run Android instrumentation tests (API 23): success
Android TWA / Run Android instrumentation tests (API 37): success
```

Do not sign a candidate from a different SHA.

---

### Task 9: Produce the exact-head production-signed RC and run the physical S25 P0 gate

**Files:**
- Create: `docs/superpowers/qa/2026-08-25-android-17-p0-device-acceptance.md`

**Interfaces:**
- Consumes: successful PR Android TWA run from Task 8.
- Produces: production-certificate-signed APK/AAB for exact SHA and documented P0-A/P0-B/P0-C result before merge.

- [ ] **Step 1: Create the device acceptance checklist document**

Write `docs/superpowers/qa/2026-08-25-android-17-p0-device-acceptance.md` with these immutable acceptance rules:

```markdown
# Android 17 P0 Device Acceptance

Build required: de.donaumoschee.app / 1.0.3 / code 6 / target 37 / min 23
Signing certificate: E9:98:4B:DB:36:FF:2F:8F:A5:58:29:5C:5C:06:6F:BA:ED:3A:BD:BD:CC:80:1C:83:5D:AE:1B:DD:4C:D7:0E:92

P0-A passes only if native Adhan plays through the production path while the app is backgrounded/locked and in the supported idle path, and schedule recovery is verified after reboot.
P0-B passes only if native prayer reminders arrive through the production path under the same supported background conditions and after reboot.
P0-C passes only if a clean install does not show the Play Protect warning saying the app was built for an older Android version / does not include the latest privacy protections.
Force Stop, powered-off device, revoked exact-alarm access, and revoked notification permission are explicitly outside the delivery guarantee.
```

Commit the checklist before signing:

```bash
git add docs/superpowers/qa/2026-08-25-android-17-p0-device-acceptance.md
git commit -m "docs(android): add Android 17 P0 device gate"
```

Because this changes the PR head, wait for the Android TWA workflow again and use the **new** exact head/run for signing.

- [ ] **Step 2: Derive the successful PR run and exact SHA**

With GitHub CLI:

```bash
SOURCE_SHA="$(git rev-parse HEAD)"
BRANCH="$(git branch --show-current)"
RUN_ID="$(gh run list \
  --workflow 'Android TWA' \
  --branch "$BRANCH" \
  --event pull_request \
  --status success \
  --limit 20 \
  --json databaseId,headSha \
  --jq '.[] | select(.headSha == "'"$SOURCE_SHA"'") | .databaseId' \
  | head -n 1)"
test -n "$RUN_ID"
printf 'SOURCE_SHA=%s\nRUN_ID=%s\n' "$SOURCE_SHA" "$RUN_ID"
```

- [ ] **Step 3: Trigger protected isolated signing on the branch workflow**

```bash
gh workflow run android-twa.yml \
  --ref "$BRANCH" \
  -f run_id="$RUN_ID" \
  -f source_sha="$SOURCE_SHA" \
  -f confirmation=SIGN_ANDROID_RC
```

Wait for `Sign approved exact-head release candidate in isolation` to succeed.

- [ ] **Step 4: Download and independently verify the signed RC**

After the signing run completes:

```bash
SIGN_RUN_ID="$(gh run list \
  --workflow 'Android TWA' \
  --branch "$BRANCH" \
  --event workflow_dispatch \
  --status success \
  --limit 10 \
  --json databaseId,headSha \
  --jq '.[0].databaseId')"
rm -rf /tmp/danube-android17-rc
gh run download "$SIGN_RUN_ID" \
  -n "danube-mosque-android-rc-$SOURCE_SHA" \
  -D /tmp/danube-android17-rc
sha256sum --check /tmp/danube-android17-rc/SHA256SUMS.txt
$ANDROID_HOME/build-tools/36.0.0/apksigner verify --verbose --print-certs \
  /tmp/danube-android17-rc/danube-mosque.apk
$ANDROID_HOME/build-tools/36.0.0/aapt dump badging \
  /tmp/danube-android17-rc/danube-mosque.apk \
  | grep -E "package:|sdkVersion:|targetSdkVersion:"
```

Expected: package `de.donaumoschee.app`, code6, 1.0.3, min23, target37, permanent certificate fingerprint exactly matching the global constraint.

- [ ] **Step 5: P0-C clean-install Play Protect test first**

On the S25:

1. Uninstall any existing Danube Mosque installation.
2. Delete all previous `danube-mosque*.apk` files from Downloads.
3. Transfer/download the exact signed RC APK from Step 4.
4. Open it through the normal package installer.
5. **PASS only if the specific old-Android/latest-privacy-protections warning does not appear.**
6. A separate `Play Protect hasn't seen this app before` reputation message must be recorded separately and must not be mislabeled as the old-target warning.

If ADB is available, verify installed identity:

```bash
adb shell dumpsys package de.donaumoschee.app \
  | grep -E 'versionCode=|versionName=|targetSdk=|minSdk='
```

- [ ] **Step 6: P0-A Adhan background + lock test using the app's production native simulation path**

Inside the installed APK:

1. Ensure notification permission is granted.
2. Ensure exact-alarm access is granted and native readiness shows ready.
3. Ensure the selected Adhan is cached/ready.
4. Settings → `Real prayer simulation` → choose a prayer → `Simulate Adhan now`.
5. Immediately press Home and lock the screen before the 10-second alarm fires.
6. **PASS only if the saved Adhan begins through the native alarm/service path while the UI is not foreground.**

Repeat once with the app backgrounded but screen unlocked.

- [ ] **Step 7: P0-A process-reclaim and Doze checks without Force Stop**

For process reclaim, schedule the 10-second native Adhan test, then while the app is backgrounded run:

```bash
adb shell am kill de.donaumoschee.app
```

Expected: the exact alarm receiver can recreate the native delivery path and Adhan plays. Do **not** use `am force-stop`.

For Doze, schedule another 10-second native Adhan test, background/lock the app, then run:

```bash
adb shell dumpsys deviceidle force-idle
```

After the test:

```bash
adb shell dumpsys deviceidle unforce
```

Expected: exact-alarm delivery remains functional under the supported idle path.

- [ ] **Step 8: P0-B reminder background + lock + Doze test**

Settings → `Real prayer simulation` → `Simulate 15-min reminder`, then immediately background/lock the device before the 10-second test alarm.

PASS only if the native reminder notification appears correctly. Repeat once under forced idle using the same `deviceidle force-idle` / `unforce` commands.

- [ ] **Step 9: Verify reboot repair with a real scheduled prayer/reminder**

Enable a real upcoming prayer reminder/Adhan, verify native schedule readiness, reboot the S25 before that event, and do not manually Force Stop the app after boot.

PASS only when the next configured real prayer event arrives through the repaired native schedule. This is the reboot P0 evidence; the 10-second synthetic test alarm is not used as proof of reboot persistence because boot repair intentionally rebuilds the real schedule, not ephemeral test events.

- [ ] **Step 10: Use Android 17 `throw` mode only if P0-A fails and restore it afterward**

Diagnostic sequence:

```bash
adb shell cmd audio set-enable-hardening throw
adb logcat -c
# Reproduce the failing Adhan path once.
adb logcat -d | grep -E 'AudioHardening|de\.donaumoschee\.app|DanubePrayer'
adb shell cmd audio set-enable-hardening disable
```

Interpretation: `throw` is evidence-gathering only. It intentionally removes the exact-alarm/`USAGE_ALARM` exemption, so the production path is **not** required to pass in this diagnostic mode.

- [ ] **Step 11: Stop at the P0 gate**

If any of P0-A, P0-B, or P0-C fails, do not merge and do not publish. Investigate the concrete failure on the branch. If P0-C fails while the APK is independently verified as target37, capture APK SHA-256, device Android version/API, Play Protect version/state, screenshot, and exact wording for classification appeal rather than changing permissions/target randomly.

---

### Task 10: Merge only the P0-approved exact head, verify main, publish `android-v1.0.3`, and prove the website serves that exact APK

**Files:** no planned code changes after P0 approval.

**Interfaces:**
- Consumes: exact P0-approved PR head and green CI.
- Produces: immutable public release `android-v1.0.3` and green live-download verification.

- [ ] **Step 1: Reconfirm the PR head has not changed since P0**

```bash
P0_SHA="$(git rev-parse HEAD)"
gh pr view --json headRefOid --jq '.headRefOid' | grep -qx "$P0_SHA"
```

Expected: exact match.

- [ ] **Step 2: Squash merge only after all P0 evidence is accepted**

Use the repository's reviewed merge flow. Do not merge a newer untested head.

- [ ] **Step 3: Verify exact main release identity and workflows**

After merge:

```bash
git fetch origin main
MAIN_SHA="$(git rev-parse origin/main)"
git show "origin/main:android-twa/twa-manifest.json" \
  | jq -e '.versionCode == 6 and .versionName == "1.0.3" and .minSdkVersion == 23 and .compileSdkVersion == 37 and .targetSdkVersion == 37'
printf '%s\n' "$MAIN_SHA"
```

Wait for both main workflows to succeed on `MAIN_SHA`:

```text
CI
Android TWA (including API 23 and API 37 instrumentation)
```

- [ ] **Step 4: Derive the successful main Android TWA run**

```bash
MAIN_RUN_ID="$(gh run list \
  --workflow 'Android TWA' \
  --branch main \
  --event push \
  --status success \
  --limit 20 \
  --json databaseId,headSha \
  --jq '.[] | select(.headSha == "'"$MAIN_SHA"'") | .databaseId' \
  | head -n 1)"
test -n "$MAIN_RUN_ID"
```

- [ ] **Step 5: Trigger the protected production release**

```bash
gh workflow run android-production-release.yml \
  --ref main \
  -f run_id="$MAIN_RUN_ID" \
  -f tag=android-v1.0.3 \
  -f confirmation=PUBLISH_ANDROID_PRODUCTION
```

Wait for `Verify and publish approved Android production artifacts` to succeed.

- [ ] **Step 6: Verify public release assets and immutable identity**

```bash
gh release view android-v1.0.3 --json tagName,isDraft,isPrerelease,targetCommitish,assets
rm -rf /tmp/android-v1.0.3 && mkdir -p /tmp/android-v1.0.3
gh release download android-v1.0.3 \
  --pattern 'danube-mosque.apk' \
  --pattern 'android-release.json' \
  --pattern 'SHA256SUMS.txt' \
  --dir /tmp/android-v1.0.3
jq -e '.packageId == "de.donaumoschee.app" and .versionCode == 6 and .versionName == "1.0.3"' \
  /tmp/android-v1.0.3/android-release.json
```

Then verify APK signature/badging exactly as in Task 9 Step 4.

- [ ] **Step 7: Confirm the release-triggered live smoke succeeds**

The `Android public download smoke` workflow should start from the `release: published` event and eventually pass after the website/server sees `android-v1.0.3`.

Required checks already performed by that workflow: website route, release metadata, APK SHA-256, signature certificate, package, version, min SDK, target SDK, and non-debug identity.

- [ ] **Step 8: Perform the final fresh website-path S25 install**

On S25:

1. Uninstall the RC/final app.
2. Delete the previous local APK.
3. Open the Danube Mosque website.
4. Press the Android download button.
5. Install the freshly downloaded APK.
6. Confirm the old-Android/latest-privacy-protections warning does not appear.
7. Confirm installed identity is `1.0.3/code6/target37`.
8. Run one final native Adhan simulation and one native reminder simulation with the app backgrounded/locked.

This final step proves the **actual website path**, not only the pre-publication signed RC.

- [ ] **Step 9: If a severe post-release defect appears, advance the version instead of downgrading**

Do not overwrite `android-v1.0.3` and do not attempt code5 downgrade. The next corrective release is at least `1.0.4 / versionCode 7` with the same permanent certificate.

---

### Task 11: Track Android Developer Verification separately without blocking `1.0.3`

**Files:** no product code changes.

**Interfaces:**
- Produces: one follow-up GitHub issue for direct-distribution readiness before the broader 2027 verification rollout.

- [ ] **Step 1: Create the follow-up issue only after `1.0.3` is healthy**

Issue title:

```text
Prepare Android Developer Verification for direct APK distribution
```

Issue body:

```markdown
Track Android Developer Verification readiness for Danube Mosque direct website distribution.

Requirements:
- preserve package `de.donaumoschee.app`;
- preserve the current permanent production signing certificate;
- register the package/signing identity through Google's developer verification flow before broader 2027 enforcement;
- keep direct website APK distribution as the primary path;
- do not migrate to Google Play unless separately approved.

This is intentionally separate from the Android 17 / Play Protect `1.0.3` hardening release.
```

Do not implement verification enrollment as part of this plan.

---

## Final Verification Checklist

Before claiming the implementation complete, every item below must be evidenced:

```text
[ ] minSdkVersion = 23
[ ] compileSdkVersion = 37
[ ] targetSdkVersion = 37
[ ] versionName = 1.0.3
[ ] versionCode = 6
[ ] AGP = 9.1.1
[ ] Gradle = 9.3.1
[ ] JDK = 17
[ ] API-23 instrumentation green
[ ] API-37 instrumentation green
[ ] web lint/tests/build green
[ ] Android unit/lint/debug/release APK/AAB green
[ ] no forbidden new permissions
[ ] exact-alarm + USAGE_ALARM + mediaPlayback FGS architecture preserved
[ ] permanent production certificate unchanged
[ ] exact-head signed RC verified
[ ] P0-A native Adhan background/locked/idle/reboot pass
[ ] P0-B native reminder background/locked/idle/reboot pass
[ ] P0-C old-Android/latest-privacy warning absent
[ ] merge SHA green on CI + Android TWA
[ ] public android-v1.0.3 release created from exact main SHA
[ ] release APK signature/package/code/name/min/target/SHA metadata verified
[ ] release-triggered live website download smoke green
[ ] final fresh website-path S25 install has no old-target warning
[ ] final website-path Adhan/reminder background smoke pass
```

## Primary Official References

- Android 17 SDK setup / API 37 toolchain: `https://developer.android.com/about/versions/17/setup-sdk`
- AGP API-level compatibility: `https://developer.android.com/build/releases/about-agp`
- AGP 9.1.1 compatibility (Gradle 9.3.1, Build Tools 36.0.0, JDK 17): `https://developer.android.com/build/releases/agp-9-1-0-release-notes`
- Android 17 behavior changes: `https://developer.android.com/about/versions/17/behavior-changes-17`
- Android 17 background audio hardening and `enable|disable|throw` semantics: `https://developer.android.com/about/versions/17/changes/bg-audio`
- Foreground-service background start restrictions: `https://developer.android.com/develop/background-work/services/fgs/restrictions-bg-start`
- Play Protect warning guidance: `https://developers.google.com/android/play-protect/warning-dev-guidance`
- Exact alarm API: `https://developer.android.com/reference/android/app/AlarmManager`
- Android Developer Verification FAQ: `https://developer.android.com/developer-verification/guides/faq`
