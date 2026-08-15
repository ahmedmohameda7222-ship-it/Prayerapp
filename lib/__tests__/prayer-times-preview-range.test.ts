import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => null,
}));

import { getPrayerTimeByDate, getPrayerTimes } from "@/lib/data/prayer-times";

describe("prayer-times preview fallback range behavior", () => {
  it("returns no stale built-in preview rows for a current range that does not contain them", async () => {
    const rows = await getPrayerTimes(false, "2026-08-14", "2026-08-20");
    expect(rows).toEqual([]);
  });

  it("still returns built-in preview rows when the requested range actually contains them", async () => {
    const rows = await getPrayerTimes(false, "2026-06-27", "2026-06-29", 2);
    expect(rows.map((row) => row.date)).toEqual(["2026-06-27", "2026-06-28"]);
  });

  it("does not return a different preview date for an exact-date lookup", async () => {
    expect(await getPrayerTimeByDate("2026-08-15")).toBeUndefined();
  });
});
