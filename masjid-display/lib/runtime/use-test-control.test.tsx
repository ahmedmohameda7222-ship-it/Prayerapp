import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useTestControl } from "./use-test-control";

const ACTIVE = {
  active: true,
  scenario: "iqama_now",
  startedAt: "2026-09-15T18:00:00.000Z",
  expiresAt: "2026-09-15T18:15:00.000Z",
  publicAppUrl: "https://prayer.example/",
  payload: {
    scenario: "iqama_now",
    id: "test-iqama",
    prayer: "asr",
    titleAr: "الإقامة الآن",
    titleDe: "Iqama jetzt",
    messageAr: "اختبار",
    messageDe: "Test",
  },
} as const;

async function flushEffects() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe("useTestControl", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-15T18:00:05.000Z"));
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("polls immediately and every two seconds, clearing on inactive", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(JSON.stringify(ACTIVE), {
          status: 200,
          headers: { "content-type": "application/json", date: "Tue, 15 Sep 2026 18:00:00 GMT" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ active: false }), {
          status: 200,
          headers: { "content-type": "application/json", date: "Tue, 15 Sep 2026 18:00:02 GMT" },
        }),
      );
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useTestControl(new Date(Date.now())));
    await flushEffects();
    expect(result.current).toMatchObject({ active: true, scenario: "iqama_now" });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2_000);
    });
    expect(result.current).toEqual({ active: false });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("expires an active override locally even when the next poll fails", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ ...ACTIVE, expiresAt: "2026-09-15T18:00:10.000Z" }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      )
      .mockRejectedValueOnce(new Error("offline"));
    vi.stubGlobal("fetch", fetchMock);

    const { result, rerender } = renderHook(({ now }) => useTestControl(now), {
      initialProps: { now: new Date("2026-09-15T18:00:05.000Z") },
    });
    await flushEffects();
    expect(result.current.active).toBe(true);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2_000);
    });
    rerender({ now: new Date("2026-09-15T18:00:11.000Z") });
    expect(result.current).toEqual({ active: false });
  });

  it("reports a valid server Date signal to the logical clock callback", async () => {
    const observe = vi.fn();
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>().mockResolvedValue(
        new Response(JSON.stringify({ active: false }), {
          status: 200,
          headers: { "content-type": "application/json", date: "Tue, 15 Sep 2026 18:00:00 GMT" },
        }),
      ),
    );

    renderHook(() => useTestControl(new Date(Date.now()), observe));
    await flushEffects();
    expect(observe).toHaveBeenCalledWith(
      Date.parse("2026-09-15T18:00:05.000Z"),
      "Tue, 15 Sep 2026 18:00:00 GMT",
    );
  });
});
