import { act, cleanup, renderHook } from "@testing-library/react";
import { readFileSync } from "node:fs";
import path from "node:path";
import fixture from "../__fixtures__/feed-v1.json";
import type { MasjidDisplayFeedV1 } from "../feed-types";
import { loadLkg } from "../lkg";
import { resolveDisplayState } from "../state/resolve-display-state";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useDisplayRuntime } from "./use-display-runtime";

const STORAGE_KEY = "masjid-display-lkg-v1";

function realFeed(): MasjidDisplayFeedV1 {
  return structuredClone(fixture) as MasjidDisplayFeedV1;
}

function seedLkg(feed: MasjidDisplayFeedV1) {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      snapshot: feed,
      etag: '"real"',
      receivedAt: "2026-09-15T17:59:00.000Z",
      schemaVersion: 1,
    }),
  );
}

function directive(
  scenario: "prayer_approaching" | "campaign",
  options: { expiresAt?: string; publicAppUrl?: string | null } = {},
) {
  const startedAt = "2026-09-15T18:00:00.000Z";
  const expiresAt = options.expiresAt ?? "2026-09-15T18:15:00.000Z";
  if (scenario === "campaign") {
    return {
      active: true,
      scenario,
      startedAt,
      expiresAt,
      publicAppUrl: options.publicAppUrl ?? null,
      payload: {
        scenario,
        id: "test-campaign",
        titleAr: "حملة تجريبية",
        titleDe: "Testkampagne",
        descriptionAr: "اختبار",
        descriptionDe: "Test",
        donationUrl: "https://example.invalid/test",
      },
    };
  }
  return {
    active: true,
    scenario,
    startedAt,
    expiresAt,
    publicAppUrl: options.publicAppUrl ?? null,
    payload: {
      scenario,
      id: "test-approaching",
      prayer: "isha",
      targetAt: "2026-09-15T18:10:00.000Z",
      titleAr: "اقتربت الصلاة",
      titleDe: "Gebet beginnt bald",
      messageAr: "اختبار",
      messageDe: "Test",
    },
  };
}

async function flush() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe("Masjid Display Test Mode production certification", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-15T18:00:05.000Z"));
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("starts, switches, stops, preserves Prayerapp QR, never poisons LKG, and returns to CURRENT real state", async () => {
    const feed = realFeed();
    seedLkg(feed);
    let testPoll = 0;
    const productionFetch = vi.fn(() =>
      Promise.resolve(new Response(null, { status: 304 })),
    );

    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>((input) => {
        const url = String(input);
        if (url.includes("/api/display-feed")) return productionFetch();
        testPoll += 1;
        const body =
          testPoll === 1
            ? directive("prayer_approaching", { publicAppUrl: null })
            : testPoll === 2
              ? directive("campaign", { publicAppUrl: null })
              : { active: false };
        return Promise.resolve(
          new Response(JSON.stringify(body), {
            status: 200,
            headers: { "content-type": "application/json" },
          }),
        );
      }),
    );

    const { result } = renderHook(() => useDisplayRuntime());
    await flush();

    expect(result.current.testMode).toBe(true);
    expect(result.current.state?.kind).toBe("PRAYER_APPROACHING");
    expect(result.current.publicAppUrl).toBe(feed.mosque.publicAppUrl);
    expect(loadLkg()?.snapshot.snapshotRevision).toBe(feed.snapshotRevision);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2_000);
    });
    expect(result.current.testMode).toBe(true);
    expect(result.current.normalSlide?.kind).toBe("CAMPAIGN");
    expect(result.current.publicAppUrl).toBe(feed.mosque.publicAppUrl);
    expect(loadLkg()?.snapshot.snapshotRevision).toBe(feed.snapshotRevision);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2_000);
    });
    expect(result.current.testMode).toBe(false);
    expect(result.current.testPayload).toBeNull();
    expect(result.current.state).toEqual(
      resolveDisplayState(feed, result.current.logicalNow),
    );
    expect(loadLkg()?.snapshot.snapshotRevision).toBe(feed.snapshotRevision);
  });

  it("expires Test Mode locally even when subsequent Test Control polls fail", async () => {
    const feed = realFeed();
    seedLkg(feed);
    let controlCalls = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>((input) => {
        const url = String(input);
        if (url.includes("/api/display-feed")) {
          return Promise.resolve(new Response(null, { status: 304 }));
        }
        controlCalls += 1;
        if (controlCalls === 1) {
          return Promise.resolve(
            new Response(
              JSON.stringify(
                directive("prayer_approaching", {
                  expiresAt: "2026-09-15T18:00:10.000Z",
                  publicAppUrl: feed.mosque.publicAppUrl,
                }),
              ),
              { status: 200, headers: { "content-type": "application/json" } },
            ),
          );
        }
        return Promise.reject(new Error("offline"));
      }),
    );

    const { result } = renderHook(() => useDisplayRuntime());
    await flush();
    expect(result.current.testMode).toBe(true);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(6_000);
    });
    expect(result.current.testMode).toBe(false);
    expect(result.current.state).toEqual(
      resolveDisplayState(feed, result.current.logicalNow),
    );
  });

  it("keeps the Admin Test lifecycle fixed at 15 minutes and extension at +15 minutes", () => {
    const cwd = process.cwd();
    const root = path.basename(cwd) === "masjid-display" ? path.resolve(cwd, "..") : cwd;
    const source = readFileSync(
      path.join(root, "app/admin/masjid-display-test/actions.ts"),
      "utf8",
    );
    expect(source).toContain("const FIFTEEN_MINUTES_MS = 15 * 60 * 1000");
    expect(source).toContain("new Date(startedAt).getTime() + FIFTEEN_MINUTES_MS");
    expect(source).toContain("new Date(current.expiresAt).getTime() + FIFTEEN_MINUTES_MS");
    expect(source).toContain("enabled: false");
    expect(source).toContain("payload: null");
  });

  it("keeps synthetic Test writes isolated from production religious/content tables", () => {
    const cwd = process.cwd();
    const root = path.basename(cwd) === "masjid-display" ? path.resolve(cwd, "..") : cwd;
    const source = readFileSync(
      path.join(root, "app/admin/masjid-display-test/actions.ts"),
      "utf8",
    );
    expect(source).toContain('.from("masjid_display_test_state")');
    expect(source).not.toMatch(
      /\.from\(["'](?:prayer_times|prayer_settings|announcements|events|donation_campaigns|jumuah_times)["']\)/,
    );
  });
});
