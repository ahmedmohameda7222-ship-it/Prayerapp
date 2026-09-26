import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as route from "./route";

describe("GET /api/display-feed", () => {
  beforeEach(() => {
    process.env.PRAYERAPP_ORIGIN = "https://prayerapp.example.test";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("forwards conditional ETag and preserves 304 with time signal", async () => {
    const upstream = new Response(null, {
      status: 304,
      headers: {
        etag: '"abc"',
        date: "Tue, 15 Sep 2026 18:00:00 GMT",
      },
    });
    const fetchMock = vi.fn().mockResolvedValue(upstream);
    vi.stubGlobal("fetch", fetchMock);

    const response = await route.GET(
      new Request("https://display.test/api/display-feed", {
        headers: { "if-none-match": '"abc"' },
      }),
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [target, init] = fetchMock.mock.calls[0] as [string | URL, RequestInit];
    expect(String(target)).toBe("https://prayerapp.example.test/api/public/masjid-display");
    expect(new Headers(init.headers).get("if-none-match")).toBe('"abc"');
    expect(response.status).toBe(304);
    expect(response.headers.get("etag")).toBe('"abc"');
    expect(response.headers.get("date")).toBe("Tue, 15 Sep 2026 18:00:00 GMT");
  });

  it("preserves upstream failures instead of converting them to an empty 200", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response('{"error":"upstream_unavailable"}', {
          status: 503,
          headers: {
            "content-type": "application/json; charset=utf-8",
            date: "Tue, 15 Sep 2026 18:00:00 GMT",
          },
        }),
      ),
    );

    const response = await route.GET(new Request("https://display.test/api/display-feed"));

    expect(response.status).toBe(503);
    expect(await response.text()).toBe('{"error":"upstream_unavailable"}');
  });

  it("turns an upstream timeout into an explicit 503", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new DOMException("timed out", "TimeoutError")),
    );

    const response = await route.GET(new Request("https://display.test/api/display-feed"));

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "masjid_display_upstream_unavailable" });
  });

  it("exposes GET only", () => {
    expect("POST" in route).toBe(false);
    expect("PUT" in route).toBe(false);
    expect("DELETE" in route).toBe(false);
  });
});
