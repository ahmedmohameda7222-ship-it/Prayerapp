import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { smartAzkarCategory } from "@/lib/azkar-routine";

const source = (path: string) => readFileSync(path, "utf8");

describe("Plan 6 final-review cache and religious-clock regressions", () => {
  it("does not serve the transition-sensitive Android prayer schedule from shared cache", () => {
    const route = source("app/api/android/prayer-schedule/route.ts");

    expect(route).toContain('"Cache-Control": "no-store"');
    expect(route).not.toContain("s-maxage");
  });

  it("selects Azkar categories in the supplied applied runtime timezone", () => {
    const thursdayBerlinFridayTokyo = new Date("2026-09-17T15:30:00.000Z");

    expect(
      smartAzkarCategory(thursdayBerlinFridayTokyo, "Asia/Tokyo"),
    ).toBe("Friday");
  });

  it("threads the applied runtime timezone into the Home religious date header", () => {
    const home = source("app/page.tsx");
    const header = source("components/layout/AppHeader.tsx");

    expect(home).toContain("timezone={prayerTimezone}");
    expect(header).toContain("timezone?: string | null");
    expect(header).toContain("todayIso(new Date(), timezone ?? undefined)");
  });

  it("selects and highlights Ramadan days in the applied runtime timezone", () => {
    const page = source("app/ramadan/page.tsx");

    expect(page).toContain(
      'import { getRuntimePrayerSettings } from "@/lib/data/prayer-settings";',
    );
    expect(page).toContain("prayerSettings?.timezone");
    expect(page).toContain("todayIso(new Date(), prayerSettings?.timezone)");
  });

  it("uses the applied runtime timezone for Azkar category and daily progress clocks", () => {
    const page = source("app/azkar/page.tsx");
    const routine = source("components/azkar/AzkarRoutine.tsx");

    expect(page).toContain(
      'import { getRuntimePrayerSettings } from "@/lib/data/prayer-settings";',
    );
    expect(page).toContain("timezone={prayerSettings?.timezone ?? null}");
    expect(routine).toContain("timezone?: string | null");
    expect(routine).toContain("localDateKey(now, timezone)");
    expect(routine).toContain("smartAzkarCategory(now, timezone ?? undefined)");
    expect(routine).toContain("localDateKey(new Date(), timezone)");
  });
});
