import fixture from "../__fixtures__/feed-v1.json";
import type { MasjidDisplayFeedV1 } from "../feed-types";
import { describe, expect, it } from "vitest";
import { resolveDisplayState } from "./resolve-display-state";

const at = (date: string, time: string) => new Date(`${date}T${time}+02:00`);

describe("resolveDisplayState", () => {
  it("routes Friday Dhuhr through the Friday resolver instead of Dhuhr Iqama lifecycle", () => {
    const feed = structuredClone(fixture) as MasjidDisplayFeedV1;
    const friday = feed.prayers.schedule.find((row) => row.date === "2026-09-18");
    if (!friday) throw new Error("fixture missing Friday");
    friday.dhuhr = "13:10";
    feed.prayers.iqamaDelays.dhuhr = 5;

    expect(resolveDisplayState(feed, at("2026-09-18", "13:05:00")).kind).toBe("FRIDAY_MODE");
    expect(resolveDisplayState(feed, at("2026-09-18", "13:12:00")).kind).toBe("JUMUAH_NOW");
    expect(resolveDisplayState(feed, at("2026-09-18", "13:41:00")).kind).toBe("NORMAL");
  });

  it("still resolves non-Dhuhr prayers normally on Friday", () => {
    const feed = structuredClone(fixture) as MasjidDisplayFeedV1;
    const friday = feed.prayers.schedule.find((row) => row.date === "2026-09-18");
    if (!friday) throw new Error("fixture missing Friday");
    friday.asr = "16:45";
    feed.prayers.iqamaDelays.asr = 15;

    expect(resolveDisplayState(feed, at("2026-09-18", "16:40:00"))).toMatchObject({
      kind: "PRAYER_APPROACHING",
      prayer: "asr",
    });
  });

  it("returns degraded NORMAL with no prayer claim when current day lacks schedule coverage", () => {
    const feed = structuredClone(fixture) as MasjidDisplayFeedV1;
    const resolved = resolveDisplayState(feed, at("2026-11-01", "12:00:00"));
    expect(resolved).toMatchObject({
      kind: "NORMAL",
      prayer: null,
      degraded: true,
      degradedReason: "SCHEDULE_COVERAGE_MISSING",
    });
  });
});
