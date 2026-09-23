import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

function sourceTree(path: string): string {
  const absolute = join(process.cwd(), path);
  return readdirSync(absolute, { withFileTypes: true })
    .flatMap((entry) => {
      const child = join(absolute, entry.name);
      if (entry.isDirectory()) {
        return sourceTree(join(path, entry.name));
      }
      return entry.isFile() && entry.name.endsWith(".java")
        ? [readFileSync(child, "utf8")]
        : [];
    })
    .join("\n");
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

    expect(home).toContain("getRuntimePrayerTimezone");
    expect(home).toContain("timezone={prayerTimezone}");
    expect(client).toContain("liveTimezone");
    expect(client).toContain("todayIso(now, liveTimezone)");
    expect(countdown).toContain("timezone");
    expect(countdown).toContain("getNextPrayerFromSchedule(schedule, now, timezone)");
    expect(timesPage).toContain("getRuntimePrayerTimezone");
    expect(timesPage).toContain("timezone={timezone}");
    expect(browser).toContain("todayIso(new Date(), timezone)");
  });

  it("keeps web and native Android prayer scheduling on the server-provided IANA timezone", () => {
    const provider = source("components/providers/NativeAndroidProvider.tsx");
    const config = source("android-twa/app/src/main/java/de/donaumoschee/app/prayer/NativeConfig.java");
    const planner = source("android-twa/app/src/main/java/de/donaumoschee/app/prayer/AlarmPlanner.java");
    const worker = source("android-twa/app/src/main/java/de/donaumoschee/app/workers/NativeRefreshWorker.java");
    const nativeMain = sourceTree("android-twa/app/src/main/java");

    expect(provider).not.toContain('schedule.timeZone !== "Europe/Berlin"');
    expect(provider).toContain('addDaysIso(todayIso(new Date(), "UTC"), -1)');
    expect(provider).toContain('timeZone: schedule.timeZone');
    expect(provider).toContain('zonedDateTime(addDaysIso(schedule.through, 1), "00:00", schedule.timeZone)');

    expect(config).toContain("public final ZoneId zone;");
    expect(config).toContain('ZoneId.of(object.getString("timeZone"))');
    expect(planner).toContain("config.zone");

    expect(worker).toContain('LocalDate.now(ZoneId.of("UTC")).minusDays(1)');
    expect(worker).toContain('ZoneId zone = ZoneId.of(response.getString("timeZone"))');
    expect(worker).toContain('config.put("timeZone", zone.getId())');

    expect(nativeMain).not.toContain("NativeConfig.ZONE");
    expect(nativeMain).not.toContain('ZoneId.of("Europe/Berlin")');
    expect(nativeMain).not.toContain('"Europe/Berlin".equals');
  });

  it("exports Android prayer schedule timezone from the same atomic snapshot as its rows", () => {
    const route = source("app/api/android/prayer-schedule/route.ts");
    expect(route).toContain("getPublishedPrayerScheduleSnapshot");
    expect(route).toContain("timeZone: snapshot.timezone");
    expect(route).not.toContain("getRuntimePrayerSettings");
    expect(route).not.toContain('timeZone: "Europe/Berlin"');
  });
});
