import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

const mocks = vi.hoisted(() => ({
  createServerClient: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createServerClient: mocks.createServerClient,
}));

function fakeClient(error: unknown = null) {
  return {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        limit: vi.fn(async () => ({ error })),
      })),
    })),
  };
}

describe("public health route is a fresh no-store signal for read-only monitoring", () => {
  beforeEach(() => mocks.createServerClient.mockReset());

  it("reports live database health without allowing the result to be cached", async () => {
    mocks.createServerClient.mockReturnValue(fakeClient());
    const response = await GET();
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual(expect.objectContaining({ status: "ok", database: "ok" }));
  });

  it("reports missing configuration as an uncacheable failure", async () => {
    mocks.createServerClient.mockReturnValue(null);
    const response = await GET();
    expect(response.status).toBe(503);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({ status: "degraded", database: "not-configured" });
  });

  it("reports database errors as an uncacheable 503 without leaking upstream error details", async () => {
    mocks.createServerClient.mockReturnValue(fakeClient({ message: "internal_provider_detail" }));
    const response = await GET();
    expect(response.status).toBe(503);
    expect(response.headers.get("cache-control")).toBe("no-store");
    const body = await response.json();
    expect(body).toEqual(expect.objectContaining({ status: "degraded", database: "unavailable" }));
    expect(JSON.stringify(body)).not.toContain("internal_provider_detail");
  });
});
