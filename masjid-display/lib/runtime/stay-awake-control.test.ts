// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { installScreenWakeLock, STAY_AWAKE_STORAGE_KEY, MANUAL_WAKE_RECHECK_MS } from "./screen-wake-lock";

const initialWakeLock = Object.getOwnPropertyDescriptor(navigator, "wakeLock");
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  window.localStorage.removeItem(STAY_AWAKE_STORAGE_KEY);
  if (initialWakeLock) Object.defineProperty(navigator, "wakeLock", initialWakeLock);
  else Reflect.deleteProperty(navigator, "wakeLock");
});

const visible = () => vi.spyOn(document, "visibilityState", "get").mockReturnValue("visible");

describe("user-initiated Fire Stick Stay Awake", () => {
  it("retries browser Wake Lock directly from the button activation after an automatic denial", async () => {
    visible();
    const sentinel = { released: false, release: vi.fn().mockResolvedValue(undefined), addEventListener: vi.fn() };
    const request = vi.fn().mockRejectedValueOnce(new DOMException("needs gesture", "NotAllowedError")).mockResolvedValueOnce(sentinel);
    Object.defineProperty(navigator, "wakeLock", { configurable: true, value: { request } });
    const status = vi.fn();
    const handle = installScreenWakeLock(status);
    await Promise.resolve(); await Promise.resolve();
    expect(status).toHaveBeenCalledWith("denied");
    expect(handle.isStayAwakeRequested()).toBe(false);

    handle.requestStayAwake();
    expect(request).toHaveBeenCalledTimes(2); // synchronous direct gesture
    await Promise.resolve(); await Promise.resolve();
    expect(status).toHaveBeenLastCalledWith("active");
    expect(handle.isStayAwakeRequested()).toBe(true);
    expect(window.localStorage.getItem(STAY_AWAKE_STORAGE_KEY)).toBe("on");
    handle();
  });

  it("rechecks a released lock every minute while Stay Awake is selected", async () => {
    vi.useFakeTimers();
    visible();
    const first = { released: false, release: vi.fn().mockResolvedValue(undefined), addEventListener: vi.fn() };
    const second = { released: false, release: vi.fn().mockResolvedValue(undefined), addEventListener: vi.fn() };
    const request = vi.fn().mockResolvedValueOnce(first).mockResolvedValueOnce(second);
    Object.defineProperty(navigator, "wakeLock", { configurable: true, value: { request } });
    const handle = installScreenWakeLock();
    await Promise.resolve(); await Promise.resolve();
    handle.requestStayAwake();
    expect(MANUAL_WAKE_RECHECK_MS).toBe(60_000);
    first.released = true;
    await vi.advanceTimersByTimeAsync(MANUAL_WAKE_RECHECK_MS);
    expect(request).toHaveBeenCalledTimes(2);
    handle();
  });

  it("OFF releases the platform lock and never reacquires after visibility/interval", async () => {
    vi.useFakeTimers();
    visible();
    const sentinel = { released: false, release: vi.fn().mockResolvedValue(undefined), addEventListener: vi.fn() };
    const request = vi.fn().mockResolvedValue(sentinel);
    Object.defineProperty(navigator, "wakeLock", { configurable: true, value: { request } });
    const status = vi.fn();
    const handle = installScreenWakeLock(status);
    await Promise.resolve(); await Promise.resolve();
    handle.requestStayAwake();
    handle.stopStayAwake();
    expect(status).toHaveBeenLastCalledWith("off");
    expect(sentinel.release).toHaveBeenCalledTimes(1);
    expect(handle.isStayAwakeRequested()).toBe(false);
    expect(window.localStorage.getItem(STAY_AWAKE_STORAGE_KEY)).toBe("off");
    document.dispatchEvent(new Event("visibilitychange"));
    await vi.advanceTimersByTimeAsync(480_000);
    expect(request).toHaveBeenCalledTimes(1);
    handle();
  });

  it("remembers ON after a page reload, and reports unsupported rather than claiming success on Silk", async () => {
    visible();
    window.localStorage.setItem(STAY_AWAKE_STORAGE_KEY, "on");
    Reflect.deleteProperty(navigator, "wakeLock");
    const status = vi.fn();
    const handle = installScreenWakeLock(status);
    expect(handle.isStayAwakeRequested()).toBe(true);
    expect(status).toHaveBeenLastCalledWith("unsupported");
    handle.requestStayAwake();
    expect(status).toHaveBeenLastCalledWith("unsupported");
    handle();
  });

  it("releases a delayed browser result if disabled before acquisition resolves", async () => {
    visible();
    let grant!: (value: WakeLockSentinel) => void;
    const request = vi.fn().mockImplementation(() => new Promise<WakeLockSentinel>((resolve) => { grant = resolve; }));
    Object.defineProperty(navigator, "wakeLock", { configurable: true, value: { request } });
    const status = vi.fn();
    const handle = installScreenWakeLock(status);
    handle.requestStayAwake();
    handle.stopStayAwake();
    const sentinel = { released: false, release: vi.fn().mockResolvedValue(undefined), addEventListener: vi.fn() };
    grant(sentinel as unknown as WakeLockSentinel);
    await Promise.resolve(); await Promise.resolve();
    expect(sentinel.release).toHaveBeenCalledTimes(1);
    expect(status).toHaveBeenLastCalledWith("off");
    handle();
  });
});
