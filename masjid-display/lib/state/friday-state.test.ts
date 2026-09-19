import fixture from "../__fixtures__/feed-v1.json";
import type { MasjidDisplayFeedV1 } from "../feed-types";
import { describe, expect, it } from "vitest";
import { resolveFridayState } from "./friday-state";

function fridayFeed(additionalTimes: string[] = ["15:00"]): MasjidDisplayFeedV1 {
  const feed = structuredClone(fixture) as MasjidDisplayFeedV1;
  const day = feed.prayers.schedule.find((row) => row.date === "2026-09-18");
  if (!day) throw new Error("fixture missing Friday");
  day.dhuhr = "13:10";
  feed.prayers.additionalJumuah = additionalTimes.map((prayerTime, index) => ({
    id: `extra-${index + 2}`,
    date: "2026-09-18",
    prayerTime,
  }));
  return feed;
}

const friday = (time: string) => new Date(`2026-09-18T${time}+02:00`);

describe("Friday/Jumuah resolver", () => {
  it("uses Friday Dhuhr as the primary service and starts first focus at T-60", () => {
    const feed = fridayFeed();
    expect(resolveFridayState(feed, friday("12:09:59"))).toBeNull();
    expect(resolveFridayState(feed, friday("12:10:00"))).toEqual({
      kind: "FRIDAY_MODE",
      serviceId: "primary:2026-09-18",
      serviceIndex: 0,
    });
  });

  it("holds the primary service as Jumuah Now for at most 30 minutes", () => {
    const feed = fridayFeed();
    expect(resolveFridayState(feed, friday("13:10:00"))?.kind).toBe("JUMUAH_NOW");
    expect(resolveFridayState(feed, friday("13:39:59"))?.kind).toBe("JUMUAH_NOW");
    expect(resolveFridayState(feed, friday("13:40:00"))).toBeNull();
  });

  it("uses T-10 focus for additional services and returns to normal after the final hold", () => {
    const feed = fridayFeed();
    expect(resolveFridayState(feed, friday("14:49:59"))).toBeNull();
    expect(resolveFridayState(feed, friday("14:50:00"))).toEqual({
      kind: "FRIDAY_MODE",
      serviceId: "extra-2",
      serviceIndex: 1,
    });
    expect(resolveFridayState(feed, friday("15:00:00"))?.kind).toBe("JUMUAH_NOW");
    expect(resolveFridayState(feed, friday("15:30:00"))).toBeNull();
  });

  it("preempts an overlapping Jumuah Now hold with the next service T-10 countdown", () => {
    const feed = fridayFeed(["13:35"]);
    expect(resolveFridayState(feed, friday("13:24:59"))?.kind).toBe("JUMUAH_NOW");
    expect(resolveFridayState(feed, friday("13:25:00"))).toEqual({
      kind: "FRIDAY_MODE",
      serviceId: "extra-2",
      serviceIndex: 1,
    });
  });

  it("resolves multiple additional services in chronological order", () => {
    const feed = fridayFeed(["13:50", "15:00"]);
    expect(resolveFridayState(feed, friday("13:40:00"))).toMatchObject({
      kind: "FRIDAY_MODE",
      serviceId: "extra-2",
      serviceIndex: 1,
    });
    expect(resolveFridayState(feed, friday("14:50:00"))).toMatchObject({
      kind: "FRIDAY_MODE",
      serviceId: "extra-3",
      serviceIndex: 2,
    });
  });

  it("ignores khutbah timing metadata as a state source", () => {
    const feed = fridayFeed();
    (feed.prayers.additionalJumuah[0] as typeof feed.prayers.additionalJumuah[0] & {
      khutbahTime?: string;
    }).khutbahTime = "12:00";
    expect(resolveFridayState(feed, friday("12:00:00"))).toBeNull();
  });
});
