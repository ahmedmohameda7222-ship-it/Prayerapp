import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const mocks = vi.hoisted(() => ({
  buildMasjidDisplayFeed: vi.fn(),
  assertMasjidDisplayFeedPayloadSize: vi.fn(),
  finalizeFeed: vi.fn(),
  etagForFeed: vi.fn(),
  canonicalJson: vi.fn(),
}));

vi.mock("@/lib/masjid-display/build-feed", () => ({
  buildMasjidDisplayFeed: mocks.buildMasjidDisplayFeed,
  assertMasjidDisplayFeedPayloadSize: mocks.assertMasjidDisplayFeedPayloadSize,
}));

vi.mock("@/lib/masjid-display/feed-etag", () => ({
  finalizeFeed: mocks.finalizeFeed,
  etagForFeed: mocks.etagForFeed,
  canonicalJson: mocks.canonicalJson,
}));

import { GET } from "./route";

const finalizedFeed = {
  schemaVersion: 1,
  snapshotRevision: "a".repeat(64),
  generatedAt: "2026-09-15T08:00:00.000Z",
  timezone: "Europe/Berlin",
  mosque: {
    nameAr: "مسجد الدانوب",
    nameDe: "Donau Moschee",
    address: "Teststraße 1, 94469 Deggendorf",
    publicAppUrl: "https://example.test",
  },
  prayers: {
    schedule: [{ date: "2026-09-15", fajr: "05:00", sunrise: "06:30", dhuhr: "13:10", asr: "16:45", maghrib: "19:20", isha: "20:45", maghribProgram: null }],
    iqamaDelays: { fajr: 20, dhuhr: 15, asr: 15, maghrib: 10, isha: 15 },
    additionalJumuah: [],
  },
  displaySettings: {
    prayerDurations: { fajr: 10, dhuhr: 10, asr: 10, maghrib: 10, isha: 10 },
    azkarPlaylistIds: [],
  },
  azkar: [],
  announcements: [],
  events: [],
  campaigns: [],
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.buildMasjidDisplayFeed.mockResolvedValue({ ...finalizedFeed, snapshotRevision: undefined });
  mocks.finalizeFeed.mockReturnValue(finalizedFeed);
  mocks.etagForFeed.mockReturnValue(`"${"b".repeat(64)}"`);
  mocks.canonicalJson.mockImplementation((value) => JSON.stringify(value));
});

describe("GET /api/public/masjid-display", () => {
  it("is public and returns only the finalized allowlisted representation", async () => {
    const response = await GET(new Request("https://app.test/api/public/masjid-display"));
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/json");
    expect(response.headers.get("cache-control")).toBe("public, max-age=0, must-revalidate");
    expect(response.headers.get("etag")).toBe(`"${"b".repeat(64)}"`);
    expect(response.headers.get("date")).toBeTruthy();
    expect(await response.json()).toEqual(finalizedFeed);
    expect(mocks.buildMasjidDisplayFeed).toHaveBeenCalledTimes(1);
    expect(mocks.assertMasjidDisplayFeedPayloadSize).toHaveBeenCalledWith(
      JSON.stringify(finalizedFeed),
    );
  });

  it("returns 304 with no body for matching If-None-Match", async () => {
    const etag = `"${"b".repeat(64)}"`;
    const response = await GET(new Request("https://app.test/api/public/masjid-display", {
      headers: { "if-none-match": etag },
    }));
    expect(response.status).toBe(304);
    expect(await response.text()).toBe("");
    expect(response.headers.get("etag")).toBe(etag);
    expect(response.headers.get("date")).toBeTruthy();
  });

  it("keeps body and ETag stable across requests when source representation is unchanged", async () => {
    const first = await GET(new Request("https://app.test/api/public/masjid-display"));
    const firstBody = await first.text();
    const second = await GET(new Request("https://app.test/api/public/masjid-display"));
    expect(await second.text()).toBe(firstBody);
    expect(second.headers.get("etag")).toBe(first.headers.get("etag"));
  });

  it("returns a generic non-cacheable 503 without leaking internal errors", async () => {
    mocks.buildMasjidDisplayFeed.mockRejectedValue(new Error("service_role Supabase secret stack detail"));
    const response = await GET(new Request("https://app.test/api/public/masjid-display"));
    expect(response.status).toBe(503);
    expect(response.headers.get("cache-control")).toBe("no-store");
    const body = await response.text();
    expect(body).toContain("masjid_display_feed_unavailable");
    expect(body).not.toContain("service_role");
    expect(body).not.toContain("Supabase");
    expect(body).not.toContain("stack detail");
  });

  it("exports no mutation handlers", () => {
    const source = readFileSync(join(process.cwd(), "app/api/public/masjid-display/route.ts"), "utf8");
    for (const method of ["POST", "PUT", "PATCH", "DELETE"]) {
      expect(source).not.toMatch(new RegExp(`export\\s+(?:async\\s+)?function\\s+${method}\\b`));
      expect(source).not.toMatch(new RegExp(`export\\s+const\\s+${method}\\b`));
    }
  });
});
