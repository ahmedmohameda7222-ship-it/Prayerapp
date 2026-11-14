import fixture from "./__fixtures__/feed-v1.json";
import type { MasjidDisplayFeedV1 } from "./feed-types";
import { describe, expect, it } from "vitest";
import {
  activeDisplayContent,
  isAnnouncementActive,
  isCampaignActive,
  isEventActive,
} from "./content-eligibility";

const feed = () => structuredClone(fixture) as MasjidDisplayFeedV1;
const berlin = (value: string) => new Date(`2026-09-15T${value}+02:00`);

describe("offline content eligibility", () => {
  it("expires urgent locally while offline", () => {
    const urgent = feed().announcements[0];
    urgent.displayUntil = "2026-09-15T18:05:00Z";
    expect(isAnnouncementActive(urgent, new Date("2026-09-15T18:04:59Z"))).toBe(true);
    expect(isAnnouncementActive(urgent, new Date("2026-09-15T18:05:01Z"))).toBe(false);
  });

  it("does not activate a future announcement early", () => {
    const item = feed().announcements[1];
    item.displayFrom = "2026-09-15T18:05:00Z";
    expect(isAnnouncementActive(item, new Date("2026-09-15T18:04:59Z"))).toBe(false);
    expect(isAnnouncementActive(item, new Date("2026-09-15T18:05:00Z"))).toBe(true);
  });

  it("expires events at endTime or at end of local event date", () => {
    const withEnd = feed().events[0];
    withEnd.date = "2026-09-15";
    withEnd.startTime = "09:00";
    withEnd.endTime = "20:00";
    expect(isEventActive(withEnd, berlin("19:59:59"), "Europe/Berlin")).toBe(true);
    expect(isEventActive(withEnd, berlin("20:00:01"), "Europe/Berlin")).toBe(false);

    const noEnd = feed().events[1];
    noEnd.date = "2026-09-15";
    noEnd.startTime = "09:00";
    noEnd.endTime = null;
    expect(isEventActive(noEnd, berlin("23:59:59"), "Europe/Berlin")).toBe(true);
    expect(isEventActive(noEnd, new Date("2026-09-16T00:00:00+02:00"), "Europe/Berlin")).toBe(false);
  });

  it("supports campaigns with an optional end date", () => {
    const campaign = feed().campaigns[0];
    campaign.startDate = "2026-09-01";
    campaign.endDate = null;
    expect(isCampaignActive(campaign, berlin("12:00:00"), "Europe/Berlin")).toBe(true);

    campaign.endDate = "2026-09-14";
    expect(isCampaignActive(campaign, berlin("12:00:00"), "Europe/Berlin")).toBe(false);
  });

  it("uses only the current time-of-day Azkar, never another daypart as fallback", () => {
    const current = feed();
    current.displaySettings.azkarPlaylistIds = ["test-azkar-morning", "test-azkar-evening"];

    expect(activeDisplayContent(current, berlin("09:00:00")).azkar.map((item) => item.id)).toEqual([
      "test-azkar-morning",
    ]);
    expect(activeDisplayContent(current, berlin("16:00:00")).azkar.map((item) => item.id)).toEqual([
      "test-azkar-evening",
    ]);

    current.displaySettings.azkarPlaylistIds = ["test-azkar-evening"];
    expect(activeDisplayContent(current, berlin("09:00:00")).azkar).toEqual([]);
    expect(activeDisplayContent(current, berlin("13:00:00")).azkar).toEqual([]);
    expect(activeDisplayContent(current, berlin("16:00:00")).azkar.map((item) => item.id)).toEqual(["test-azkar-evening"]);
  });

  it("keeps morning, evening and sleep Azkar in their respective Berlin time windows", () => {
    const current = feed();
    const sample = current.azkar[0];
    current.azkar = [
      { ...sample, id: "morning", category: "Morning" },
      { ...sample, id: "evening", category: "Evening" },
      { ...sample, id: "sleep", category: "Sleep" },
    ];
    current.displaySettings.azkarPlaylistIds = current.azkar.map((item) => item.id);
    const idsAt = (value: string) =>
      activeDisplayContent(current, berlin(value)).azkar.map((item) => item.id);

    expect(idsAt("03:59:59")).toEqual(["sleep"]);
    expect(idsAt("04:00:00")).toEqual(["morning"]);
    expect(idsAt("11:59:59")).toEqual(["morning"]);
    expect(idsAt("12:00:00")).toEqual([]);
    expect(idsAt("14:59:59")).toEqual([]);
    expect(idsAt("15:00:00")).toEqual(["evening"]);
    expect(idsAt("21:59:59")).toEqual(["evening"]);
    expect(idsAt("22:00:00")).toEqual(["sleep"]);
  });

  it("shows Friday Azkar together with the correct daypart, except in the post-prayer window", () => {
    const current = feed();
    const sample = current.azkar[0];
    current.azkar = [
      { ...sample, id: "morning", category: "Morning" },
      { ...sample, id: "evening", category: "Evening" },
      { ...sample, id: "sleep", category: "Sleep" },
      { ...sample, id: "friday", category: "Friday" },
      { ...sample, id: "after-prayer", category: "After Prayer" },
    ];
    current.displaySettings.azkarPlaylistIds = current.azkar.map((item) => item.id);
    const friday = (time: string) => new Date(`2026-09-18T${time}+02:00`);
    const idsAt = (value: string) =>
      activeDisplayContent(current, friday(value)).azkar.map((item) => item.id);

    expect(idsAt("09:00:00")).toEqual(expect.arrayContaining(["morning", "friday"]));
    expect(idsAt("09:00:00")).toHaveLength(2);
    expect(idsAt("13:00:00")).toEqual(["friday"]);
    expect(idsAt("13:40:00")).toEqual(["after-prayer"]);
    expect(idsAt("19:00:00")).toEqual(expect.arrayContaining(["evening", "friday"]));
    expect(idsAt("19:00:00")).toHaveLength(2);
    expect(idsAt("23:00:00")).toEqual(expect.arrayContaining(["sleep", "friday"]));
    expect(idsAt("23:00:00")).toHaveLength(2);
  });

  it("marks stale prayer horizon without inventing prayer content", () => {
    const current = feed();
    const active = activeDisplayContent(current, new Date("2026-11-01T12:00:00+01:00"));
    expect(active.prayerScheduleStale).toBe(true);
    expect(active.prayerDay).toBeNull();
  });
});
