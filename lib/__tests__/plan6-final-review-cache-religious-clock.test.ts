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

  it("refreshes the Home route when the applied timezone changes live", () => {
    const client = source("components/home/HomePageClient.tsx");

    expect(client).toContain('import { useRouter } from "next/navigation";');
    expect(client).toContain("const router = useRouter()");
    expect(client).toContain("latest.timezone !== timezone");
    expect(client).toContain("router.refresh()");
    expect(client).toContain("[router, timezone]");
  });

  it("discards stale overlapping Home prayer refresh responses", () => {
    const client = source("components/home/HomePageClient.tsx");

    expect(client).toContain("useRef");
    expect(client).toContain("refreshGeneration");
    expect(client).toContain("const generation = ++refreshGeneration.current");
    expect(client).toContain("generation !== refreshGeneration.current");
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

  it("uses the applied runtime timezone for Admin operational schedule dates", () => {
    const runtimeDateAction = source("app/admin/runtime-date.ts");
    expect(runtimeDateAction).toContain("requireAllowedAdminIdentity");
    expect(runtimeDateAction).toContain("getRuntimePrayerTimezone");
    expect(runtimeDateAction).toContain("todayIso(new Date(), timezone)");

    for (const path of [
      "app/admin/page.tsx",
      "app/admin/prayer-times/page.tsx",
      "app/admin/jumuah/page.tsx",
    ]) {
      const page = source(path);
      expect(page).toContain("loadAdminRuntimeDateAction");
      expect(page).not.toContain("todayIso()");
    }

    const readiness = source("app/api/admin/launch-readiness/route.ts");
    expect(readiness).toContain("getRuntimePrayerTimezone");
    expect(readiness).toContain("todayIso(new Date(), timezone)");
    expect(readiness).not.toContain("todayIso(),");
  });
});
