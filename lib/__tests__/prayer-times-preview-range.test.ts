import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => null,
}));

import { getPrayerTimeByDate, getPrayerTimes } from "@/lib/data/prayer-times";

describe("prayer-times source behavior", () => {
  it("does not synthesize prayer rows when Supabase is unavailable", async () => {
    expect(await getPrayerTimes(false, "2026-08-15", "2026-08-21")).toEqual([]);
    expect(await getPrayerTimes(false, "2026-06-27", "2026-06-29", 2)).toEqual([]);
  });

  it("does not synthesize an exact-date prayer row when Supabase is unavailable", async () => {
    expect(await getPrayerTimeByDate("2026-08-15")).toBeUndefined();
  });
});
