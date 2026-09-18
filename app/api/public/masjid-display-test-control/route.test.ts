import { readFileSync } from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getTestState: vi.fn(),
  getMosqueSettings: vi.fn(),
}));

vi.mock("@/lib/data/masjid-display-test-state", () => ({
  getMasjidDisplayTestState: mocks.getTestState,
}));
vi.mock("@/lib/data/mosque-settings", () => ({
  getMosqueSettings: mocks.getMosqueSettings,
}));

import { GET } from "./route";

const activeState = {
  enabled: true,
  scenario: "normal" as const,
  payload: { scenario: "normal" as const, id: "test-normal", titleAr: "اختبار", titleDe: "Test", messageAr: "رسالة", messageDe: "Nachricht" },
  startedAt: "2099-09-16T18:00:00.000Z",
  expiresAt: "2099-09-16T18:15:00.000Z",
  updatedAt: "2099-09-16T18:00:00.000Z",
};

describe("public Masjid Display Test Control", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getMosqueSettings.mockResolvedValue({ publicAppUrl: "https://prayer.example/" });
  });

  it("returns active synthetic state independently of production prayer/display settings", async () => {
    mocks.getTestState.mockResolvedValue(activeState);
    const response = await GET();
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    await expect(response.json()).resolves.toMatchObject({
      active: true,
      scenario: "normal",
      publicAppUrl: "https://prayer.example/",
      payload: { id: "test-normal" },
    });

    const route = readFileSync(path.join(process.cwd(), "app/api/public/masjid-display-test-control/route.ts"), "utf8");
    expect(route).not.toMatch(/buildMasjidDisplayFeed|getPrayerSettings|getMasjidDisplaySettings/);
  });

  it("keeps Test Mode active without a configured Prayerapp QR URL", async () => {
    mocks.getTestState.mockResolvedValue(activeState);
    mocks.getMosqueSettings.mockResolvedValue({ publicAppUrl: "" });

    const response = await GET();

    await expect(response.json()).resolves.toMatchObject({
      active: true,
      scenario: "normal",
      publicAppUrl: null,
      payload: { id: "test-normal" },
    });
  });

  it("returns inactive for missing, disabled, or expired state", async () => {
    mocks.getTestState.mockResolvedValue(null);
    await expect((await GET()).json()).resolves.toEqual({ active: false });

    mocks.getTestState.mockResolvedValue({ ...activeState, enabled: false });
    await expect((await GET()).json()).resolves.toEqual({ active: false });

    mocks.getTestState.mockResolvedValue({ ...activeState, expiresAt: "2000-01-01T00:00:00.000Z" });
    await expect((await GET()).json()).resolves.toEqual({ active: false });
  });
});