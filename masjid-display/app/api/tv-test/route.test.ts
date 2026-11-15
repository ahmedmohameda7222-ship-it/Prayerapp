import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("GET /api/tv-test", () => {
  it("proxies ONLY the trusted, read-only source with no caching", async () => {
    process.env.PRAYERAPP_ORIGIN = "https://prayerapp.example";
    const upstream = vi.fn().mockResolvedValue(
      Response.json({ active: false, command: null }),
    );
    vi.stubGlobal("fetch", upstream);

    const response = await GET(new Request("https://tv.example/api/tv-test"));
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({ active: false, command: null });
    expect(upstream).toHaveBeenCalledWith(
      "https://prayerapp.example/api/public/masjid-tv-test",
      expect.objectContaining({ method: "GET", redirect: "error", cache: "no-store" }),
    );
  });

  it("fails closed if the root status endpoint is unavailable", async () => {
    process.env.PRAYERAPP_ORIGIN = "https://prayerapp.example";
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    const response = await GET(new Request("https://tv.example/api/tv-test"));
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "tv_test_upstream_unavailable" });
  });

  it("never exposes write methods on the public TV status endpoint", async () => {
    const module = await import("./route");
    expect("POST" in module).toBe(false);
    expect("PUT" in module).toBe(false);
    expect("DELETE" in module).toBe(false);
  });
});
