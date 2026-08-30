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

describe("useQiblaController retry listener ownership", () => {
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

  it("removes the previous orientation listeners before a compass retry attaches new ones", async () => {
    installGeolocation();
    installOrientationPermission();
    const addSpy = vi.spyOn(window, "addEventListener");
    const removeSpy = vi.spyOn(window, "removeEventListener");
    const { result } = renderHook(() => useQiblaController());

    act(() => result.current.findQibla());
    await waitFor(() => expect(result.current.state.mode).toBe("bearing-ready"));

    await act(async () => result.current.enableLiveCompass());
    const firstOrientationAdds = addSpy.mock.calls.filter(([type]) =>
      type === "deviceorientation" || type === "deviceorientationabsolute",
    ).length;
    expect(firstOrientationAdds).toBe(2);

    await act(async () => result.current.enableLiveCompass());

    const orientationAdds = addSpy.mock.calls.filter(([type]) =>
      type === "deviceorientation" || type === "deviceorientationabsolute",
    ).length;
    const orientationRemovals = removeSpy.mock.calls.filter(([type]) =>
      type === "deviceorientation" || type === "deviceorientationabsolute",
    ).length;

    expect(orientationAdds).toBe(4);
    expect(orientationRemovals).toBeGreaterThanOrEqual(2);
  });
});
