import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchBoundedJson, readBoundedJson } from "@/lib/security/http-boundaries";

describe("HTTP security boundaries", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("accepts small JSON bodies and rejects wrong MIME or oversized bodies", async () => {
    const ok = await readBoundedJson(new Request("https://example.test", {
      method: "POST",
      headers: { "content-type": "application/json; charset=utf-8" },
      body: JSON.stringify({ value: "ok" }),
    }), { maxBytes: 128 });
    expect(ok).toEqual({ ok: true, value: { value: "ok" } });

    const wrongMime = await readBoundedJson(new Request("https://example.test", {
      method: "POST",
      headers: { "content-type": "text/plain" },
      body: "{}",
    }), { maxBytes: 128 });
    expect(wrongMime).toMatchObject({ ok: false, status: 415 });

    const tooLarge = await readBoundedJson(new Request("https://example.test", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ value: "x".repeat(200) }),
    }), { maxBytes: 64 });
    expect(tooLarge).toMatchObject({ ok: false, status: 413 });
  });

  it("rejects malformed JSON without leaking parser details", async () => {
    const result = await readBoundedJson(new Request("https://example.test", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{not-json",
    }), { maxBytes: 128 });
    expect(result).toEqual({ ok: false, status: 400, message: "Invalid JSON body" });
  });

  it("bounds upstream JSON by status, MIME, byte size, and timeout", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }))
      .mockResolvedValueOnce(new Response("not-json", {
        status: 200,
        headers: { "content-type": "text/html" },
      }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ value: "x".repeat(512) }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchBoundedJson("https://api.example.test/data", {
      timeoutMs: 1_000,
      maxBytes: 256,
      cache: "no-store",
    })).resolves.toEqual({ ok: true });
    await expect(fetchBoundedJson("https://api.example.test/data", {
      timeoutMs: 1_000,
      maxBytes: 256,
    })).rejects.toThrow("Unexpected upstream content type");
    await expect(fetchBoundedJson("https://api.example.test/data", {
      timeoutMs: 1_000,
      maxBytes: 128,
    })).rejects.toThrow("Upstream response too large");

    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({ cache: "no-store" });
    expect(fetchMock.mock.calls[0]?.[1]?.signal).toBeInstanceOf(AbortSignal);
  });
});
