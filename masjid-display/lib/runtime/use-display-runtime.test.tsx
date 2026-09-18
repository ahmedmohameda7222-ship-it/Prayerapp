import { act, cleanup, renderHook } from "@testing-library/react";
import { readFileSync } from "node:fs";
import path from "node:path";
import fixture from "../__fixtures__/feed-v1.json";
import type { MasjidDisplayFeedV1 } from "../feed-types";
import { loadLkg } from "../lkg";
import { resolveDisplayState } from "../state/resolve-display-state";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const testControl = vi.hoisted(() => ({
  current: { active: false } as Record<string, unknown>,
}));

vi.mock("./use-test-control", () => ({
  useTestControl: () => testControl.current,
}));

import { useDisplayRuntime } from "./use-display-runtime";

const STORAGE_KEY = "masjid-display-lkg-v1";
const SERVER_DATE = "Tue, 15 Sep 2026 18:00:00 GMT";

function cloneFeed(): MasjidDisplayFeedV1 {
  return structuredClone(fixture) as MasjidDisplayFeedV1;
}

function seedLkg(snapshot: MasjidDisplayFeedV1, etag = '"seed"') {
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

async function flushEffects() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe("useDisplayRuntime", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-15T18:00:05.000Z"));
    localStorage.clear();
    testControl.current = { active: false };
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("keeps the first client render hydration-stable and loads LKG after mount", async () => {
    const validFeed = cloneFeed();
    seedLkg(validFeed);
    vi.stubGlobal("fetch", vi.fn<typeof fetch>(() => new Promise(() => {})));

    const { result } = renderHook(() => useDisplayRuntime());

    expect(result.current.feed).toBeNull();
    expect(result.current.usingLkg).toBe(false);

    await flushEffects();

    expect(result.current.feed?.snapshotRevision).toBe(validFeed.snapshotRevision);
    expect(result.current.usingLkg).toBe(true);
  });

  it("renders LKG first, polls every 60s, and keeps LKG after invalid 200", async () => {
    const validFeed = cloneFeed();
    seedLkg(validFeed);
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ schemaVersion: 2 }), {
          status: 200,
          headers: { "content-type": "application/json", date: SERVER_DATE },
        }),
      )
      .mockResolvedValueOnce(new Response(null, { status: 304, headers: { date: SERVER_DATE } }));
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useDisplayRuntime());
    expect(result.current.feed).toBeNull();
    await flushEffects();
    expect(result.current.feed?.snapshotRevision).toBe(validFeed.snapshotRevision);
    expect(result.current.diagnostics?.validationError).toMatch(/validation/i);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000);
    });
    expect(result.current.feed?.snapshotRevision).toBe(validFeed.snapshotRevision);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(new Headers(fetchMock.mock.calls[1]?.[1]?.headers).get("if-none-match")).toBe('"seed"');
  });

  it("refreshes immediately on online and visible wake events", async () => {
    seedLkg(cloneFeed());
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(null, { status: 304, headers: { date: SERVER_DATE } }),
    );
    vi.stubGlobal("fetch", fetchMock);
    renderHook(() => useDisplayRuntime());
    await flushEffects();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await act(async () => {
      window.dispatchEvent(new Event("online"));
      await Promise.resolve();
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);

    Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" });
    await act(async () => {
      document.dispatchEvent(new Event("visibilitychange"));
      await Promise.resolve();
    });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("recomputes religious state every second without replaying missed transitions", async () => {
    const validFeed = cloneFeed();
    seedLkg(validFeed);
    vi.setSystemTime(new Date("2026-09-15T14:34:59.000Z"));
    vi.stubGlobal("fetch", vi.fn<typeof fetch>(() => new Promise(() => {})));

    const { result } = renderHook(() => useDisplayRuntime());
    await flushEffects();
    expect(result.current.state?.kind).toBe("NORMAL");
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_000);
    });
    expect(result.current.state?.kind).toBe("PRAYER_APPROACHING");
  });

  it("retains LKG through timeout and 5xx failures", async () => {
    const validFeed = cloneFeed();
    seedLkg(validFeed);
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockRejectedValueOnce(new DOMException("timed out", "AbortError"))
      .mockResolvedValueOnce(new Response("upstream", { status: 503 }));
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useDisplayRuntime());
    await flushEffects();
    expect(result.current.feed?.snapshotRevision).toBe(validFeed.snapshotRevision);
    expect(result.current.usingLkg).toBe(true);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000);
    });
    expect(result.current.feed?.snapshotRevision).toBe(validFeed.snapshotRevision);
    expect(result.current.networkAvailable).toBe(false);
  });

  it("uses request/response midpoint timing for a slow production Feed response", async () => {
    const validFeed = cloneFeed();
    seedLkg(validFeed);
    const response = deferred<Response>();
    vi.setSystemTime(new Date("2026-09-15T18:00:00.000Z"));
    vi.stubGlobal("fetch", vi.fn<typeof fetch>().mockImplementation(() => response.promise));

    const { result } = renderHook(() => useDisplayRuntime());
    await flushEffects();

    vi.setSystemTime(new Date("2026-09-15T18:00:04.000Z"));
    await act(async () => {
      response.resolve(
        new Response(null, {
          status: 304,
          headers: { date: "Tue, 15 Sep 2026 18:00:02 GMT" },
        }),
      );
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(result.current.diagnostics?.clockOffsetMs).toBe(0);
    expect(result.current.logicalNow.toISOString()).toBe("2026-09-15T18:00:04.000Z");
  });

  it("atomically replaces production state and LKG after a valid 200", async () => {
    const oldFeed = cloneFeed();
    seedLkg(oldFeed);
    const freshFeed = cloneFeed();
    freshFeed.snapshotRevision = "a".repeat(64);
    freshFeed.generatedAt = "2026-09-15T18:00:00.000Z";
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>().mockResolvedValue(
        new Response(JSON.stringify(freshFeed), {
          status: 200,
          headers: { "content-type": "application/json", etag: '"fresh"', date: SERVER_DATE },
        }),
      ),
    );

    const { result } = renderHook(() => useDisplayRuntime());
    await flushEffects();
    expect(result.current.feed?.snapshotRevision).toBe(freshFeed.snapshotRevision);
    expect(loadLkg()?.snapshot.snapshotRevision).toBe(freshFeed.snapshotRevision);
    expect(loadLkg()?.etag).toBe('"fresh"');
    expect(result.current.usingLkg).toBe(false);
    expect(result.current.diagnostics?.lastAttemptAt).toBeTruthy();
    expect(result.current.diagnostics?.lastSyncAt).toBeTruthy();
    expect(result.current.diagnostics?.clockOffsetMs).toBe(-5_000);
    expect(result.current.diagnostics?.validationError).toBeNull();
  });

  it("marks a retained valid snapshot as LKG when a later HTTP 200 feed is invalid", async () => {
    const initialFeed = cloneFeed();
    seedLkg(initialFeed);

    const freshFeed = cloneFeed();
    freshFeed.snapshotRevision = "d".repeat(64);
    freshFeed.generatedAt = "2026-09-15T18:00:00.000Z";

    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(JSON.stringify(freshFeed), {
          status: 200,
          headers: {
            "content-type": "application/json",
            etag: '"fresh-before-invalid"',
            date: SERVER_DATE,
          },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ schemaVersion: 2 }), {
          status: 200,
          headers: {
            "content-type": "application/json",
            date: SERVER_DATE,
          },
        }),
      );
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useDisplayRuntime());
    await flushEffects();

    expect(result.current.feed?.snapshotRevision).toBe(freshFeed.snapshotRevision);
    expect(result.current.usingLkg).toBe(false);
    const syncedAt = result.current.diagnostics?.lastSyncAt;

    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000);
    });

    expect(result.current.feed?.snapshotRevision).toBe(freshFeed.snapshotRevision);
    expect(loadLkg()?.snapshot.snapshotRevision).toBe(freshFeed.snapshotRevision);
    expect(result.current.usingLkg).toBe(true);
    expect(result.current.diagnostics?.lastSyncAt).toBe(syncedAt);
    expect(result.current.diagnostics?.validationError).toMatch(/validation/i);
  });

  it("ignores an older production refresh that completes after a newer accepted snapshot", async () => {
    const initialFeed = cloneFeed();
    seedLkg(initialFeed, '"initial"');

    const staleFeed = cloneFeed();
    staleFeed.snapshotRevision = "b".repeat(64);
    staleFeed.generatedAt = "2026-09-15T18:00:01.000Z";

    const freshFeed = cloneFeed();
    freshFeed.snapshotRevision = "c".repeat(64);
    freshFeed.generatedAt = "2026-09-15T18:00:02.000Z";

    const olderRequest = deferred<Response>();
    const newerRequest = deferred<Response>();
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockImplementationOnce(() => olderRequest.promise)
      .mockImplementationOnce(() => newerRequest.promise);
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useDisplayRuntime());
    await flushEffects();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await act(async () => {
      window.dispatchEvent(new Event("online"));
      await Promise.resolve();
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);

    await act(async () => {
      newerRequest.resolve(
        new Response(JSON.stringify(freshFeed), {
          status: 200,
          headers: {
            "content-type": "application/json",
            etag: '"fresh"',
            date: SERVER_DATE,
          },
        }),
      );
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(result.current.feed?.snapshotRevision).toBe(freshFeed.snapshotRevision);
    expect(loadLkg()?.snapshot.snapshotRevision).toBe(freshFeed.snapshotRevision);
    expect(loadLkg()?.etag).toBe('"fresh"');

    await act(async () => {
      olderRequest.resolve(
        new Response(JSON.stringify(staleFeed), {
          status: 200,
          headers: {
            "content-type": "application/json",
            etag: '"stale"',
            date: SERVER_DATE,
          },
        }),
      );
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(result.current.feed?.snapshotRevision).toBe(freshFeed.snapshotRevision);
    expect(loadLkg()?.snapshot.snapshotRevision).toBe(freshFeed.snapshotRevision);
    expect(loadLkg()?.etag).toBe('"fresh"');
  });

  it.each([
    ["normal", { titleAr: "الوضع الطبيعي", titleDe: "Normalbetrieb", messageAr: "اختبار", messageDe: "Test" }, "ANNOUNCEMENT"],
    ["special_display", { titleAr: "عرض خاص", titleDe: "Sonderanzeige", messageAr: "خاص", messageDe: "Spezial" }, "SPECIAL"],
    ["event", { titleAr: "فعالية", titleDe: "Veranstaltung", descriptionAr: "وصف", descriptionDe: "Beschreibung", locationAr: "قاعة", locationDe: "Saal", startsAt: "2026-09-15T18:30:00.000Z" }, "EVENT"],
    ["campaign", { titleAr: "حملة", titleDe: "Kampagne", descriptionAr: "تبرع", descriptionDe: "Spende", donationUrl: "https://example.invalid/test-donation" }, "CAMPAIGN"],
    ["azkar", { azkarId: "test-azkar", arabicText: "سُبْحَانَ اللَّهِ", germanText: "Gepriesen sei Allah" }, "AZKAR"],
    ["long_bilingual", { titleAr: "عنوان", titleDe: "Titel", messageAr: "نص عربي طويل", messageDe: "Langer deutscher Text" }, "ANNOUNCEMENT"],
  ] as const)(
    "builds a synthetic renderer view for %s Test Mode",
    async (scenario, payloadFields, expectedKind) => {
      const realFeed = cloneFeed();
      seedLkg(realFeed);
      vi.stubGlobal("fetch", vi.fn<typeof fetch>(() => new Promise(() => {})));
      testControl.current = {
        active: true,
        scenario,
        startedAt: "2026-09-15T18:00:00.000Z",
        expiresAt: "2026-09-15T18:15:00.000Z",
        publicAppUrl: "https://prayer.example/",
        payload: {
          scenario,
          id: `test-${scenario}`,
          ...payloadFields,
        },
      };

      const { result } = renderHook(() => useDisplayRuntime());

      expect(result.current.testMode).toBe(true);
      expect(result.current.state?.kind).toBe("NORMAL");
      expect(result.current.content).not.toBeNull();
      expect(result.current.normalSlide?.kind).toBe(expectedKind);
      expect(loadLkg()?.snapshot.snapshotRevision).toBe(realFeed.snapshotRevision);
    },
  );

  it("builds a campaign-without-QR synthetic renderer view", () => {
    const realFeed = cloneFeed();
    seedLkg(realFeed);
    vi.stubGlobal("fetch", vi.fn<typeof fetch>(() => new Promise(() => {})));
    testControl.current = {
      active: true,
      scenario: "campaign_without_qr",
      startedAt: "2026-09-15T18:00:00.000Z",
      expiresAt: "2026-09-15T18:15:00.000Z",
      publicAppUrl: null,
      payload: {
        scenario: "campaign_without_qr",
        id: "test-campaign-without-qr",
        titleAr: "حملة بلا رمز",
        titleDe: "Kampagne ohne QR",
        descriptionAr: "تبرع تجريبي",
        descriptionDe: "Testspende",
      },
    };

    const { result } = renderHook(() => useDisplayRuntime());

    expect(result.current.testMode).toBe(true);
    expect(result.current.normalSlide).toEqual({
      kind: "CAMPAIGN",
      itemId: "test-campaign-without-qr",
    });
    expect(result.current.content?.campaigns).toHaveLength(1);
    expect(result.current.content?.campaigns[0]?.donationUrl).toBeNull();
  });

  it.each([
    ["friday_first_countdown", 0, "FRIDAY_MODE"],
    ["friday_next_countdown", 1, "FRIDAY_MODE"],
    ["jumuah_now", 1, "JUMUAH_NOW"],
  ] as const)(
    "preserves the %s synthetic Jumuah service identity",
    (scenario, serviceIndex, expectedKind) => {
      const realFeed = cloneFeed();
      seedLkg(realFeed);
      vi.stubGlobal("fetch", vi.fn<typeof fetch>(() => new Promise(() => {})));
      testControl.current = {
        active: true,
        scenario,
        startedAt: "2026-09-15T18:00:00.000Z",
        expiresAt: "2026-09-15T18:15:00.000Z",
        publicAppUrl: "https://prayer.example/",
        payload: {
          scenario,
          id: `test-${scenario}`,
          prayer: "dhuhr",
          targetAt:
            scenario === "jumuah_now" ? undefined : "2026-09-15T18:10:00.000Z",
          serviceIndex,
        },
      };

      const { result } = renderHook(() => useDisplayRuntime());

      expect(result.current.state).toMatchObject({
        kind: expectedKind,
        serviceIndex,
      });
    },
  );

  it("builds synthetic urgent content and suppresses production urgent items", () => {
    const realFeed = cloneFeed();
    seedLkg(realFeed);
    vi.stubGlobal("fetch", vi.fn<typeof fetch>(() => new Promise(() => {})));
    testControl.current = {
      active: true,
      scenario: "urgent",
      startedAt: "2026-09-15T18:00:00.000Z",
      expiresAt: "2026-09-15T18:15:00.000Z",
      publicAppUrl: "https://prayer.example/",
      payload: {
        scenario: "urgent",
        id: "test-urgent",
        titleAr: "تنبيه تجريبي",
        titleDe: "Testwarnung",
        messageAr: "رسالة تجريبية",
        messageDe: "Testmeldung",
      },
    };

    const { result } = renderHook(() => useDisplayRuntime());

    expect(result.current.urgent).toHaveLength(1);
    expect(result.current.urgent[0]?.id).toBe("test-urgent");
    expect(result.current.urgent.some((item) => item.id === realFeed.announcements[0]?.id)).toBe(false);
  });

  it("forces synthetic offline operational flags without changing the real LKG", async () => {
    const realFeed = cloneFeed();
    seedLkg(realFeed);
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>().mockResolvedValue(
        new Response(null, { status: 304, headers: { date: SERVER_DATE } }),
      ),
    );
    testControl.current = {
      active: true,
      scenario: "offline",
      startedAt: "2026-09-15T18:00:00.000Z",
      expiresAt: "2026-09-15T18:15:00.000Z",
      publicAppUrl: "https://prayer.example/",
      payload: {
        scenario: "offline",
        id: "test-offline",
        titleAr: "وضع عدم الاتصال",
        titleDe: "Offlinemodus",
        messageAr: "اختبار",
        messageDe: "Test",
      },
    };

    const { result } = renderHook(() => useDisplayRuntime());
    await flushEffects();

    expect(result.current.testMode).toBe(true);
    expect(result.current.networkAvailable).toBe(false);
    expect(result.current.usingLkg).toBe(true);
    expect(result.current.content).not.toBeNull();
    expect(result.current.normalSlide?.kind).toBe("ANNOUNCEMENT");
    expect(loadLkg()?.snapshot.snapshotRevision).toBe(realFeed.snapshotRevision);
  });

  it("applies test override without persisting it and returns to fresh real state", async () => {
    const realFeed = cloneFeed();
    seedLkg(realFeed);
    vi.stubGlobal("fetch", vi.fn<typeof fetch>(() => new Promise(() => {})));
    testControl.current = {
      active: true,
      scenario: "iqama_now",
      startedAt: "2026-09-15T18:00:00.000Z",
      expiresAt: "2026-09-15T18:15:00.000Z",
      publicAppUrl: "https://prayer.example/",
      payload: { scenario: "iqama_now", id: "test-iqama", prayer: "asr" },
    };

    const { result, rerender } = renderHook(() => useDisplayRuntime());
    await flushEffects();
    expect(result.current.testMode).toBe(true);
    expect(result.current.state?.kind).toBe("IQAMA_NOW");
    expect(result.current.urgent).toEqual([]);
    expect(result.current.publicAppUrl).toBe("https://prayer.example/");
    expect(loadLkg()?.snapshot.snapshotRevision).toBe(realFeed.snapshotRevision);

    testControl.current = { active: false };
    rerender();
    expect(result.current.testMode).toBe(false);
    expect(result.current.state).toEqual(resolveDisplayState(realFeed, result.current.logicalNow));
  });

  it("does not use periodic hard reload as a recovery mechanism", () => {
    const source = readFileSync(
      path.join(process.cwd(), "lib/runtime/use-display-runtime.ts"),
      "utf8",
    );
    expect(source).not.toMatch(/location\.reload|window\.reload/);
  });
});
