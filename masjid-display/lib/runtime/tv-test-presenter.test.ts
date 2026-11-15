import { describe, expect, it } from "vitest";
import fixture from "../__fixtures__/feed-v1.json";
import type { MasjidDisplayFeedV1 } from "../feed-types";
import type { DisplayRuntimeViewModel } from "../runtime/use-display-runtime";
import { applyTvTestCommand, parseTvTestStatus, type TvTestCommand } from "./tv-test-presenter";

const feed = structuredClone(fixture) as MasjidDisplayFeedV1;
const start = "2026-09-15T10:00:00.000Z";
const end = "2026-09-15T10:03:00.000Z";

function vm(now = "2026-09-15T10:00:15.000Z"): DisplayRuntimeViewModel {
  return {
    feed: structuredClone(feed),
    logicalNow: new Date(now),
    state: { kind: "NORMAL", prayer: null, degraded: false, degradedReason: null },
    content: null,
    normalSlide: null,
    urgent: [],
    networkAvailable: true,
    usingLkg: false,
    prayerScheduleStale: false,
    publicAppUrl: feed.mosque.publicAppUrl,
  };
}
function command(scenario: string, prayer: string | null = null): TvTestCommand {
  // Tests intentionally supply invalid runtime strings to test fail-closed parsing.
  return { scenario: scenario as TvTestCommand["scenario"], prayer: prayer as TvTestCommand["prayer"], startedAt: start, expiresAt: end };
}

describe("TV Test command reader", () => {
  it("rejects untrusted nonallowlisted payloads and commands after expiry", () => {
    const valid = { active: true, command: command("PRAYER_APPROACHING", "asr") };
    expect(parseTvTestStatus(valid, new Date("2026-09-15T10:01:00Z"))).toMatchObject(command("PRAYER_APPROACHING", "asr"));
    expect(parseTvTestStatus(valid, new Date(end))).toBeNull();
    expect(parseTvTestStatus({ active: true, command: command("<script>", "asr") }, new Date("2026-09-15T10:01:00Z"))).toBeNull();
    expect(parseTvTestStatus({ active: true, command: { ...command("PRAYER_APPROACHING", "asr"), expiresAt: "2026-09-15T10:10:00Z" } }, new Date("2026-09-15T10:01:00Z"))).toBeNull();
    expect(parseTvTestStatus({ active: false, command: null }, new Date("2026-09-15T10:01:00Z"))).toBeNull();
  });

  it("uses real Asr schedule in a progressing Adhan countdown", () => {
    const raw = vm();
    const simulated = applyTvTestCommand(raw, command("PRAYER_APPROACHING", "asr"));
    expect(simulated.state).toMatchObject({ kind: "PRAYER_APPROACHING", prayer: "asr" });
    expect(simulated.logicalNow.toISOString()).not.toBe(raw.logicalNow.toISOString());
    const later = applyTvTestCommand(vm("2026-09-15T10:02:15.000Z"), command("PRAYER_APPROACHING", "asr"));
    expect(later.state?.kind).toBe("PRAYER_TIME_NOW");
    expect(raw.state?.kind).toBe("NORMAL");
  });

  it("selects authentic Iqama, prayer blackout and rotating post-prayer dhikr", () => {
    for (const scenario of ["WAITING_FOR_IQAMA", "IQAMA_NOW", "PRAYER_IN_PROGRESS"]) {
      const preview = applyTvTestCommand(vm(), command(scenario, "asr"));
      expect(preview.state).toMatchObject({ kind: scenario, prayer: "asr" });
    }
    const withAfterPrayer = vm("2026-09-15T10:00:02.000Z");
    withAfterPrayer.feed!.azkar.push({
      id: "after-test", category: "After Prayer",
      arabicText: "أستغفر الله", translationDe: "Ich bitte Allah um Vergebung",
      source: "Hisn al-Muslim 66", repeatCount: 3, sortOrder: 1,
    });
    withAfterPrayer.feed!.displaySettings.azkarPlaylistIds.push("after-test");
    const afterTest = applyTvTestCommand(withAfterPrayer, command("POST_PRAYER_AZKAR", "asr"));
    expect(afterTest.state).toMatchObject({ kind: "POST_PRAYER_AZKAR", prayer: "asr" });
    expect(afterTest.tvTestUnavailableReason).toBeUndefined();
    // One short 11-second item genuinely ends before the 180s rehearsal TTL.
    const finished = applyTvTestCommand({ ...withAfterPrayer, logicalNow: new Date("2026-09-15T10:00:15.000Z") }, command("POST_PRAYER_AZKAR", "asr"));
    expect(finished.state?.kind).toBe("NORMAL");
  });

  it("shows an unavailable-case notice rather than mislabeling a real different prayer state", () => {
    const noAfterPrayer = applyTvTestCommand(vm(), command("POST_PRAYER_AZKAR", "asr"));
    expect(noAfterPrayer.tvTestUnavailableReason).toMatch(/POST_PRAYER_AZKAR/);

    const shortIqama = vm();
    shortIqama.feed!.prayers.iqamaDelays.asr = 1;
    const noWait = applyTvTestCommand(shortIqama, command("WAITING_FOR_IQAMA", "asr"));
    expect(noWait.tvTestUnavailableReason).toMatch(/WAITING_FOR_IQAMA/);
  });

  it("finds the next Friday in the Feed rather than manufacturing a Friday date", () => {
    const pre = applyTvTestCommand(vm(), command("FRIDAY_MODE"));
    const now = applyTvTestCommand(vm(), command("JUMUAH_NOW"));
    expect(pre.state?.kind).toBe("FRIDAY_MODE");
    expect(now.state?.kind).toBe("JUMUAH_NOW");
    expect(pre.state?.serviceIndex).toBe(0);
  });

  it("allows an Admin to demonstrate published morning Azkar outside the morning window", () => {
    const afternoon = vm("2026-09-15T11:00:15.000Z"); // 13:00 Berlin: no daypart
    const preview = applyTvTestCommand(afternoon, {
      ...command("AZKAR"), startedAt: "2026-09-15T11:00:00.000Z", expiresAt: "2026-09-15T11:03:00.000Z",
    });
    expect(preview.state?.kind).toBe("NORMAL");
    expect(preview.normalSlide?.kind).toBe("AZKAR");
    expect(preview.content?.azkar.length).toBeGreaterThan(0);
  });

  it("allows preview of a published campaign without modifying its real display schedule", () => {
    const initial = vm();
    const preview = applyTvTestCommand(initial, command("CAMPAIGN"));
    expect(preview.normalSlide?.kind).toBe("CAMPAIGN");
    expect(preview.content?.campaigns.length).toBeGreaterThan(0);
    expect(initial.feed?.campaigns.length).toBeGreaterThan(0);
  });

  it("derives Next Prayer from the real feed, and returns to original VM if stopped or expired", () => {
    const real = vm();
    const preview = applyTvTestCommand(real, command("NEXT_PRAYER"));
    expect(preview.state?.kind).toBe("NORMAL");
    expect(preview.normalSlide).toEqual({ kind: "NEXT_PRAYER", itemId: null });
    expect(applyTvTestCommand(real, null)).toBe(real);
    expect(applyTvTestCommand(vm("2026-09-15T10:03:00.000Z"), command("NEXT_PRAYER")).state).toMatchObject({ kind: "NORMAL" });
  });

  it("never guesses a date if no prayer schedule or current Feed is available", () => {
    const original = vm();
    const noFeed = { ...original, feed: null };
    expect(applyTvTestCommand(noFeed, command("IQAMA_NOW", "asr"))).toBe(noFeed);
    const empty = { ...original, feed: { ...feed, prayers: { ...feed.prayers, schedule: [] } } };
    expect(applyTvTestCommand(empty, command("IQAMA_NOW", "asr"))).toBe(empty);
  });
});
