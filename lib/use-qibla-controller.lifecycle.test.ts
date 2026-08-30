import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getMagneticDeclination } from "@/lib/qibla-magnetic";
import { useQiblaController } from "@/lib/use-qibla-controller";

vi.mock("@/lib/qibla-magnetic", () => ({
  getMagneticDeclination: vi.fn(),
}));

const mockedDeclination = vi.mocked(getMagneticDeclination);

function installGeolocation() {
  Object.defineProperty(navigator, "geolocation", {
    configurable: true,
    value: {
      getCurrentPosition: vi.fn((success: PositionCallback) => {
        success({
          coords: {
            latitude: 48.8409,
            longitude: 12.9607,
            accuracy: 10,
            altitude: null,
            altitudeAccuracy: null,
            heading: null,
            speed: null,
            toJSON: () => ({}),
          },
          timestamp: Date.now(),
          toJSON: () => ({}),
        } as GeolocationPosition);
      }),
    },
  });
}

function installOrientationPermission(result: Promise<"granted" | "denied"> = Promise.resolve("granted")) {
  const requestPermission = vi.fn(() => result);
  class MockOrientationEvent extends Event {}
  Object.defineProperty(MockOrientationEvent, "requestPermission", { value: requestPermission });
  Object.defineProperty(window, "DeviceOrientationEvent", {
    configurable: true,
    value: MockOrientationEvent,
  });
  return requestPermission;
}

function orientationEvent(type: string, values: Record<string, unknown>) {
  const event = new Event(type);
  for (const [key, value] of Object.entries(values)) {
    Object.defineProperty(event, key, { configurable: true, value });
  }
  return event;
}

function setVisibility(value: DocumentVisibilityState) {
  Object.defineProperty(document, "visibilityState", { configurable: true, value });
}

describe("useQiblaController lifecycle reliability", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    sessionStorage.clear();
    setVisibility("visible");
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: vi.fn(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() })),
    });
    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: true,
      json: async () => ({ ok: true, city: "Deggendorf", country: "Germany" }),
    })));
    mockedDeclination.mockResolvedValue(4.5);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("keeps the sensor acquisition timeout armed while magnetic correction is still pending", async () => {
    vi.useFakeTimers();
    installGeolocation();
    installOrientationPermission();
    mockedDeclination.mockImplementation(() => new Promise(() => {}));

    const { result } = renderHook(() => useQiblaController());
    act(() => result.current.findQibla());
    await act(async () => Promise.resolve());
    expect(result.current.state.mode).toBe("bearing-ready");
    await act(async () => result.current.enableLiveCompass());

    act(() => window.dispatchEvent(orientationEvent("deviceorientation", {
      webkitCompassHeading: 100,
      webkitCompassAccuracy: 5,
      beta: 0,
      gamma: 0,
    })));

    act(() => vi.advanceTimersByTime(5_001));
    expect(result.current.state.mode).toBe("bearing-only");
    expect(result.current.state.liveBlockReason).toBe("sensor-timeout");
  });

  it("removes orientation listeners when the page is hidden and resumes only with a fresh heading", async () => {
    installGeolocation();
    installOrientationPermission();
    const addSpy = vi.spyOn(window, "addEventListener");
    const removeSpy = vi.spyOn(window, "removeEventListener");

    const { result } = renderHook(() => useQiblaController());
    act(() => result.current.findQibla());
    await waitFor(() => expect(result.current.state.mode).toBe("bearing-ready"));
    await act(async () => result.current.enableLiveCompass());
    act(() => window.dispatchEvent(orientationEvent("deviceorientationabsolute", {
      alpha: 228, beta: 0, gamma: 0, absolute: true,
    })));
    expect(["live", "aligned"]).toContain(result.current.state.mode);

    setVisibility("hidden");
    act(() => document.dispatchEvent(new Event("visibilitychange")));
    expect(removeSpy.mock.calls.some(([type]) => type === "deviceorientation")).toBe(true);

    setVisibility("visible");
    act(() => document.dispatchEvent(new Event("visibilitychange")));
    expect(result.current.state.mode).toBe("bearing-only");
    expect(result.current.state.liveBlockReason).toBe("sensor-timeout");
    expect(addSpy.mock.calls.filter(([type]) => type === "deviceorientation").length).toBeGreaterThanOrEqual(2);

    act(() => window.dispatchEvent(orientationEvent("deviceorientationabsolute", {
      alpha: 228, beta: 0, gamma: 0, absolute: true,
    })));
    expect(["live", "aligned"]).toContain(result.current.state.mode);
  });

  it("detaches orientation listeners on pagehide even while visibility is still visible", async () => {
    installGeolocation();
    installOrientationPermission();
    const removeSpy = vi.spyOn(window, "removeEventListener");

    const { result } = renderHook(() => useQiblaController());
    act(() => result.current.findQibla());
    await waitFor(() => expect(result.current.state.mode).toBe("bearing-ready"));
    await act(async () => result.current.enableLiveCompass());

    expect(document.visibilityState).toBe("visible");
    act(() => window.dispatchEvent(new PageTransitionEvent("pagehide")));

    const removedTypes = removeSpy.mock.calls.map(([type]) => type);
    expect(removedTypes).toContain("deviceorientation");
    expect(removedTypes).toContain("deviceorientationabsolute");
  });

  it("does not let a stale permission promise attach sensors after unmount", async () => {
    installGeolocation();
    let resolvePermission!: (value: "granted" | "denied") => void;
    const permission = new Promise<"granted" | "denied">((resolve) => {
      resolvePermission = resolve;
    });
    installOrientationPermission(permission);
    const addSpy = vi.spyOn(window, "addEventListener");

    const { result, unmount } = renderHook(() => useQiblaController());
    act(() => result.current.findQibla());
    await waitFor(() => expect(result.current.state.mode).toBe("bearing-ready"));
    let pending!: Promise<void>;
    act(() => {
      pending = result.current.enableLiveCompass();
    });
    const beforeUnmount = addSpy.mock.calls.filter(([type]) => type === "deviceorientation").length;
    unmount();
    resolvePermission("granted");
    await act(async () => pending);

    expect(addSpy.mock.calls.filter(([type]) => type === "deviceorientation").length).toBe(beforeUnmount);
  });
});
