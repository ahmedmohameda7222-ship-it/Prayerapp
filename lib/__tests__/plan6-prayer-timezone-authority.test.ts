import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("Plan 6 prayer timezone authority", () => {
  it("does not leave active root prayer helpers on the global Berlin default", () => {
    for (const path of [
      "lib/prayer-utils.ts",
      "lib/home-utils.ts",
      "lib/friday.ts",
    ]) {
      expect(source(path)).not.toContain("APP_TIME_ZONE");
    }
  });

  it("threads persisted timezone through homepage and /times prayer runtime", () => {
    const home = source("app/page.tsx");
    const client = source("components/home/HomePageClient.tsx");
    const countdown = source("components/prayer/PrayerCountdown.tsx");
    const timesPage = source("app/times/page.tsx");
    const browser = source("components/prayer/PrayerTimesBrowser.tsx");

    expect(home).toContain("prayerSettings?.timezone");
    expect(client).toContain("liveTimezone");
    expect(client).toContain("todayIso(now, liveTimezone)");
    expect(countdown).toContain("timezone");
    expect(countdown).toContain("getNextPrayerFromSchedule(schedule, now, timezone)");
    expect(timesPage).toContain("timezone={settings?.timezone ?? null}");
    expect(browser).toContain("todayIso(new Date(), timezone)");
  });

  it("exports Android prayer schedule timezone from persisted Prayer Engine settings", () => {
    const route = source("app/api/android/prayer-schedule/route.ts");
    expect(route).toContain('import { getPrayerSettings } from "@/lib/data/prayer-settings";');
    expect(route).toContain("timeZone: prayerSettings.timezone");
    expect(route).not.toContain('timeZone: "Europe/Berlin"');
  });
});
