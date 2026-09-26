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

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
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

  it("accepts an active Test Mode directive when the Prayerapp QR URL is unavailable", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>().mockResolvedValue(
        new Response(JSON.stringify({ ...ACTIVE, publicAppUrl: null }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      ),
    );

    const { result } = renderHook(() => useTestControl(new Date(Date.now())));
    await flushEffects();

    expect(result.current).toMatchObject({
      active: true,
      scenario: "iqama_now",
      publicAppUrl: null,
    });
  });

  it("accepts the campaign-without-QR Test Control scenario", async () => {
    const directive = {
      ...ACTIVE,
      scenario: "campaign_without_qr",
      payload: {
        scenario: "campaign_without_qr",
        id: "test-campaign-without-qr",
        titleAr: "حملة بلا رمز",
        titleDe: "Kampagne ohne QR",
        descriptionAr: "اختبار",
        descriptionDe: "Test",
      },
    };

    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>().mockResolvedValue(
        new Response(JSON.stringify(directive), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      ),
    );

    const { result } = renderHook(() => useTestControl(new Date(Date.now())));
    await flushEffects();

    expect(result.current).toMatchObject({
      active: true,
      scenario: "campaign_without_qr",
      payload: { id: "test-campaign-without-qr" },
    });
  });

  it("accepts slow successful activation, scenario switch, and stop responses even after newer polls start", async () => {
    const activation = deferred<Response>();
    const scenarioSwitch = deferred<Response>();
    const stop = deferred<Response>();
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockImplementationOnce(() => activation.promise)
      .mockImplementationOnce(() => scenarioSwitch.promise)
      .mockImplementationOnce(() => stop.promise);
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useTestControl(new Date(Date.now())));
    await flushEffects();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2_500);
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);

    await act(async () => {
      activation.resolve(
        new Response(JSON.stringify(ACTIVE), {
          status: 200,
          headers: { "content-type": "application/json", date: "Tue, 15 Sep 2026 18:00:01 GMT" },
        }),
      );
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(result.current).toMatchObject({ active: true, scenario: "iqama_now" });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2_000);
    });
    expect(fetchMock).toHaveBeenCalledTimes(3);

    const switched = {
      ...ACTIVE,
      scenario: "friday_next_countdown",
      payload: {
        scenario: "friday_next_countdown",
        id: "test-friday-next",
        prayer: "dhuhr",
        targetAt: "2026-09-15T18:10:00.000Z",
        serviceIndex: 1,
      },
    } as const;

    await act(async () => {
      scenarioSwitch.resolve(
        new Response(JSON.stringify(switched), {
          status: 200,
          headers: { "content-type": "application/json", date: "Tue, 15 Sep 2026 18:00:03 GMT" },
        }),
      );
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(result.current).toMatchObject({
      active: true,
      scenario: "friday_next_countdown",
    });

    await act(async () => {
      stop.resolve(
        new Response(JSON.stringify({ active: false }), {
          status: 200,
          headers: { "content-type": "application/json", date: "Tue, 15 Sep 2026 18:00:05 GMT" },
        }),
      );
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(result.current).toEqual({ active: false });
  });

  it("ignores a stale active poll that resolves after a newer inactive response", async () => {
    const older = deferred<Response>();
    const newer = deferred<Response>();
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockImplementationOnce(() => older.promise)
      .mockImplementationOnce(() => newer.promise);
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useTestControl(new Date(Date.now())));
    await flushEffects();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2_000);
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);

    await act(async () => {
      newer.resolve(
        new Response(JSON.stringify({ active: false }), {
          status: 200,
          headers: { "content-type": "application/json", date: "Tue, 15 Sep 2026 18:00:02 GMT" },
        }),
      );
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(result.current).toEqual({ active: false });

    await act(async () => {
      older.resolve(
        new Response(JSON.stringify(ACTIVE), {
          status: 200,
          headers: { "content-type": "application/json", date: "Tue, 15 Sep 2026 18:00:00 GMT" },
        }),
      );
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(result.current).toEqual({ active: false });
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

  it("reports request start and response receipt to the logical clock callback", async () => {
    const observe = vi.fn();
    const response = deferred<Response>();
    vi.setSystemTime(new Date("2026-09-15T18:00:00.000Z"));
    vi.stubGlobal("fetch", vi.fn<typeof fetch>().mockImplementation(() => response.promise));

    renderHook(() => useTestControl(new Date(Date.now()), observe));
    await flushEffects();

    vi.setSystemTime(new Date("2026-09-15T18:00:04.000Z"));
    await act(async () => {
      response.resolve(
        new Response(JSON.stringify({ active: false }), {
          status: 200,
          headers: { "content-type": "application/json", date: "Tue, 15 Sep 2026 18:00:02 GMT" },
        }),
      );
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(observe).toHaveBeenCalledWith(
      Date.parse("2026-09-15T18:00:00.000Z"),
      Date.parse("2026-09-15T18:00:04.000Z"),
      "Tue, 15 Sep 2026 18:00:02 GMT",
    );
  });
});
