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

  it("runs the Android instrumentation suite on a managed emulator", () => {
    const source = workflow();

    expect(source).toContain("reactivecircus/android-emulator-runner@v2");
    expect(source).toContain("static_node=kvm");
    expect(source).toContain("api-level: 35");
    expect(source).toContain("target: google_apis");
    expect(source).toContain("arch: x86_64");
    expect(source).toContain("working-directory: android-twa");
    expect(source).toContain("./gradlew --no-daemon :app:connectedDebugAndroidTest --stacktrace");
    expect(source).not.toContain("adb wait-for-device");
  });
});