import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { QiblaExperience } from "@/components/qibla/QiblaExperience";
import { I18nProvider } from "@/lib/i18n/context";
import { useQiblaController } from "@/lib/use-qibla-controller";

vi.mock("@/lib/use-qibla-controller", async () => {
  const actual = await vi.importActual<typeof import("@/lib/use-qibla-controller")>(
    "@/lib/use-qibla-controller",
  );
  return { ...actual, useQiblaController: vi.fn() };
});

const mockedUseQiblaController = vi.mocked(useQiblaController);

function liveController(turnDelta: number) {
  return {
    state: {
      mode: "live",
      bearing: 132.45,
      trueHeading: 118,
      turnDelta,
      liveBlockReason: null,
      locationSource: "gps",
    },
    coordinates: { latitude: 48.8409, longitude: 12.9607, accuracyMeters: 12, source: "gps" },
    locationLabel: "Deggendorf, Germany",
    locationError: null,
    headingSource: "standard-absolute",
    headingAccuracyDegrees: null,
    directionSector: "SE",
    isSearchingLocation: false,
    manualSearchResults: [],
    manualSearchError: false,
    findQibla: vi.fn(),
    enableLiveCompass: vi.fn(async () => undefined),
    searchManualLocation: vi.fn(async () => undefined),
    selectManualLocation: vi.fn(),
  } as ReturnType<typeof useQiblaController>;
}

describe("QiblaExperience accessible turn guidance", () => {
  beforeEach(() => mockedUseQiblaController.mockReset());

  it.each([
    [14, "Turn right 14 degrees to face Qibla"],
    [-8, "Turn left 8 degrees to face Qibla"],
  ])("provides a complete semantic heading for delta %s without putting degrees in aria-live", (delta, accessibleName) => {
    mockedUseQiblaController.mockReturnValue(liveController(delta));
    render(
      <I18nProvider initialLocale="en">
        <QiblaExperience />
      </I18nProvider>,
    );

    expect(screen.getByRole("heading", { name: accessibleName })).toBeInTheDocument();
    const liveRegion = document.querySelector("[aria-live='polite']");
    expect(liveRegion).toHaveTextContent("Live compass ready.");
    expect(liveRegion).not.toHaveTextContent(/\d/u);
  });
});
