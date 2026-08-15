import { describe, expect, it } from "vitest";
import { getHomeJumuahSchedule } from "@/lib/home-jumuah";
import type { JumuahTime } from "@/lib/types";

function item(id: string, prayerTime: string, khutbahTime: string): JumuahTime {
  return {
    id,
    date: "2026-08-14",
    khutbahTime,
    prayerTime,
    language: "Arabic / German",
    notes: "",
    published: true,
  };
}

const schedule = [
  item("one", "13:45", "13:15"),
  item("two", "14:45", "14:15"),
  item("three", "15:45", "15:15"),
];

describe("Home Jumuah visibility", () => {
  it("appears from Wednesday for the coming Friday and keeps all services", () => {
    const result = getHomeJumuahSchedule(schedule, new Date("2026-08-12T08:00:00.000Z"));
    expect(result?.daysUntil).toBe(2);
    expect(result?.items.map((entry) => entry.id)).toEqual(["one", "two", "three"]);
  });

  it("does not appear three days before Friday", () => {
    expect(getHomeJumuahSchedule(schedule, new Date("2026-08-11T08:00:00.000Z"))).toBeUndefined();
  });

  it("allows the temporary preview to show the next Friday outside the normal two-day window", () => {
    const result = getHomeJumuahSchedule(
      schedule,
      new Date("2026-08-08T08:00:00.000Z"),
      { allowAnyFutureFriday: true },
    );

    expect(result?.date).toBe("2026-08-14");
    expect(result?.daysUntil).toBe(6);
    expect(result?.items).toHaveLength(3);
  });

  it("keeps the Friday card visible after an earlier service and advances the next service", () => {
    const result = getHomeJumuahSchedule(schedule, new Date("2026-08-14T12:50:00.000Z"));
    expect(result?.daysUntil).toBe(0);
    expect(result?.nextIndex).toBe(2);
  });

  it("disappears after the final Friday prayer time", () => {
    expect(getHomeJumuahSchedule(schedule, new Date("2026-08-14T14:00:00.000Z"))).toBeUndefined();
  });

  it("ignores unpublished Jumuah rows", () => {
    const hidden = [{ ...schedule[0], published: false }];
    expect(getHomeJumuahSchedule(hidden, new Date("2026-08-12T08:00:00.000Z"))).toBeUndefined();
  });
});
