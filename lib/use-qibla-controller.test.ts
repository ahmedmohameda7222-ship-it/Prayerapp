import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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
        toJSON: () => ({}),
      },
      timestamp: Date.now(),
      toJSON: () => ({}),
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

function orientationEvent(type: string, values: Record<string, unknown>) {
  const event = new Event(type);
  for (const [key, value] of Object.entries(values)) {
    Object.defineProperty(event, key, { configurable: true, value });
  }
  return event;
}

describe("useQiblaController", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    sessionStorage.clear();
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
    vi.unstubAllGlobals();
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
});
