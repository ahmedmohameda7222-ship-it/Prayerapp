import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

afterEach(() => {
  delete process.env.PRAYERAPP_ORIGIN;
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("GET /api/khutbah", () => {
  it("proxies only one validated date to the trusted German khutbah endpoint", async () => {
    process.env.PRAYERAPP_ORIGIN = "https://prayerapp.example";
    const upstream = vi.fn().mockResolvedValue(
      Response.json({
        date: "2026-09-18", khutbah: {
          date: "2026-09-18", titleDe: "Freitagsbotschaft",
          contentDe: "Der freitägliche Predigttext.",
        },
      }),
    );
    vi.stubGlobal("fetch", upstream);
    const response = await GET(new Request("https://tv.example/api/khutbah?date=2026-09-18"));
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(upstream).toHaveBeenCalledWith(
      "https://prayerapp.example/api/public/masjid-tv-khutbah?date=2026-09-18",
      expect.objectContaining({ method: "GET", redirect: "error", cache: "no-store" }),
    );
  });

  it("rejects invalid date query before any upstream call", async () => {
    const upstream = vi.fn();
    vi.stubGlobal("fetch", upstream);
    const response = await GET(new Request("https://tv.example/api/khutbah?date=../../secret"));
    expect(response.status).toBe(400);
    expect(upstream).not.toHaveBeenCalled();
  });

  it("fails closed when upstream is unreachable", async () => {
    process.env.PRAYERAPP_ORIGIN = "https://prayerapp.example";
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    const response = await GET(new Request("https://tv.example/api/khutbah?date=2026-09-18"));
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "khutbah_upstream_unavailable" });
  });
});
