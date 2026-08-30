import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useQiblaController } from "@/lib/use-qibla-controller";

vi.mock("@/lib/qibla-magnetic", () => ({
  getMagneticDeclination: vi.fn(async () => 5),
}));

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
          },
          timestamp: Date.now(),
        } as GeolocationPosition);
      }),
    },
  });
}

function installOrientationPermission() {
  const requestPermission = vi.fn(async () => "granted" as const);
  class MockOrientationEvent extends Event {}
  Object.defineProperty(MockOrientationEvent, "requestPermission", { value: requestPermission });
  Object.defineProperty(window, "DeviceOrientationEvent", {
    configurable: true,
    value: MockOrientationEvent,
  });
}

function orientationEvent(type: string, values: Record<string, unknown>) {
  const event = new Event(type);
  for (const [key, value] of Object.entries(values)) {
    Object.defineProperty(event, key, { configurable: true, value });
  }
  return event;
}

describe("useQiblaController heading source priority", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    sessionStorage.clear();
    Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" });
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

  it("does not let a lower-trust relative event override an established trusted absolute heading", async () => {
    installGeolocation();
    installOrientationPermission();
    const { result } = renderHook(() => useQiblaController());

    act(() => result.current.findQibla());
    await waitFor(() => expect(result.current.state.mode).toBe("bearing-ready"));
    await act(async () => result.current.enableLiveCompass());

    act(() => window.dispatchEvent(orientationEvent("deviceorientationabsolute", {
      alpha: 228,
      beta: 0,
      gamma: 0,
      absolute: true,
    })));

    expect(["live", "aligned"]).toContain(result.current.state.mode);
    expect(result.current.headingSource).toBe("standard-absolute");
    const trustedHeading = result.current.state.trueHeading;

    act(() => window.dispatchEvent(orientationEvent("deviceorientation", {
      alpha: 20,
      beta: 0,
      gamma: 0,
      absolute: false,
    })));

    expect(["live", "aligned"]).toContain(result.current.state.mode);
    expect(result.current.state.liveBlockReason).toBeNull();
    expect(result.current.headingSource).toBe("standard-absolute");
    expect(result.current.state.trueHeading).toBe(trustedHeading);
  });
});
