import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/qibla-magnetic", () => ({
  getMagneticDeclination: vi.fn(async () => 5),
}));

import { roundQiblaCoordinates, useQiblaController } from "@/lib/use-qibla-controller";

function installGeolocation(latitude = 48.8409, longitude = 12.9607) {
  const getCurrentPosition = vi.fn((success: PositionCallback) => {
    success({
      coords: {
        latitude,
        longitude,
        accuracy: 12,
        altitude: null,
        altitudeAccuracy: null,
        heading: null,
        speed: null,
      },
      timestamp: Date.now(),
    } as GeolocationPosition);
  });
  Object.defineProperty(navigator, "geolocation", {
    configurable: true,
    value: { getCurrentPosition },
  });
  return getCurrentPosition;
}

function installOrientationPermission(permission: "granted" | "denied" = "granted") {
  const requestPermission = vi.fn(async (_absolute?: boolean) => permission);
  class MockOrientationEvent extends Event {}
  Object.defineProperty(MockOrientationEvent, "requestPermission", { value: requestPermission });
  Object.defineProperty(window, "DeviceOrientationEvent", {
    configurable: true,
    value: MockOrientationEvent,
  });
  return requestPermission;
}

function installDeferredOrientationPermission() {
  let resolve!: (permission: "granted" | "denied") => void;
  const pending = new Promise<"granted" | "denied">((next) => {
    resolve = next;
  });
  const requestPermission = vi.fn(() => pending);
  class MockOrientationEvent extends Event {}
  Object.defineProperty(MockOrientationEvent, "requestPermission", { value: requestPermission });
  Object.defineProperty(window, "DeviceOrientationEvent", {
    configurable: true,
    value: MockOrientationEvent,
  });
  return { requestPermission, resolve };
}

function orientationEvent(type: string, values: Record<string, unknown>) {
  const event = new Event(type);
  for (const [key, value] of Object.entries(values)) {
    Object.defineProperty(event, key, { configurable: true, value });
  }
  return event;
}

function setVisibility(value: "visible" | "hidden") {
  Object.defineProperty(document, "visibilityState", {
    configurable: true,
    value,
  });
}

describe("useQiblaController", () => {
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
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    setVisibility("visible");
  });

  it("rounds coordinates before the reverse-geocode network boundary", () => {
    expect(roundQiblaCoordinates(48.8409123, 12.9607123)).toEqual({
      latitude: 48.841,
      longitude: 12.961,
    });
  });

  it("does not request location before explicit user action", () => {
    const getCurrentPosition = installGeolocation();
    renderHook(() => useQiblaController());
    expect(getCurrentPosition).not.toHaveBeenCalled();
  });

  it("keeps Qibla bearing usable when reverse geocoding fails", async () => {
    installGeolocation();
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("offline"); }));
    const { result } = renderHook(() => useQiblaController());
    act(() => result.current.findQibla());
    await waitFor(() => expect(result.current.state.mode).toBe("bearing-ready"));
    expect(result.current.state.bearing).toBeCloseTo(132.45, 1);
  });

  it("sends only coarse coordinates to reverse geocoding", async () => {
    installGeolocation(48.8409123, 12.9607123);
    const fetchMock = vi.mocked(fetch);
    const { result } = renderHook(() => useQiblaController());
    act(() => result.current.findQibla());
    await waitFor(() => expect(result.current.state.mode).toBe("bearing-ready"));
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain("lat=48.841");
    expect(url).toContain("lon=12.961");
    expect(url).not.toContain("48.8409123");
  });

  it("requests absolute orientation permission from the explicit compass action", async () => {
    installGeolocation();
    const requestPermission = installOrientationPermission();
    const { result } = renderHook(() => useQiblaController());
    act(() => result.current.findQibla());
    await waitFor(() => expect(result.current.state.mode).toBe("bearing-ready"));
    await act(async () => result.current.enableLiveCompass());
    expect(requestPermission).toHaveBeenCalledWith(true);
  });

  it("keeps bearing-only usable when compass permission is denied", async () => {
    installGeolocation();
    installOrientationPermission("denied");
    const { result } = renderHook(() => useQiblaController());
    act(() => result.current.findQibla());
    await waitFor(() => expect(result.current.state.mode).toBe("bearing-ready"));
    await act(async () => result.current.enableLiveCompass());
    expect(result.current.state.mode).toBe("bearing-only");
    expect(result.current.state.liveBlockReason).toBe("permission-denied");
    expect(result.current.state.bearing).not.toBeNull();
  });

  it("accepts a standard absolute event but never a relative event", async () => {
    installGeolocation();
    installOrientationPermission();
    const { result } = renderHook(() => useQiblaController());
    act(() => result.current.findQibla());
    await waitFor(() => expect(result.current.state.mode).toBe("bearing-ready"));
    await act(async () => result.current.enableLiveCompass());

    act(() => window.dispatchEvent(orientationEvent("deviceorientation", {
      alpha: 20, beta: 0, gamma: 0, absolute: false,
    })));
    expect(result.current.state.mode).toBe("bearing-only");
    expect(result.current.state.liveBlockReason).toBe("relative-heading");

    act(() => window.dispatchEvent(orientationEvent("deviceorientationabsolute", {
      alpha: 228, beta: 0, gamma: 0, absolute: true,
    })));
    expect(["live", "aligned"]).toContain(result.current.state.mode);
    expect(result.current.headingSource).toBe("standard-absolute");
  });

  it("corrects a valid WebKit magnetic heading before activating live mode", async () => {
    installGeolocation();
    installOrientationPermission();
    const { result } = renderHook(() => useQiblaController());
    act(() => result.current.findQibla());
    await waitFor(() => expect(result.current.state.mode).toBe("bearing-ready"));
    await waitFor(() => Promise.resolve());
    await act(async () => result.current.enableLiveCompass());

    act(() => window.dispatchEvent(orientationEvent("deviceorientation", {
      webkitCompassHeading: 100,
      webkitCompassAccuracy: 5,
      beta: 0,
      gamma: 0,
    })));

    expect(result.current.headingSource).toBe("webkit-magnetic");
    expect(result.current.state.trueHeading).toBeCloseTo(105, 6);
    expect(result.current.state.mode).toBe("live");
  });

  it("rejects negative WebKit headings and bad accuracy", async () => {
    installGeolocation();
    installOrientationPermission();
    const { result } = renderHook(() => useQiblaController());
    act(() => result.current.findQibla());
    await waitFor(() => expect(result.current.state.mode).toBe("bearing-ready"));
    await act(async () => result.current.enableLiveCompass());

    act(() => window.dispatchEvent(orientationEvent("deviceorientation", {
      webkitCompassHeading: -1, webkitCompassAccuracy: 5, beta: 0, gamma: 0,
    })));
    expect(result.current.state.liveBlockReason).toBe("invalid-heading");

    act(() => window.dispatchEvent(orientationEvent("deviceorientation", {
      webkitCompassHeading: 100, webkitCompassAccuracy: -1, beta: 0, gamma: 0,
    })));
    expect(result.current.state.liveBlockReason).toBe("invalid-heading");

    act(() => window.dispatchEvent(orientationEvent("deviceorientation", {
      webkitCompassHeading: 100, webkitCompassAccuracy: 26, beta: 0, gamma: 0,
    })));
    expect(result.current.state.liveBlockReason).toBe("calibration-required");
  });

  it("pauses live guidance when tilted and recovers on a flat trusted sample", async () => {
    installGeolocation();
    installOrientationPermission();
    const { result } = renderHook(() => useQiblaController());
    act(() => result.current.findQibla());
    await waitFor(() => expect(result.current.state.mode).toBe("bearing-ready"));
    await act(async () => result.current.enableLiveCompass());

    act(() => window.dispatchEvent(orientationEvent("deviceorientationabsolute", {
      alpha: 228, beta: 36, gamma: 0, absolute: true,
    })));
    expect(result.current.state.liveBlockReason).toBe("tilted");

    act(() => window.dispatchEvent(orientationEvent("deviceorientationabsolute", {
      alpha: 228, beta: 0, gamma: 0, absolute: true,
    })));
    expect(["live", "aligned"]).toContain(result.current.state.mode);
  });

  it("pauses live guidance in landscape and resumes only after a fresh portrait sample", async () => {
    installGeolocation();
    installOrientationPermission();
    let portrait = true;
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: vi.fn(() => ({ matches: portrait, addEventListener: vi.fn(), removeEventListener: vi.fn() })),
    });
    const { result } = renderHook(() => useQiblaController());
    act(() => result.current.findQibla());
    await waitFor(() => expect(result.current.state.mode).toBe("bearing-ready"));
    await act(async () => result.current.enableLiveCompass());

    portrait = false;
    act(() => window.dispatchEvent(orientationEvent("deviceorientationabsolute", {
      alpha: 228, beta: 0, gamma: 0, absolute: true,
    })));
    expect(result.current.state.liveBlockReason).toBe("landscape");

    portrait = true;
    act(() => window.dispatchEvent(orientationEvent("deviceorientationabsolute", {
      alpha: 228, beta: 0, gamma: 0, absolute: true,
    })));
    expect(["live", "aligned"]).toContain(result.current.state.mode);
  });

  it("falls back to bearing-only after the finite sensor acquisition timeout", async () => {
    vi.useFakeTimers();
    installGeolocation();
    installOrientationPermission();
    const { result } = renderHook(() => useQiblaController());
    act(() => result.current.findQibla());
    expect(result.current.state.mode).toBe("bearing-ready");
    await act(async () => result.current.enableLiveCompass());
    act(() => vi.advanceTimersByTime(5001));
    expect(result.current.state.mode).toBe("bearing-only");
    expect(result.current.state.liveBlockReason).toBe("sensor-timeout");
  });

  it("stops processing while hidden and requires a fresh trustworthy sample on resume", async () => {
    installGeolocation();
    installOrientationPermission();
    const { result } = renderHook(() => useQiblaController());
    act(() => result.current.findQibla());
    await waitFor(() => expect(result.current.state.mode).toBe("bearing-ready"));
    await act(async () => result.current.enableLiveCompass());
    act(() => window.dispatchEvent(orientationEvent("deviceorientationabsolute", {
      alpha: 228, beta: 0, gamma: 0, absolute: true,
    })));
    const headingBeforeHide = result.current.state.trueHeading;

    setVisibility("hidden");
    act(() => document.dispatchEvent(new Event("visibilitychange")));
    act(() => window.dispatchEvent(orientationEvent("deviceorientationabsolute", {
      alpha: 90, beta: 0, gamma: 0, absolute: true,
    })));
    expect(result.current.state.trueHeading).toBe(headingBeforeHide);

    setVisibility("visible");
    act(() => document.dispatchEvent(new Event("visibilitychange")));
    expect(result.current.state.mode).toBe("bearing-only");
    expect(result.current.state.liveBlockReason).toBe("sensor-timeout");

    act(() => window.dispatchEvent(orientationEvent("deviceorientationabsolute", {
      alpha: 228, beta: 0, gamma: 0, absolute: true,
    })));
    expect(["live", "aligned"]).toContain(result.current.state.mode);
  });

  it("does not allow a stale permission promise to attach sensors after unmount", async () => {
    installGeolocation();
    const deferred = installDeferredOrientationPermission();
    const addSpy = vi.spyOn(window, "addEventListener");
    const { result, unmount } = renderHook(() => useQiblaController());
    act(() => result.current.findQibla());
    await waitFor(() => expect(result.current.state.mode).toBe("bearing-ready"));
    let permissionTask!: Promise<void>;
    act(() => {
      permissionTask = result.current.enableLiveCompass();
    });
    expect(deferred.requestPermission).toHaveBeenCalledWith(true);
    unmount();
    deferred.resolve("granted");
    await act(async () => permissionTask);

    const orientationAdds = addSpy.mock.calls.filter(([type]) =>
      type === "deviceorientation" || type === "deviceorientationabsolute",
    );
    expect(orientationAdds).toHaveLength(0);
  });

  it("removes active orientation listeners on unmount", async () => {
    installGeolocation();
    installOrientationPermission();
    const removeSpy = vi.spyOn(window, "removeEventListener");
    const { result, unmount } = renderHook(() => useQiblaController());
    act(() => result.current.findQibla());
    await waitFor(() => expect(result.current.state.mode).toBe("bearing-ready"));
    await act(async () => result.current.enableLiveCompass());
    unmount();

    const removedTypes = removeSpy.mock.calls.map(([type]) => type);
    expect(removedTypes).toContain("deviceorientation");
    expect(removedTypes).toContain("deviceorientationabsolute");
  });
});
