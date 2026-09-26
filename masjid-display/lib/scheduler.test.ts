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
  it("keeps Prayer as the non-skippable anchor and skips empty families", () => {
    const source = active({ azkar: [{ id: "z1" } as ActiveContent["azkar"][number]] });
    const slides = [0, 10, 20, 30, 40].map((seconds) => resolveNormalSlide(source, at(seconds), basis).kind);
    expect(slides).toEqual(["PRAYER", "AZKAR", "PRAYER", "AZKAR", "PRAYER"]);
  });

  it("changes slides only on stable 10 second epochs", () => {
    const source = active({ azkar: [{ id: "z1" } as ActiveContent["azkar"][number]] });
    expect(resolveNormalSlide(source, at(0), basis)).toEqual(resolveNormalSlide(source, at(9), basis));
    expect(resolveNormalSlide(source, at(10), basis).kind).not.toBe(resolveNormalSlide(source, at(0), basis).kind);
  });

  it("returns Prayer within about 20 seconds when optional families exist", () => {
    const source = active({
      azkar: [{ id: "z1" } as ActiveContent["azkar"][number]],
      announcements: [{ id: "a1" } as ActiveContent["announcements"][number]],
    });
    expect([0, 10, 20, 30, 40].map((seconds) => resolveNormalSlide(source, at(seconds), basis).kind)).toEqual([
      "PRAYER",
      "AZKAR",
      "PRAYER",
      "ANNOUNCEMENT",
      "PRAYER",
    ]);
  });

  it("gives Special the first general slot without starving ordinary general content", () => {
    const source = active({
      specialAnnouncements: [{ id: "s1" } as ActiveContent["specialAnnouncements"][number]],
      announcements: [{ id: "a1" } as ActiveContent["announcements"][number]],
      events: [{ id: "e1" } as ActiveContent["events"][number]],
    });
    const generalKinds = [30, 70, 110, 150].map((seconds) => resolveNormalSlide(source, at(seconds), basis).kind);
    expect(generalKinds[0]).toBe("SPECIAL");
    expect(new Set(generalKinds)).toEqual(new Set(["SPECIAL", "ANNOUNCEMENT", "EVENT"]));
  });

  it("round-robins within a family deterministically", () => {
    const source = active({
      announcements: [
        { id: "a1" } as ActiveContent["announcements"][number],
        { id: "a2" } as ActiveContent["announcements"][number],
      ],
    });
    expect([30, 70, 110].map((seconds) => resolveNormalSlide(source, at(seconds), basis).itemId)).toEqual([
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
    expect(resolveNormalSlide(source, at(30), basis).kind).toBe("ANNOUNCEMENT");
    expect(resolveNormalSlide(source, at(150), basis).kind).toBe("EVENT");
  });
});
