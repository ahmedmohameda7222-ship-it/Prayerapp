import { describe, expect, it } from "vitest";
import { MASJID_DISPLAY_TEST_SCENARIOS } from "@/lib/types";
import { buildTestFixture } from "./test-fixtures";

const STARTED_AT = "2026-09-16T18:00:00.000Z";

describe("Masjid Display synthetic fixtures", () => {
  it("builds all 19 scenarios without production data", () => {
    expect(MASJID_DISPLAY_TEST_SCENARIOS).toHaveLength(19);
    expect(MASJID_DISPLAY_TEST_SCENARIOS).toContain("campaign_without_qr");
    for (const scenario of MASJID_DISPLAY_TEST_SCENARIOS) {
      const payload = buildTestFixture(scenario, STARTED_AT);
      expect(payload.scenario).toBe(scenario);
      expect(payload.id.startsWith("test-")).toBe(true);
    }
  });

  it("provides separate campaign fixtures with and without a donation QR", () => {
    expect(buildTestFixture("campaign", STARTED_AT)).toMatchObject({
      donationUrl: "https://example.invalid/test-donation",
    });

    const withoutQr = buildTestFixture(
      "campaign_without_qr" as (typeof MASJID_DISPLAY_TEST_SCENARIOS)[number],
      STARTED_AT,
    );
    expect(withoutQr).toMatchObject({
      scenario: "campaign_without_qr",
      id: "test-campaign_without_qr",
    });
    expect(withoutQr).not.toHaveProperty("donationUrl");
  });

  it("preserves primary and additional Jumuah service identity in synthetic fixtures", () => {
    expect(buildTestFixture("friday_first_countdown", STARTED_AT)).toMatchObject({
      serviceIndex: 0,
    });
    expect(buildTestFixture("friday_next_countdown", STARTED_AT)).toMatchObject({
      serviceIndex: 1,
    });
    expect(buildTestFixture("jumuah_now", STARTED_AT)).toMatchObject({
      serviceIndex: 1,
    });
  });

  it("uses the approved deterministic countdown offsets", () => {
    expect(buildTestFixture("prayer_approaching", STARTED_AT)).toMatchObject({ targetAt: "2026-09-16T18:10:00.000Z" });
    expect(buildTestFixture("waiting_for_iqama", STARTED_AT)).toMatchObject({ targetAt: "2026-09-16T18:05:00.000Z" });
    expect(buildTestFixture("friday_first_countdown", STARTED_AT)).toMatchObject({ targetAt: "2026-09-16T19:00:00.000Z" });
    expect(buildTestFixture("friday_next_countdown", STARTED_AT)).toMatchObject({ targetAt: "2026-09-16T18:10:00.000Z" });
  });
});