import { describe, expect, it } from "vitest";
import { activeTvTestFromRow, parseTvTestRequest, TV_TEST_MAX_DURATION_MS } from "./tv-test-control";

describe("TV Test control contract", () => {
  it("accepts only allowed remote prayer and content test cases", () => {
    expect(parseTvTestRequest({ scenario: "PRAYER_APPROACHING", prayer: "maghrib" })).toEqual({
      scenario: "PRAYER_APPROACHING", prayer: "maghrib",
    });
    expect(parseTvTestRequest({ scenario: "JUMUAH_NOW", prayer: null })).toEqual({
      scenario: "JUMUAH_NOW", prayer: null,
    });
    expect(parseTvTestRequest({ scenario: "NEXT_PRAYER", prayer: null })).toEqual({
      scenario: "NEXT_PRAYER", prayer: null,
    });
  });

  it("rejects unknown commands, inappropriate prayer context, and injected arbitrary time values", () => {
    for (const command of [
      { scenario: "DELETE_DATABASE", prayer: "asr" },
      { scenario: "PRAYER_APPROACHING", prayer: null },
      { scenario: "JUMUAH_NOW", prayer: "fajr" },
      { scenario: "NORMAL", prayer: "asr" },
      { scenario: "POST_PRAYER_AZKAR", prayer: "sunrise" },
      { scenario: "WAITING_FOR_IQAMA", prayer: "asr", time: "23:00" },
      { scenario: "<script>", prayer: null },
    ]) {
      expect(() => parseTvTestRequest(command)).toThrow();
    }
  });

  it("automatically disables expired, future-dated or overlong test commands", () => {
    const base = {
      scenario: "PRAYER_APPROACHING",
      prayer: "fajr",
      started_at: "2026-11-15T10:00:00.000Z",
      expires_at: "2026-11-15T10:03:00.000Z",
    };
    expect(TV_TEST_MAX_DURATION_MS).toBe(180_000);
    expect(activeTvTestFromRow(base, new Date("2026-11-15T10:02:59Z"))).toMatchObject({
      scenario: "PRAYER_APPROACHING", prayer: "fajr",
    });
    expect(activeTvTestFromRow(base, new Date("2026-11-15T10:03:00Z"))).toBeNull();
    expect(activeTvTestFromRow(base, new Date("2026-11-15T09:59:59Z"))).toBeNull();
    expect(activeTvTestFromRow({ ...base, expires_at: "2026-11-15T10:10:00.000Z" }, new Date("2026-11-15T10:01:00Z"))).toBeNull();
    expect(activeTvTestFromRow({ ...base, scenario: "BAD" }, new Date("2026-11-15T10:01:00Z"))).toBeNull();
  });

  it("never exposes admin tokens/identities or unexpected DB fields in the public state", () => {
    const row = {
      scenario: "IQAMA_NOW", prayer: "asr",
      started_at: "2026-11-15T10:00:00.000Z",
      expires_at: "2026-11-15T10:03:00.000Z",
      admin_id: "private-user-id", token: "never-publish",
    };
    const publicControl = activeTvTestFromRow(row, new Date("2026-11-15T10:01:00Z"));
    expect(publicControl).toEqual({
      scenario: "IQAMA_NOW", prayer: "asr",
      startedAt: row.started_at, expiresAt: row.expires_at,
    });
  });
});
