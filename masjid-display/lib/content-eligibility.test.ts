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

  it("uses current Azkar category and falls back to any selected item", () => {
    const current = feed();
    current.displaySettings.azkarPlaylistIds = ["test-azkar-morning", "test-azkar-evening"];

    expect(activeDisplayContent(current, berlin("09:00:00")).azkar.map((item) => item.id)).toEqual([
      "test-azkar-morning",
    ]);
    expect(activeDisplayContent(current, berlin("16:00:00")).azkar.map((item) => item.id)).toEqual([
      "test-azkar-evening",
    ]);

    current.displaySettings.azkarPlaylistIds = ["test-azkar-evening"];
    expect(activeDisplayContent(current, berlin("09:00:00")).azkar.map((item) => item.id)).toEqual([
      "test-azkar-evening",
    ]);
  });

  it("marks stale prayer horizon without inventing prayer content", () => {
    const current = feed();
    const active = activeDisplayContent(current, new Date("2026-11-01T12:00:00+01:00"));
    expect(active.prayerScheduleStale).toBe(true);
    expect(active.prayerDay).toBeNull();
  });
});
