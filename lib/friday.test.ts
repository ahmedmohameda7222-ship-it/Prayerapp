import { describe, expect, it } from "vitest";
import { getUpcomingFridaySchedule } from "@/lib/friday";
import type { JumuahTime } from "@/lib/types";

function item(
  id: string,
  date: string,
  prayerTime: string,
  khutbahTime: string,
  published = true,
): JumuahTime {
  return {
    id,
    date,
    khutbahTime,
    prayerTime,
    language: "Arabic / German",
    notes: "",
    published,
  };
}

describe("Friday schedule selection", () => {
  it("shows the nearest published Friday from any day of the week", () => {
    const result = getUpcomingFridaySchedule(
      [
        item("second", "2026-08-21", "14:30", "14:00"),
        item("first", "2026-08-21", "13:30", "13:00"),
      ],
      new Date("2026-08-17T08:00:00.000Z"),
    );

    expect(result?.date).toBe("2026-08-21");
    expect(result?.items.map((entry) => entry.id)).toEqual(["first", "second"]);
    expect(result?.nextIndex).toBe(0);
    expect(result?.isToday).toBe(false);
  });

  it("advances the emphasis to the next service when today is Friday", () => {
    const result = getUpcomingFridaySchedule(
      [
        item("one", "2026-08-14", "13:30", "13:00"),
        item("two", "2026-08-14", "14:30", "14:00"),
        item("three", "2026-08-14", "15:30", "15:00"),
      ],
      new Date("2026-08-14T11:45:00.000Z"),
    );

    expect(result?.date).toBe("2026-08-14");
    expect(result?.nextIndex).toBe(1);
    expect(result?.isToday).toBe(true);
  });

  it("moves to the next published Friday after the final service has ended", () => {
    const result = getUpcomingFridaySchedule(
      [
        item("today", "2026-08-14", "13:30", "13:00"),
        item("next", "2026-08-21", "13:45", "13:15"),
      ],
      new Date("2026-08-14T13:00:00.000Z"),
    );

    expect(result?.date).toBe("2026-08-21");
    expect(result?.items.map((entry) => entry.id)).toEqual(["next"]);
    expect(result?.isToday).toBe(false);
  });

  it("ignores past, unpublished, and non-Friday records", () => {
    const result = getUpcomingFridaySchedule(
      [
        item("past", "2026-08-07", "13:30", "13:00"),
        item("hidden", "2026-08-21", "13:30", "13:00", false),
        item("thursday", "2026-08-20", "13:30", "13:00"),
      ],
      new Date("2026-08-17T08:00:00.000Z"),
    );

    expect(result).toBeUndefined();
  });
});
