import fixture from "./__fixtures__/feed-v1.json";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { loadLkg, replaceLkg } from "./lkg";

const KEY = "masjid-display-lkg-v1";
const NOW = "2026-09-15T18:00:00.000Z";

describe("versioned Last Known Good storage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it("stores only the versioned LKG envelope", () => {
    replaceLkg(fixture, '"good"', NOW);

    expect(JSON.parse(localStorage.getItem(KEY) ?? "null")).toEqual({
      snapshot: fixture,
      etag: '"good"',
      receivedAt: NOW,
      schemaVersion: 1,
    });
    expect(loadLkg()).toEqual({
      snapshot: fixture,
      etag: '"good"',
      receivedAt: NOW,
      schemaVersion: 1,
    });
  });

  it("does not replace valid LKG with invalid network data", () => {
    replaceLkg(fixture, '"good"', NOW);
    const before = loadLkg();

    expect(() =>
      replaceLkg({ ...fixture, schemaVersion: 2 }, '"bad"', "2026-09-15T18:01:00.000Z"),
    ).toThrow(/schema/i);
    expect(loadLkg()).toEqual(before);
  });

  it("discards corrupt local JSON", () => {
    localStorage.setItem(KEY, "{");
    expect(loadLkg()).toBeNull();
  });

  it("continues in memory when browser storage is unavailable", () => {
    const setItem = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("quota", "QuotaExceededError");
    });

    expect(() => replaceLkg(fixture, '"memory"', NOW)).not.toThrow();
    setItem.mockRestore();

    expect(loadLkg()?.etag).toBe('"memory"');
  });
});
