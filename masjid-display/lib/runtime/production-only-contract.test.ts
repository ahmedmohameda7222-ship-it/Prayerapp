import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import fixture from "../__fixtures__/feed-v1.json";
import type { MasjidDisplayFeedV1 } from "../feed-types";
import { resolvePrayerState } from "../state/prayer-state";

const root = process.cwd();

describe("production TV runtime efficiency and isolation", () => {
  it("reuses converted prayer instants between clock ticks for the same feed", () => {
    const feed = structuredClone(fixture) as MasjidDisplayFeedV1;
    const dateTimeFormat = vi.spyOn(Intl, "DateTimeFormat");
    try {
      resolvePrayerState(feed, new Date("2026-09-15T18:00:00.000Z"));
      const initialConstructionCount = dateTimeFormat.mock.calls.length;
      expect(initialConstructionCount).toBeGreaterThan(0);
      resolvePrayerState(feed, new Date("2026-09-15T18:00:01.000Z"));
      expect(dateTimeFormat).toHaveBeenCalledTimes(initialConstructionCount);

      resolvePrayerState(structuredClone(feed), new Date("2026-09-15T18:00:02.000Z"));
      expect(dateTimeFormat.mock.calls.length).toBeGreaterThan(initialConstructionCount);
    } finally {
      dateTimeFormat.mockRestore();
    }
  });

  it("has only one TV API: the production display feed", () => {
    const runtime = readFileSync(path.join(root, "lib/runtime/use-display-runtime.ts"), "utf8");
    expect(runtime).not.toContain("useTestControl");
    expect(runtime).not.toContain("testMode");
    expect(runtime).toContain('fetch("/api/display-feed"');
    expect(existsSync(path.join(root, "app/api/test-control/route.ts"))).toBe(false);
    expect(existsSync(path.join(root, "lib/runtime/use-test-control.ts"))).toBe(false);
  });
});
