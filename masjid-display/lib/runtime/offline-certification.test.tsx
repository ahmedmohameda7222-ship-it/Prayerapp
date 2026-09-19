import { act, cleanup, renderHook } from "@testing-library/react";
import fixture from "../__fixtures__/feed-v1.json";
import {
  activeDisplayContent,
  isAnnouncementActive,
  isCampaignActive,
  isEventActive,
} from "../content-eligibility";
import type { MasjidDisplayFeedV1 } from "../feed-types";
import { loadLkg } from "../lkg";
import { resolveDisplayState } from "../state/resolve-display-state";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./use-test-control", () => ({
  useTestControl: () => ({ active: false }),
}));

import { useDisplayRuntime } from "./use-display-runtime";

const STORAGE_KEY = "masjid-display-lkg-v1";
const NOW = "2026-09-15T18:00:05.000Z";

function cloneFeed(): MasjidDisplayFeedV1 {
  return structuredClone(fixture) as MasjidDisplayFeedV1;
}

function seedLkg(snapshot = cloneFeed(), etag = '"seed"') {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      snapshot,
      etag,
      receivedAt: "2026-09-15T17:59:00.000Z",
      schemaVersion: 1,
    }),
  );
}

async function flush() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe("Masjid Display offline/LKG production certification", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(NOW));
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("certifies first boot online with no cache and installs only a valid network snapshot", async () => {
    const fresh = cloneFeed();
    fresh.snapshotRevision = "a".repeat(64);
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>().mockResolvedValue(
        new Response(JSON.stringify(fresh), {
          status: 200,
          headers: {
            "content-type": "application/json",
            etag: '"fresh"',
            date: "Tue, 15 Sep 2026 18:00:05 GMT",
          },
        }),
      ),
    );

    const { result } = renderHook(() => useDisplayRuntime());
    expect(result.current.feed).toBeNull();
    await flush();

    expect(result.current.feed?.snapshotRevision).toBe(fresh.snapshotRevision);
    expect(result.current.usingLkg).toBe(false);
    expect(loadLkg()?.snapshot.snapshotRevision).toBe(fresh.snapshotRevision);
  });

  it("certifies valid LKG startup and discards malformed LKG before network recovery", async () => {
    const valid = cloneFeed();
    seedLkg(valid);
    vi.stubGlobal("fetch", vi.fn<typeof fetch>(() => new Promise(() => {})));

    const first = renderHook(() => useDisplayRuntime());
    await flush();
    expect(first.result.current.feed?.snapshotRevision).toBe(valid.snapshotRevision);
    expect(first.result.current.usingLkg).toBe(true);
    first.unmount();

    localStorage.setItem(STORAGE_KEY, "{");
    const second = renderHook(() => useDisplayRuntime());
    await flush();
    expect(second.result.current.feed).toBeNull();
    expect(loadLkg()).toBeNull();
  });

  it("retains LKG across malformed 200, unsupported schema, timeout, 5xx, and 304", async () => {
    const valid = cloneFeed();
    seedLkg(valid);
    const unsupported = { ...valid, schemaVersion: 99 };
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response("{", { status: 200 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify(unsupported), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      )
      .mockRejectedValueOnce(new DOMException("timed out", "AbortError"))
      .mockResolvedValueOnce(new Response("upstream unavailable", { status: 503 }))
      .mockResolvedValueOnce(
        new Response(null, {
          status: 304,
          headers: { date: "Tue, 15 Sep 2026 18:04:05 GMT" },
        }),
      );
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useDisplayRuntime());
    await flush();
    expect(result.current.feed?.snapshotRevision).toBe(valid.snapshotRevision);
    expect(loadLkg()?.snapshot.snapshotRevision).toBe(valid.snapshotRevision);

    for (let index = 0; index < 4; index += 1) {
      await act(async () => {
        await vi.advanceTimersByTimeAsync(60_000);
      });
      expect(loadLkg()?.snapshot.snapshotRevision).toBe(valid.snapshotRevision);
    }

    expect(fetchMock).toHaveBeenCalledTimes(5);
    expect(result.current.feed?.snapshotRevision).toBe(valid.snapshotRevision);
    expect(result.current.networkAvailable).toBe(true);
  });

  it("refreshes immediately on reconnect and visibility/wake without replaying stale transient state", async () => {
    const beforeWakeAt = new Date("2026-09-15T15:55:00.000Z");
    const afterWakeAt = new Date("2026-09-15T16:25:00.000Z");
    expect(afterWakeAt.getTime()).toBeGreaterThan(beforeWakeAt.getTime());
    vi.setSystemTime(beforeWakeAt);

    const valid = cloneFeed();
    const day = valid.prayers.schedule.find((row) => row.date === "2026-09-15");
    if (!day) throw new Error("fixture missing current day");
    day.asr = "18:00";
    valid.prayers.iqamaDelays.asr = 10;
    valid.displaySettings.prayerDurations.asr = 10;
    seedLkg(valid);

    const fetchMock = vi.fn<typeof fetch>().mockImplementation(async () =>
      new Response(null, {
        status: 304,
        headers: { date: new Date().toUTCString() },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useDisplayRuntime());
    await flush();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.current.state).toMatchObject({
      kind: "PRAYER_APPROACHING",
      prayer: "asr",
    });

    await act(async () => {
      window.dispatchEvent(new Event("online"));
      await Promise.resolve();
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);

    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "visible",
    });

    vi.setSystemTime(afterWakeAt);
    await act(async () => {
      document.dispatchEvent(new Event("visibilitychange"));
      await vi.advanceTimersByTimeAsync(1_000);
    });

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(result.current.state).toMatchObject({
      kind: "NORMAL",
      prayer: null,
    });
  });

  it("certifies local Announcement/Urgent/Event/Campaign timing while offline", () => {
    const feed = cloneFeed();
    const announcement = feed.announcements[0];
    announcement.displayFrom = "2026-09-15T17:00:00.000Z";
    announcement.displayUntil = "2026-09-15T18:05:00.000Z";
    expect(isAnnouncementActive(announcement, new Date("2026-09-15T17:59:59.000Z"))).toBe(true);
    expect(isAnnouncementActive(announcement, new Date("2026-09-15T18:05:01.000Z"))).toBe(false);

    const future = feed.announcements[1];
    future.displayFrom = "2026-09-15T18:10:00.000Z";
    expect(isAnnouncementActive(future, new Date("2026-09-15T18:09:59.000Z"))).toBe(false);
    expect(isAnnouncementActive(future, new Date("2026-09-15T18:10:00.000Z"))).toBe(true);

    const event = feed.events[0];
    event.date = "2026-09-15";
    event.startTime = "09:00";
    event.endTime = "20:00";
    expect(isEventActive(event, new Date("2026-09-15T17:59:59.000Z"), feed.timezone)).toBe(true);
    expect(isEventActive(event, new Date("2026-09-15T18:00:01.000Z"), feed.timezone)).toBe(false);

    const campaign = feed.campaigns[0];
    campaign.startDate = "2026-09-15";
    campaign.endDate = "2026-09-15";
    expect(isCampaignActive(campaign, new Date("2026-09-15T12:00:00.000Z"), feed.timezone)).toBe(true);
    expect(isCampaignActive(campaign, new Date("2026-09-16T12:00:00.000Z"), feed.timezone)).toBe(false);

    const active = activeDisplayContent(feed, new Date("2026-09-15T17:59:59.000Z"));
    expect(active.urgentAnnouncements.map((item) => item.id)).toContain(announcement.id);
  });

  it("fails safe after cached prayer coverage expires instead of inventing religious state", () => {
    const feed = cloneFeed();
    const afterCoverage = new Date("2026-11-01T12:00:00.000+01:00".replace(".000+01", "+01"));
    const content = activeDisplayContent(feed, afterCoverage);
    const state = resolveDisplayState(feed, afterCoverage);
    expect(content.prayerScheduleStale).toBe(true);
    expect(content.prayerDay).toBeNull();
    expect(state).toMatchObject({
      kind: "NORMAL",
      prayer: null,
      degraded: true,
      degradedReason: "SCHEDULE_COVERAGE_MISSING",
    });
  });
});
