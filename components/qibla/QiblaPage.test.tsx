import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import QiblaPage from "@/app/qibla/page";
import { I18nProvider } from "@/lib/i18n/context";

vi.mock("next/navigation", () => ({ usePathname: () => "/qibla" }));
vi.mock("@/lib/data/announcements", () => ({ getAnnouncements: async () => [] }));

class MockDeviceOrientationEvent extends Event {
  alpha: number | null;
  beta: number | null;
  gamma: number | null;
  absolute: boolean;

  constructor(type: string, init: { alpha: number; absolute: boolean; beta?: number; gamma?: number }) {
    super(type);
    this.alpha = init.alpha;
    this.beta = init.beta ?? 0;
    this.gamma = init.gamma ?? 0;
    this.absolute = init.absolute;
  }
}

describe("QiblaPage progressive live compass flow", () => {
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
          } as GeolocationPosition);
        }),
      },
    });

    Object.defineProperty(window, "DeviceOrientationEvent", {
      configurable: true,
      value: MockDeviceOrientationEvent,
    });
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: vi.fn(() => ({
        matches: true,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
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
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ ok: true, city: "Deggendorf", country: "Germany" }),
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("requests location first, then enables live guidance only after the separate compass action", async () => {
    const user = userEvent.setup();
    render(
      <I18nProvider initialLocale="en">
        <QiblaPage />
      </I18nProvider>,
    );

    expect(screen.getByRole("button", { name: "Find Qibla" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Enable Live Compass" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Find Qibla" }));

    expect(navigator.geolocation.getCurrentPosition).toHaveBeenCalledWith(
      expect.any(Function),
      expect.any(Function),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );

    const enableCompass = await screen.findByRole("button", { name: "Enable Live Compass" });
    await user.click(enableCompass);

    act(() => {
      window.dispatchEvent(
        new MockDeviceOrientationEvent("deviceorientationabsolute", {
          alpha: 90,
          absolute: true,
          beta: 0,
          gamma: 0,
        }),
      );
    });

    await waitFor(() => {
      expect(screen.getByText("True phone heading").parentElement).toHaveTextContent("270.0°");
    });

    expect(screen.getByText("Heading source").parentElement).toHaveTextContent("Absolute orientation");
    expect(screen.getByText("Location accuracy").parentElement).toHaveTextContent("±8 m");
    expect(screen.getByTestId("qibla-compass")).toHaveAttribute("aria-hidden", "true");
  });
});
