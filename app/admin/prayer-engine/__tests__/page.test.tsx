import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const actionMocks = vi.hoisted(() => ({
  calibratePrayerEngineAction: vi.fn(),
  commitPrayerRecalculationAction: vi.fn(),
  commitPrayerScheduleExtensionAction: vi.fn(),
  loadPrayerEngineSettingsAction: vi.fn(),
  previewPrayerRecalculationAction: vi.fn(),
  previewPrayerScheduleExtensionAction: vi.fn(),
  savePrayerEngineSettingsAction: vi.fn(),
}));

vi.mock("../actions", () => actionMocks);

import { PrayerEngineAdmin } from "../PrayerEngineAdmin";
import { validSettings as SYNTHETIC_TEST_PRAYER_SETTINGS } from "@/lib/prayer-engine/test-settings";

describe("Prayer Engine Admin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows explicit settings and blocks extension while revisions differ", () => {
    render(
      <PrayerEngineAdmin
        initialSettings={{
          ...SYNTHETIC_TEST_PRAYER_SETTINGS,
          iqamaDelays: { ...SYNTHETIC_TEST_PRAYER_SETTINGS.iqamaDelays, fajr: 0 },
          calculationRevision: 2,
          appliedCalculationRevision: 1,
        }}
      />,
    );

    expect(screen.getByLabelText(/Fajr angle/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Fajr Iqama delay/i)).toHaveValue(0);
    expect(screen.getByText(/Needs Recalculation/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Extend Schedule \+1 Year$/i })).toBeDisabled();
  });

  it("preserves safe runtime Iqama values while the calculation profile is unconfigured", () => {
    render(
      <PrayerEngineAdmin
        initialSettings={null}
        initialRuntimeAuthority={{
          timezone: "Europe/Berlin",
          iqamaDelays: { fajr: 20, dhuhr: 15, asr: 15, maghrib: 5, isha: 10 },
        }}
      />,
    );

    expect(screen.getByLabelText(/Timezone/i)).toHaveValue("Europe/Berlin");
    expect(screen.getByLabelText(/Fajr Iqama delay/i)).toHaveValue(20);
    expect(screen.getByLabelText(/Dhuhr Iqama delay/i)).toHaveValue(15);
    expect(screen.getByLabelText(/Asr Iqama delay/i)).toHaveValue(15);
    expect(screen.getByLabelText(/Maghrib Iqama delay/i)).toHaveValue(5);
    expect(screen.getByLabelText(/Isha Iqama delay/i)).toHaveValue(10);
    expect(screen.getByLabelText(/Latitude/i)).toHaveValue(null);
    expect(screen.getByLabelText(/Fajr angle/i)).toHaveValue(null);
  });

  it("treats historical calibration as optional operator reference instead of a production blocker", () => {
    render(<PrayerEngineAdmin initialSettings={SYNTHETIC_TEST_PRAYER_SETTINGS} />);
    expect(screen.queryByText(/Production calculation profile is not approved/i)).not.toBeInTheDocument();
    expect(screen.getByText(/historical timetable comparison is optional reference/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Commit Recalculation/i })).toBeDisabled();
  });

  it("reloads applied settings after a successful recalculation commit", async () => {
    const pendingSettings = {
      ...SYNTHETIC_TEST_PRAYER_SETTINGS,
      calculationRevision: 2,
      appliedCalculationRevision: 1,
    };
    const appliedSettings = {
      ...pendingSettings,
      appliedCalculationRevision: 2,
    };

    actionMocks.previewPrayerRecalculationAction.mockResolvedValue({
      success: true,
      data: {
        startDate: "2026-09-24",
        endDate: "2026-09-24",
        settingsRevision: 2,
        changedRowCount: 1,
        changedPrayerCount: 1,
        rows: [],
      },
    });
    actionMocks.commitPrayerRecalculationAction.mockResolvedValue({
      success: true,
      data: 1,
    });
    actionMocks.loadPrayerEngineSettingsAction.mockResolvedValue({
      success: true,
      data: appliedSettings,
    });
    vi.spyOn(window, "confirm").mockReturnValue(true);

    render(
      <PrayerEngineAdmin
        initialSettings={pendingSettings}
        token="test-token"
      />,
    );

    fireEvent.change(screen.getByLabelText(/Recalculation start/i), {
      target: { value: "2026-09-24" },
    });
    fireEvent.change(screen.getByLabelText(/Recalculation end/i), {
      target: { value: "2026-09-24" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Preview Recalculation/i }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Commit Recalculation/i })).toBeEnabled();
    });

    fireEvent.click(screen.getByRole("button", { name: /Commit Recalculation/i }));

    await waitFor(() => {
      expect(actionMocks.loadPrayerEngineSettingsAction).toHaveBeenCalledWith("test-token");
      expect(screen.getByText(/Calculation revision 2; applied 2\./i)).toBeInTheDocument();
      expect(screen.getByText(/Calculation revision applied/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Preview Extend Schedule \+1 Year/i })).toBeEnabled();
    });
  });
});
