import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import QiblaPage from "@/app/qibla/page";
import { I18nProvider } from "@/lib/i18n/context";

vi.mock("next/navigation", () => ({ usePathname: () => "/qibla" }));
vi.mock("@/lib/data/announcements", () => ({ getAnnouncements: async () => [] }));

class MockDeviceOrientationEvent extends Event {
  alpha: number | null;
  beta: number | null = null;
  gamma: number | null = null;
  absolute: boolean;

  constructor(type: string, init: { alpha: number; absolute: boolean }) {
    super(type);
    this.alpha = init.alpha;
    this.absolute = init.absolute;
  }
}

describe("QiblaPage live compass", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();

    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: {
        getCurrentPosition: vi.fn((success: PositionCallback) => {
          success({
            coords: {
              latitude: 48.8409,
              longitude: 12.9577,
              accuracy: 8,
              altitude: null,
              altitudeAccuracy: null,
              heading: null,
              speed: null,
              toJSON: () => ({}),
            },
            timestamp: Date.now(),
            toJSON: () => ({}),
          });
        }),
      },
    });

    Object.defineProperty(window, "DeviceOrientationEvent", {
      configurable: true,
      value: MockDeviceOrientationEvent,
    });
    Object.defineProperty(window, "requestAnimationFrame", {
      configurable: true,
      value: (callback: FrameRequestCallback) => window.setTimeout(() => callback(0), 0),
    });
    Object.defineProperty(window, "cancelAnimationFrame", {
      configurable: true,
      value: (id: number) => window.clearTimeout(id),
    });

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ json: async () => ({ ok: true, city: "Deggendorf", country: "Germany" }) })
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("uses the current coordinates and updates the live heading from orientation events", async () => {
    const user = userEvent.setup();
    render(
      <I18nProvider initialLocale="en">
        <QiblaPage />
      </I18nProvider>
    );

    await user.click(screen.getByRole("button", { name: "Start Qibla Compass" }));

    expect(navigator.geolocation.getCurrentPosition).toHaveBeenCalledWith(
      expect.any(Function),
      expect.any(Function),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );

    act(() => {
      window.dispatchEvent(
        new MockDeviceOrientationEvent("deviceorientationabsolute", { alpha: 90, absolute: true })
      );
    });

    await waitFor(() => {
      expect(screen.getByText("Phone heading").parentElement).toHaveTextContent("270.0°");
    });

    expect(screen.getByText("Needle rotation").parentElement).not.toHaveTextContent("—");
    expect(screen.getByText("Location accuracy").parentElement).toHaveTextContent("±8 m");
    expect(screen.getByText("Live compass active — rotate your phone until the arrow points straight ahead.")).toBeInTheDocument();
  });
});
