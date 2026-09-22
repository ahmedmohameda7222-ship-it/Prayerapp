import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8").replace(/\r\n/g, "\n");
}

describe("Home live prayer runtime refresh", () => {
  it("refreshes the shared Iqama delays together with the live prayer schedule", () => {
    const actionPath = join(process.cwd(), "app/home-prayer-runtime.ts");
    expect(existsSync(actionPath)).toBe(true);

    const client = source("components/home/HomePageClient.tsx");
    expect(client).toContain('import { refreshHomePrayerRuntime } from "@/app/home-prayer-runtime";');
    expect(client).toContain("const [liveIqamaDelays, setLiveIqamaDelays]");
    expect(client).toContain("const [liveTimezone, setLiveTimezone]");
    expect(client).toContain("await refreshHomePrayerRuntime(");
    expect(client).toContain("setLiveIqamaDelays(latest.iqamaDelays);");
    expect(client).toContain("setLiveTimezone(latest.timezone);");
    expect(client).toContain("derivePrayerIqamaTimes(item, liveIqamaDelays, liveTimezone)");

    const action = source("app/home-prayer-runtime.ts");
    expect(action).toContain('"use server";');
    expect(action).toContain("getRuntimePrayerSettings()");
    expect(action).toContain("getPrayerTimes(false, startDate, endDate)");
    expect(action).toContain("todayIso(new Date(), prayerSettings.timezone)");
    expect(action).toContain("iqamaDelays: prayerSettings.iqamaDelays");
    expect(action).toContain("timezone: prayerSettings.timezone");
    expect(action).not.toContain("fajrAngle");
    expect(action).not.toContain("latitude");
    expect(action).not.toContain("longitude");
  });
});
