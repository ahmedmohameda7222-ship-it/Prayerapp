import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchPrayerappUpstream } from "./upstream";

afterEach(() => {
  delete process.env.PRAYERAPP_ORIGIN;
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("Prayerapp upstream origin boundary", () => {
  it("fails closed when PRAYERAPP_ORIGIN is missing", async () => {
    await expect(
      fetchPrayerappUpstream(
        "/api/public/masjid-display",
        new Request("https://tv.example/api/display-feed"),
        1_000,
      ),
    ).rejects.toThrow("PRAYERAPP_ORIGIN is required");
  });

  it.each([
    ["credentials", "https://user:pass@donaumoschee.vercel.app"],
    ["path", "https://donaumoschee.vercel.app/api"],
    ["query", "https://donaumoschee.vercel.app?upstream=evil"],
    ["fragment", "https://donaumoschee.vercel.app#evil"],
  ])("rejects an origin containing %s", async (_label, origin) => {
    process.env.PRAYERAPP_ORIGIN = origin;
    await expect(
      fetchPrayerappUpstream(
        "/api/public/masjid-display",
        new Request("https://tv.example/api/display-feed"),
        1_000,
      ),
    ).rejects.toThrow(/origin only|must not contain a path/);
  });

  it("uses only the server environment origin and approved path", async () => {
    process.env.PRAYERAPP_ORIGIN = "https://donaumoschee.vercel.app";
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ ok: true }));
    vi.stubGlobal("fetch", fetchMock);

    await fetchPrayerappUpstream(
      "/api/public/masjid-display-test-control",
      new Request("https://attacker.example/api/test-control?origin=https://evil.example"),
      1_000,
    );

    expect(fetchMock).toHaveBeenCalledWith(
      "https://donaumoschee.vercel.app/api/public/masjid-display-test-control",
      expect.objectContaining({ method: "GET", redirect: "error" }),
    );
  });

  it("has no public upstream environment variable", async () => {
    const source = await import("node:fs").then(({ readFileSync }) =>
      readFileSync("lib/upstream.ts", "utf8"),
    );
    expect(source).toContain("process.env.PRAYERAPP_ORIGIN");
    expect(source).not.toContain("NEXT_PUBLIC_PRAYERAPP_ORIGIN");
  });
});
