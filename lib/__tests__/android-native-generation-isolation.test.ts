import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

describe("Android native generation isolation", () => {
  it("tags alarms with account generation and rejects stale alarm deliveries", () => {
    const scheduler = source("android-twa/app/src/main/java/de/donaumoschee/app/prayer/PrayerScheduler.java");
    const receiver = source("android-twa/app/src/main/java/de/donaumoschee/app/prayer/PrayerAlarmReceiver.java");
    expect(scheduler).toContain("EXTRA_ACCOUNT_GENERATION");
    expect(scheduler).toContain("reschedule(Context context, int expectedGeneration)");
    expect(scheduler).toContain("operation(context, event, generation)");
    expect(receiver).toContain("EXTRA_ACCOUNT_GENERATION");
    expect(receiver).toContain("store.accountGeneration() != eventGeneration");
  });

  it("never lets a stale refresh worker globally cancel a newer generation", () => {
    const worker = source("android-twa/app/src/main/java/de/donaumoschee/app/workers/NativeRefreshWorker.java");
    expect(worker).toContain("PrayerScheduler.reschedule(getApplicationContext(), generation)");
    expect(worker).not.toContain("PrayerScheduler.cancelAll(getApplicationContext())");
  });
});
