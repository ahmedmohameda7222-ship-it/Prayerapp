// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { installScreenWakeLock, SCREEN_WAKE_RECHECK_MS } from "./screen-wake-lock";

const original = Object.getOwnPropertyDescriptor(navigator, "wakeLock");

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  if (original) Object.defineProperty(navigator, "wakeLock", original);
  else Reflect.deleteProperty(navigator, "wakeLock");
});

describe("Fire TV screen wake lock (best effort)", () => {
  it("does not pretend to synthesize user activity on browsers without Wake Lock", () => {
    Reflect.deleteProperty(navigator, "wakeLock");
    const onStatus = vi.fn();
    const stop = installScreenWakeLock(onStatus);
    expect(onStatus).toHaveBeenCalledWith("unsupported");
    expect(SCREEN_WAKE_RECHECK_MS).toBe(240_000);
    expect(stop).toBeTypeOf("function");
    expect(() => stop()).not.toThrow();
  });

  it("acquires only while visible, checks again in four minutes and cleans up", async () => {
    vi.useFakeTimers();
    vi.spyOn(document, "visibilityState", "get").mockReturnValue("visible");
    const release = vi.fn().mockResolvedValue(undefined);
    const sentinel = { released: false, release: vi.fn().mockResolvedValue(undefined), addEventListener: vi.fn() };
    const second = { released: false, release, addEventListener: vi.fn() };
    const request = vi.fn().mockResolvedValueOnce(sentinel).mockResolvedValueOnce(second);
    Object.defineProperty(navigator, "wakeLock", { configurable: true, value: { request } });
    const onStatus = vi.fn();
    const stop = installScreenWakeLock(onStatus);
    await Promise.resolve(); await Promise.resolve();
    expect(request).toHaveBeenCalledExactlyOnceWith("screen");
    expect(onStatus).toHaveBeenCalledWith("active");

    await vi.advanceTimersByTimeAsync(240_000);
    expect(request).toHaveBeenCalledTimes(1); // existing held lock is reused

    sentinel.released = true;
    await vi.advanceTimersByTimeAsync(240_000);
    expect(request).toHaveBeenCalledTimes(2);
    stop();
    expect(release).toHaveBeenCalledTimes(1);
  });

  it("reacquires on returning visible but never while the document is hidden", async () => {
    let visible = false;
    vi.spyOn(document, "visibilityState", "get").mockImplementation(() => visible ? "visible" : "hidden");
    const sentinel = { released: false, release: vi.fn().mockResolvedValue(undefined), addEventListener: vi.fn() };
    const request = vi.fn().mockResolvedValue(sentinel);
    Object.defineProperty(navigator, "wakeLock", { configurable: true, value: { request } });
    const stop = installScreenWakeLock();
    await Promise.resolve();
    expect(request).not.toHaveBeenCalled();
    visible = true;
    document.dispatchEvent(new Event("visibilitychange"));
    await Promise.resolve();
    expect(request).toHaveBeenCalledExactlyOnceWith("screen");
    stop();
  });

  it("fails closed if platform rejects a request without crashing the TV", async () => {
    vi.spyOn(document, "visibilityState", "get").mockReturnValue("visible");
    const request = vi.fn().mockRejectedValue(new DOMException("Not allowed", "NotAllowedError"));
    Object.defineProperty(navigator, "wakeLock", { configurable: true, value: { request } });
    const onStatus = vi.fn();
    const stop = installScreenWakeLock(onStatus);
    await Promise.resolve(); await Promise.resolve();
    expect(onStatus).toHaveBeenCalledWith("denied");
    expect(request).toHaveBeenCalledOnce();
    expect(() => stop()).not.toThrow();
  });
});
