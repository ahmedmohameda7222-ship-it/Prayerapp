import { describe, it } from "vitest";

/**
 * Regression fixtures are intentionally not populated until a candidate explicit
 * calculation profile has been calibrated against actual published Prayerapp
 * prayer_times rows within the approved ±1 minute tolerance.
 *
 * This test file exists to make that requirement explicit without inventing
 * religious expected values. Reviewed fixtures are added only after calibration.
 */
describe("reviewed Prayerapp prayer-time regression fixtures", () => {
  it.todo("freezes representative published rows after profile calibration");
});
