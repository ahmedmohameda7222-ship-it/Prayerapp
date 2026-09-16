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
        profileApproved={false}
      />,
    );

    expect(screen.getByLabelText(/Fajr angle/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Fajr Iqama delay/i)).toHaveValue(0);
    expect(screen.getByText(/Needs Recalculation/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Extend Schedule \+1 Year$/i })).toBeDisabled();
  });

  it("makes the unresolved production calibration gate explicit", () => {
    render(<PrayerEngineAdmin initialSettings={SYNTHETIC_TEST_PRAYER_SETTINGS} profileApproved={false} />);
    expect(screen.getByText(/Production calculation profile is not approved/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Commit Recalculation/i })).toBeDisabled();
  });
});
