import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PrayerEngineAdmin } from "../PrayerEngineAdmin";
import { validSettings as SYNTHETIC_TEST_PRAYER_SETTINGS } from "@/lib/prayer-engine/test-settings";

describe("Prayer Engine Admin", () => {
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

  it("treats historical calibration as optional operator reference instead of a production blocker", () => {
    render(<PrayerEngineAdmin initialSettings={SYNTHETIC_TEST_PRAYER_SETTINGS} />);
    expect(screen.queryByText(/Production calculation profile is not approved/i)).not.toBeInTheDocument();
    expect(screen.getByText(/historical timetable comparison is optional reference/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Commit Recalculation/i })).toBeDisabled();
  });
});
