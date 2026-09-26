import { describe, expect, it } from "vitest";
import { createWatchdog } from "./watchdog";

describe("display runtime watchdog", () => {
  it("does not request reload for ordinary timer throttling followed by a heartbeat", () => {
    const watchdog = createWatchdog({ hardFailureMs: 120_000 });

    watchdog.heartbeat(0);
    expect(watchdog.shouldReload(90_000)).toBe(false);

    watchdog.heartbeat(90_001);
    expect(watchdog.shouldReload(180_000)).toBe(false);
  });

  it("requests reload only after the renderer misses the hard-failure threshold", () => {
    const watchdog = createWatchdog({ hardFailureMs: 120_000 });

    expect(watchdog.shouldReload(500_000)).toBe(false);
    watchdog.heartbeat(10_000);

    expect(watchdog.shouldReload(129_999)).toBe(false);
    expect(watchdog.shouldReload(130_000)).toBe(true);
  });

  it("a fresh heartbeat clears a prior hard-failure decision", () => {
    const watchdog = createWatchdog({ hardFailureMs: 120_000 });
    watchdog.heartbeat(0);
    expect(watchdog.shouldReload(120_000)).toBe(true);

    watchdog.heartbeat(120_001);
    expect(watchdog.shouldReload(120_001)).toBe(false);
  });
});
