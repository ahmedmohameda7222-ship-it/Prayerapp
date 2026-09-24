import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { Event } from "@/lib/types";
import { isUpcomingEvent } from "@/lib/event-utils";

const source = (path: string) => readFileSync(path, "utf8");

describe("Plan 6 event timezone authority", () => {
  it("keeps a same-local-day event upcoming when Berlin is already on the next date", () => {
    const event: Event = {
      id: "event-la-evening",
      title: "Community evening",
      description: "Timezone regression",
      date: "2026-09-22",
      startTime: "18:00",
      endTime: "20:00",
      location: "Masjid",
      type: "Community",
      published: true,
    };
    const now = new Date("2026-09-23T00:30:00Z");

    expect(isUpcomingEvent(event, now, "America/Los_Angeles")).toBe(true);
  });

  it("passes the applied runtime timezone through every public event-list consumer", () => {
    const home = source("app/page.tsx");
    const eventsPage = source("app/events/page.tsx");

    expect(home).toContain("isUpcomingEvent(event, now, prayerTimezone");
    expect(eventsPage).toContain("getRuntimePrayerTimezone");
    expect(eventsPage).toContain("const prayerTimezone = await getRuntimePrayerTimezone()");
    expect(eventsPage).toContain("isUpcomingEvent(event, now, prayerTimezone)");
    expect(eventsPage).not.toContain(".catch(() => null)");
  });
});
