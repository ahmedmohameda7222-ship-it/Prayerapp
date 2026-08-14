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
  it("shows the nearest published Friday and sorts all same-date services by prayer time", () => {
    const result = getUpcomingFridaySchedule(
      [
        item("third", "2026-08-21", "15:30", "15:00"),
        item("second", "2026-08-21", "14:30", "14:00"),
        item("first", "2026-08-21", "13:30", "13:00"),
        item("later", "2026-08-28", "13:30", "13:00"),
      ],
      new Date("2026-08-17T08:00:00.000Z"),
    );

    expect(result?.date).toBe("2026-08-21");
    expect(result?.items.map((entry) => entry.id)).toEqual(["first", "second", "third"]);
    expect(result?.nextIndex).toBe(0);
    expect(result?.isToday).toBe(false);
  });

  it("identifies the first service when Friday has not started yet", () => {
    const result = getUpcomingFridaySchedule(
      [
        item("one", "2026-08-14", "13:30", "13:00"),
        item("two", "2026-08-14", "14:30", "14:00"),
      ],
      new Date("2026-08-14T09:00:00.000Z"),
    );

    expect(result?.date).toBe("2026-08-14");
    expect(result?.nextIndex).toBe(0);
    expect(result?.isToday).toBe(true);
  });

  it("advances the emphasis to the next service between Friday services", () => {
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

  it("identifies the final service when it is the only remaining Friday service", () => {
    const result = getUpcomingFridaySchedule(
      [
        item("one", "2026-08-14", "13:30", "13:00"),
        item("two", "2026-08-14", "14:30", "14:00"),
        item("three", "2026-08-14", "15:30", "15:00"),
      ],
      new Date("2026-08-14T13:15:00.000Z"),
    );

    expect(result?.nextIndex).toBe(2);
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

  it("never falls back to historical Friday schedules", () => {
    const result = getUpcomingFridaySchedule(
      [
        item("past-one", "2026-08-07", "13:30", "13:00"),
        item("past-two", "2026-07-31", "14:30", "14:00"),
      ],
      new Date("2026-08-17T08:00:00.000Z"),
    );

    expect(result).toBeUndefined();
  });

  it("ignores unpublished and non-Friday records", () => {
    const result = getUpcomingFridaySchedule(
      [
        item("hidden", "2026-08-21", "13:30", "13:00", false),
        item("thursday", "2026-08-20", "13:30", "13:00"),
      ],
      new Date("2026-08-17T08:00:00.000Z"),
    );

    expect(result).toBeUndefined();
  });
});
