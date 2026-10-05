import { describe, expect, it } from "vitest";
import type { ActiveContent } from "./content-eligibility";
import { resolveNormalSlide, type SchedulerBasis } from "./scheduler";

const at = (seconds: number) => new Date(Date.parse("2026-09-15T12:00:00Z") + seconds * 1000);
const basis: SchedulerBasis = { epochMs: Date.parse("2026-09-15T12:00:00Z"), revision: "rev-a" };

function active(overrides: Partial<ActiveContent> = {}): ActiveContent {
  return {
    prayerDay: { date: "2026-09-15" } as ActiveContent["prayerDay"],
    prayerScheduleStale: false,
    azkar: [],
    announcements: [],
    specialAnnouncements: [],
    urgentAnnouncements: [],
    events: [],
    campaigns: [],
    maghribPrograms: [],
    ...overrides,
  };
}

describe("deterministic normal scheduler", () => {
  it("does not duplicate the fixed Prayer Strip as a rotating prayer-times slide", () => {
    expect(resolveNormalSlide(active(), at(0), basis)).toBeNull();
    expect(resolveNormalSlide(active(), at(30), basis)).toBeNull();
  });

  it("changes optional content only on stable 10 second epochs", () => {
    const source = active({
      azkar: [{ id: "z1" } as ActiveContent["azkar"][number]],
      announcements: [{ id: "a1" } as ActiveContent["announcements"][number]],
    });
    expect(resolveNormalSlide(source, at(0), basis)).toEqual(resolveNormalSlide(source, at(9), basis));
    expect(resolveNormalSlide(source, at(10), basis)?.kind).not.toBe(
      resolveNormalSlide(source, at(0), basis)?.kind,
    );
  });

  it("alternates Azkar with general content without inserting prayer timetable slides", () => {
    const source = active({
      azkar: [{ id: "z1" } as ActiveContent["azkar"][number]],
      announcements: [{ id: "a1" } as ActiveContent["announcements"][number]],
    });
    expect([0, 10, 20, 30].map((seconds) => resolveNormalSlide(source, at(seconds), basis)?.kind)).toEqual([
      "AZKAR",
      "ANNOUNCEMENT",
      "AZKAR",
      "ANNOUNCEMENT",
    ]);
  });

  it("keeps the only available optional family visible instead of blanking the center", () => {
    const source = active({
      announcements: [{ id: "a1" } as ActiveContent["announcements"][number]],
    });
    expect([0, 10, 20].map((seconds) => resolveNormalSlide(source, at(seconds), basis)?.kind)).toEqual([
      "ANNOUNCEMENT",
      "ANNOUNCEMENT",
      "ANNOUNCEMENT",
    ]);
  });

  it("gives Special the first general occurrence without starving ordinary general content", () => {
    const source = active({
      specialAnnouncements: [{ id: "s1" } as ActiveContent["specialAnnouncements"][number]],
      announcements: [{ id: "a1" } as ActiveContent["announcements"][number]],
      events: [{ id: "e1" } as ActiveContent["events"][number]],
    });
    const kinds = [0, 10, 20].map((seconds) => resolveNormalSlide(source, at(seconds), basis)?.kind);
    expect(kinds).toEqual(["SPECIAL", "ANNOUNCEMENT", "EVENT"]);
  });

  it("round-robins within a family deterministically", () => {
    const source = active({
      announcements: [
        { id: "a1" } as ActiveContent["announcements"][number],
        { id: "a2" } as ActiveContent["announcements"][number],
      ],
    });
    expect([0, 10, 20].map((seconds) => resolveNormalSlide(source, at(seconds), basis)?.itemId)).toEqual([
      "a1",
      "a2",
      "a1",
    ]);
  });

  it("can resume after a paused interval without resetting fairness", () => {
    const source = active({
      announcements: [{ id: "a1" } as ActiveContent["announcements"][number]],
      events: [{ id: "e1" } as ActiveContent["events"][number]],
    });
    expect(resolveNormalSlide(source, at(0), basis)?.kind).toBe("ANNOUNCEMENT");
    expect(resolveNormalSlide(source, at(30), basis)?.kind).toBe("EVENT");
  });
});
