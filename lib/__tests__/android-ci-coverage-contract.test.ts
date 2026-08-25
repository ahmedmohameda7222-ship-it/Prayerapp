import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const workflow = () => readFileSync(
  join(process.cwd(), ".github/workflows/android-twa.yml"),
  "utf8",
);

const occurrences = (source: string, value: string) => source.split(value).length - 1;

describe("Android CI coverage contract", () => {
  it("triggers Android validation for every shared native-delivery contract surface", () => {
    const source = workflow();
    const requiredPaths = [
      '"app/api/android/**"',
      '"app/api/cron/prayer-reminders/**"',
      '"components/providers/NativeAndroidProvider.tsx"',
      '"components/settings/PrayerSystemTestControls.tsx"',
      '"lib/android/**"',
      '"lib/prayer-reminder-delivery.ts"',
      '"lib/__tests__/android-*.test.ts"',
      '"public/sw.js"',
    ];

    for (const path of requiredPaths) {
      expect(occurrences(source, path), `${path} must be covered for PR and main push`).toBe(2);
    }
  });

  it("runs the Android instrumentation suite on the minimum and Android 17 boundaries", () => {
    const source = workflow();
    const instrumentation = source.slice(
      source.indexOf("  instrumentation:"),
      source.indexOf("  signed_release_candidate:"),
    );

    expect(source).toContain("uses: android-actions/setup-android@v4");
    expect(source).toContain("api_level: 23");
    expect(source).toContain("api_level: 37");
    expect(source).toContain('sdk_api_level: "23"');
    expect(source).toContain('sdk_api_level: "37.0"');
    expect(source).toContain("target: google_apis_ps16k");
    expect(source).toContain("reactivecircus/android-emulator-runner@v2");
    expect(source).not.toContain("reactivecircus/android-emulator-runner@660ac26f5bd4cb6c1d98b2143e66ded57bee724f");
    expect(instrumentation).toContain("- name: Update SDK command-line tools for Android 17");
    expect(instrumentation).toContain("if: matrix.api_level == 37");
    expect(instrumentation).toContain('sdkmanager\" --install \"cmdline-tools;latest\"');
    expect(instrumentation).toContain('if [ -d \"$SDK/cmdline-tools/latest-2\" ]; then');
    expect(instrumentation).toContain('mv \"$SDK/cmdline-tools/latest-2\" \"$SDK/cmdline-tools/latest\"');
    expect(source).toContain("api-level: ${{ matrix.sdk_api_level }}");
    expect(source).toContain("disk-size: 8G");
    expect(instrumentation).toContain("script: ./gradlew --no-daemon :app:connectedDebugAndroidTest --stacktrace");
    expect(instrumentation).not.toContain("script: |");
    expect(instrumentation).not.toContain("script: >-");
    expect(instrumentation).toContain("disable_animations: true");
    expect(instrumentation).toContain("disable_animations: false");
    expect(instrumentation).toContain("disable-animations: ${{ matrix.disable_animations }}");
    expect(source).not.toContain("adb wait-for-device");
  });
});