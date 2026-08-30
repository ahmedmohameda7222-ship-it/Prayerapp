import { fireEvent, render, screen, within } from "@testing-library/react";
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

function controller(overrides: Record<string, unknown> = {}) {
  return {
    state: {
      mode: "idle",
      bearing: null,
      trueHeading: null,
      turnDelta: null,
      liveBlockReason: null,
      locationSource: null,
    },
    coordinates: null,
    locationLabel: null,
    locationError: null,
    headingSource: null,
    headingAccuracyDegrees: null,
    directionSector: null,
    isSearchingLocation: false,
    manualSearchResults: [],
    manualSearchError: false,
    findQibla: vi.fn(),
    enableLiveCompass: vi.fn(async () => undefined),
    searchManualLocation: vi.fn(async () => undefined),
    selectManualLocation: vi.fn(),
    ...overrides,
  } as ReturnType<typeof useQiblaController>;
}

function renderExperience() {
  return render(
    <I18nProvider initialLocale="en">
      <QiblaExperience />
    </I18nProvider>,
  );
}

describe("QiblaExperience semantic states", () => {
  beforeEach(() => {
    mockedUseQiblaController.mockReset();
  });

  it("starts with location-only intent and does not present compass permission", () => {
    mockedUseQiblaController.mockReturnValue(controller());
    renderExperience();

    expect(screen.getByRole("button", { name: "Find Qibla" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Enable Live Compass" })).not.toBeInTheDocument();
    expect(screen.getByText("Use your location to calculate the Qibla direction.")).toBeInTheDocument();
  });

  it("shows bearing as first-class guidance before live compass is enabled", () => {
    mockedUseQiblaController.mockReturnValue(
      controller({
        state: {
          mode: "bearing-ready",
          bearing: 132.45,
          trueHeading: null,
          turnDelta: null,
          liveBlockReason: null,
          locationSource: "gps",
        },
        directionSector: "SE",
        coordinates: { latitude: 48.8409, longitude: 12.9607, accuracyMeters: 12, source: "gps" },
      }),
    );
    renderExperience();

    expect(screen.getAllByText("Qibla · 132° Southeast").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Enable Live Compass" })).toBeInTheDocument();
    expect(screen.queryByTestId("qibla-compass")).not.toBeInTheDocument();
  });

  it.each([
    [14, "Turn right 14°"],
    [-8, "Turn left 8°"],
  ])("renders semantic turn guidance for delta %s", (turnDelta, expected) => {
    mockedUseQiblaController.mockReturnValue(
      controller({
        state: {
          mode: "live",
          bearing: 132.45,
          trueHeading: 118,
          turnDelta,
          liveBlockReason: null,
          locationSource: "gps",
        },
        directionSector: "SE",
        coordinates: { latitude: 48.8409, longitude: 12.9607, accuracyMeters: 12, source: "gps" },
        headingSource: "standard-absolute",
      }),
    );
    renderExperience();

    expect(screen.getByText(expected)).toBeInTheDocument();
    expect(screen.getByTestId("qibla-compass")).toHaveAttribute("aria-hidden", "true");
    const liveRegion = document.querySelector("[aria-live='polite']");
    expect(liveRegion).toHaveTextContent("Live compass ready.");
    expect(liveRegion).not.toHaveTextContent(/\d+°/u);
  });

  it("shows a categorical aligned state", () => {
    mockedUseQiblaController.mockReturnValue(
      controller({
        state: {
          mode: "aligned",
          bearing: 132.45,
          trueHeading: 131,
          turnDelta: 1.45,
          liveBlockReason: null,
          locationSource: "gps",
        },
        directionSector: "SE",
        coordinates: { latitude: 48.8409, longitude: 12.9607, accuracyMeters: 12, source: "gps" },
      }),
    );
    renderExperience();

    expect(screen.getByRole("heading", { name: "Facing Qibla" })).toBeInTheDocument();
    expect(document.querySelector("[aria-live='polite']")).toHaveTextContent("Facing Qibla");
  });

  it("keeps bearing-only useful without rendering a static compass pointer", () => {
    mockedUseQiblaController.mockReturnValue(
      controller({
        state: {
          mode: "bearing-only",
          bearing: 132.45,
          trueHeading: null,
          turnDelta: null,
          liveBlockReason: "relative-heading",
          locationSource: "gps",
        },
        directionSector: "SE",
        coordinates: { latitude: 48.8409, longitude: 12.9607, accuracyMeters: 12, source: "gps" },
      }),
    );
    renderExperience();

    expect(screen.getByText("Live compass is unavailable.")).toBeInTheDocument();
    expect(screen.getByText("Use 132° from true north with a trusted compass.")).toBeInTheDocument();
    expect(screen.queryByTestId("qibla-compass")).not.toBeInTheDocument();
  });

  it("offers manual location search instead of a retry-only dead end", () => {
    const searchManualLocation = vi.fn(async () => undefined);
    mockedUseQiblaController.mockReturnValue(
      controller({
        state: {
          mode: "location-error",
          bearing: null,
          trueHeading: null,
          turnDelta: null,
          liveBlockReason: null,
          locationSource: null,
        },
        locationError: "denied",
        searchManualLocation,
      }),
    );
    renderExperience();

    expect(screen.getByRole("button", { name: "Try location again" })).toBeInTheDocument();
    const input = screen.getByRole("textbox", { name: "Search city or address" });
    fireEvent.change(input, { target: { value: "Berlin" } });
    fireEvent.submit(input.closest("form") as HTMLFormElement);
    expect(searchManualLocation).toHaveBeenCalledWith("Berlin");
  });

  it("keeps diagnostics inside the Details disclosure and omits raw needle rotation", () => {
    mockedUseQiblaController.mockReturnValue(
      controller({
        state: {
          mode: "live",
          bearing: 132.45,
          trueHeading: 118.2,
          turnDelta: 14.25,
          liveBlockReason: null,
          locationSource: "gps",
        },
        directionSector: "SE",
        coordinates: { latitude: 48.8409, longitude: 12.9607, accuracyMeters: 12, source: "gps" },
        locationLabel: "Deggendorf, Germany",
        headingSource: "standard-absolute",
      }),
    );
    renderExperience();

    const disclosure = screen.getByText("Details").closest("details");
    expect(disclosure).not.toBeNull();
    const scoped = within(disclosure as HTMLElement);
    expect(scoped.getByText("True phone heading")).toBeInTheDocument();
    expect(scoped.getByText("Coordinates")).toBeInTheDocument();
    expect(screen.queryByText("Needle rotation")).not.toBeInTheDocument();
  });
});
