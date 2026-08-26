import { describe, expect, it } from "vitest";
import {
  FRIDAY_IMMINENT_WINDOW_MS,
  getFridayLivePrayer,
  resolveUpcomingFridaySchedule,
} from "@/lib/friday";
import type { JumuahTime, PrayerTime } from "@/lib/types";

function prayer(date: string, dhuhr = "12:18", published = true, dhuhrIqama = "13:00"): PrayerTime {
  return {
    id: `prayer:${date}`,
    date,
    fajr: "04:30",
    sunrise: "06:10",
    dhuhr,
    asr: "16:30",
    maghrib: "20:20",
    isha: "21:45",
    dhuhrIqama,
    published,
    updatedAt: "2026-08-01T00:00:00.000Z",
  };
}

function extra(
  id: string,
  date: string,
  prayerTime: string,
  published = true,
): JumuahTime {
  return {
    id,
    date,
    khutbahTime: prayerTime,
    prayerTime,
    language: "Arabic / German",
    notes: "",
    published,
  };
}

describe("unified Friday schedule resolver", () => {
  it("creates immutable Primary Jumu'ah from Friday dhuhr with zero DB rows", () => {
    const result = resolveUpcomingFridaySchedule(
      [prayer("2026-08-21", "12:18", true, "13:00")],
      [],
      new Date("2026-08-17T08:00:00.000Z"),
    );

    expect(result?.date).toBe("2026-08-21");
    expect(result?.items).toHaveLength(1);
    expect(result?.items[0]).toMatchObject({
      id: "primary:2026-08-21",
      prayerTime: "12:18",
      source: "prayer-times",
      editable: false,
    });
    expect(result?.items[0]?.prayerTime).not.toBe("13:00");
  });

  it("sorts valid published extras after Primary and deduplicates legacy Primary rows", () => {
    const result = resolveUpcomingFridaySchedule(
      [prayer("2026-08-21")],
      [
        extra("late", "2026-08-21", "14:30"),
        extra("legacy-primary", "2026-08-21", "12:18"),
        extra("early-invalid", "2026-08-21", "12:00"),
        extra("second", "2026-08-21", "13:30"),
        extra("duplicate-second", "2026-08-21", "13:30"),
        extra("hidden", "2026-08-21", "15:30", false),
      ],
      new Date("2026-08-17T08:00:00.000Z"),
    );

    expect(result?.items.map((item) => [item.id, item.prayerTime, item.source, item.editable])).toEqual([
      ["primary:2026-08-21", "12:18", "prayer-times", false],
      ["second", "13:30", "jumuah-times", true],
      ["late", "14:30", "jumuah-times", true],
    ]);
  });

  it("ignores unpublished and non-Friday prayer rows instead of fabricating Primary", () => {
    const result = resolveUpcomingFridaySchedule(
      [prayer("2026-08-20"), prayer("2026-08-21", "12:18", false)],
      [extra("orphan", "2026-08-21", "13:30")],
      new Date("2026-08-17T08:00:00.000Z"),
    );

    expect(result).toBeUndefined();
  });

  it("advances through Friday services using Europe/Berlin clock time", () => {
    const prayerRows = [prayer("2026-08-21")];
    const extras = [extra("two", "2026-08-21", "13:30"), extra("three", "2026-08-21", "14:30")];

    expect(resolveUpcomingFridaySchedule(prayerRows, extras, new Date("2026-08-21T09:00:00.000Z"))?.nextIndex).toBe(0);
    expect(resolveUpcomingFridaySchedule(prayerRows, extras, new Date("2026-08-21T10:30:00.000Z"))?.nextIndex).toBe(1);
    expect(resolveUpcomingFridaySchedule(prayerRows, extras, new Date("2026-08-21T11:45:00.000Z"))?.nextIndex).toBe(2);
  });

  it("moves to the next Friday prayer row after the final service passes", () => {
    const result = resolveUpcomingFridaySchedule(
      [prayer("2026-08-21"), prayer("2026-08-28", "12:19")],
      [extra("today-extra", "2026-08-21", "13:30")],
      new Date("2026-08-21T12:00:00.000Z"),
    );

    expect(result?.date).toBe("2026-08-28");
    expect(result?.items[0]?.prayerTime).toBe("12:19");
    expect(result?.isToday).toBe(false);
  });
});

describe("Friday live prayer state", () => {
  it("uses the resolver nextIndex as the single live hero target", () => {
    const now = new Date("2026-08-21T10:30:00.000Z");
    const schedule = resolveUpcomingFridaySchedule(
      [prayer("2026-08-21")],
      [extra("two", "2026-08-21", "13:30")],
      now,
    );
    const live = getFridayLivePrayer(schedule, now);

    expect(live?.item.id).toBe("two");
    expect(live?.index).toBe(1);
    expect(live?.remainingMs).toBeGreaterThan(0);
  });

  it("preserves the five-minute imminent window", () => {
    const now = new Date("2026-08-21T10:14:00.000Z");
    const schedule = resolveUpcomingFridaySchedule([prayer("2026-08-21")], [], now);
    const live = getFridayLivePrayer(schedule, now);

    expect(FRIDAY_IMMINENT_WINDOW_MS).toBe(300_000);
    expect(live?.imminent).toBe(true);
  });
});
