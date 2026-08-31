import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET, normalizeGeoapifyResults } from "@/app/api/geocode/route";

vi.mock("@/lib/security/rate-limit", () => ({
  consumeSecurityRateLimit: async () => ({
    allowed: true,
    remaining: 29,
    retryAfterSeconds: 0,
  }),
}));

describe("Qibla forward geocoding route", () => {
  const previousKey = process.env.GEOAPIFY_API_KEY;

  beforeEach(() => {
    process.env.GEOAPIFY_API_KEY = "test-secret";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    if (previousKey === undefined) delete process.env.GEOAPIFY_API_KEY;
    else process.env.GEOAPIFY_API_KEY = previousKey;
  });

  it("rejects empty and oversized queries before calling Geoapify", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const empty = await GET(new NextRequest("https://example.test/api/geocode?q=%20%20"));
    const oversized = await GET(new NextRequest(`https://example.test/api/geocode?q=${"a".repeat(161)}`));

    expect(empty.status).toBe(400);
    expect(oversized.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("requests at most five results and never exposes the server API key in its response", async () => {
    const fetchMock = vi.fn(async (input: URL | RequestInfo) => {
      const requestedUrl = new URL(String(input));
      expect(requestedUrl.searchParams.get("limit")).toBe("5");
      expect(requestedUrl.searchParams.get("apiKey")).toBe("test-secret");
      return new Response(JSON.stringify({
        results: [
          { formatted: "Deggendorf, Germany", lat: 48.8409, lon: 12.9607, extra: "drop-me" },
          { formatted: "Berlin, Germany", lat: 52.52, lon: 13.405 },
        ],
      }), { status: 200, headers: { "Content-Type": "application/json" } });
    });
    vi.stubGlobal("fetch", fetchMock);

    const response = await GET(new NextRequest("https://example.test/api/geocode?q=Deggendorf"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      ok: true,
      results: [
        { label: "Deggendorf, Germany", latitude: 48.8409, longitude: 12.9607 },
        { label: "Berlin, Germany", latitude: 52.52, longitude: 13.405 },
      ],
    });
    expect(JSON.stringify(body)).not.toContain("test-secret");
    expect(JSON.stringify(body)).not.toContain("drop-me");
  });

  it("drops malformed provider results and caps output at five", () => {
    const normalized = normalizeGeoapifyResults([
      { formatted: "One", lat: 1, lon: 1 },
      { formatted: "Two", lat: 2, lon: 2 },
      { formatted: "Three", lat: 3, lon: 3 },
      { formatted: "Four", lat: 4, lon: 4 },
      { formatted: "Five", lat: 5, lon: 5 },
      { formatted: "Six", lat: 6, lon: 6 },
      { formatted: "Invalid", lat: 91, lon: 0 },
    ]);

    expect(normalized).toHaveLength(5);
    expect(normalized.map((item) => item.label)).toEqual(["One", "Two", "Three", "Four", "Five"]);
  });
});
