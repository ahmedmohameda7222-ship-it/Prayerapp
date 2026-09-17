import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as route from "./route";

describe("GET /api/test-control", () => {
  beforeEach(() => {
    process.env.PRAYERAPP_ORIGIN = "https://prayerapp.example.test";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("passes through an active Test Control body with no-store", async () => {
    const body = {
      active: true,
      scenario: "PRAYER_APPROACHING",
      startedAt: "2026-09-15T18:00:00.000Z",
      expiresAt: "2026-09-15T18:15:00.000Z",
      publicAppUrl: "https://prayerapp.example.test",
      payload: { prayer: "isha" },
    };
    const fetchMock = vi.fn().mockResolvedValue(
      Response.json(body, { headers: { "cache-control": "public, max-age=60" } }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await route.GET(new Request("https://display.test/api/test-control"));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [target] = fetchMock.mock.calls[0] as [string | URL, RequestInit];
    expect(String(target)).toBe(
      "https://prayerapp.example.test/api/public/masjid-display-test-control",
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual(body);
  });

  it("passes through an inactive Test Control body with no-store", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ active: false })));

    const response = await route.GET(new Request("https://display.test/api/test-control"));

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({ active: false });
  });

  it("preserves upstream failure status and still disables caching", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("upstream failed", { status: 503 })),
    );

    const response = await route.GET(new Request("https://display.test/api/test-control"));

    expect(response.status).toBe(503);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.text()).toBe("upstream failed");
  });

  it("exposes no write method", () => {
    expect("POST" in route).toBe(false);
    expect("PUT" in route).toBe(false);
    expect("PATCH" in route).toBe(false);
    expect("DELETE" in route).toBe(false);
  });
});
