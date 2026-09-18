import { describe, expect, it } from "vitest";
import { createLogicalClock } from "./logical-clock";

describe("LogicalClock", () => {
  it("uses a validated server offset for a zero-latency observation", () => {
    const clock = createLogicalClock();
    const deviceNow = Date.parse("2026-09-15T18:00:05Z");
    const observation = clock.observeServerDate(
      deviceNow,
      deviceNow,
      "Tue, 15 Sep 2026 18:00:00 GMT",
    );

    expect(observation.accepted).toBe(true);
    expect(observation.offsetMs).toBe(-5_000);
    expect(clock.now(Date.parse("2026-09-15T18:01:05Z")).toISOString()).toBe(
      "2026-09-15T18:01:00.000Z",
    );
  });

  it("uses the request/response midpoint for low-latency observations", () => {
    const clock = createLogicalClock();
    const observation = clock.observeServerDate(
      Date.parse("2026-09-15T18:00:04.900Z"),
      Date.parse("2026-09-15T18:00:05.100Z"),
      "Tue, 15 Sep 2026 18:00:05 GMT",
    );

    expect(observation.accepted).toBe(true);
    expect(observation.offsetMs).toBe(0);
  });

  it("does not turn multi-second request latency into clock drift", () => {
    const clock = createLogicalClock();
    const observation = clock.observeServerDate(
      Date.parse("2026-09-15T18:00:00Z"),
      Date.parse("2026-09-15T18:00:04Z"),
      "Tue, 15 Sep 2026 18:00:02 GMT",
    );

    expect(observation.accepted).toBe(true);
    expect(observation.offsetMs).toBe(0);
    expect(clock.now(Date.parse("2026-09-15T18:01:04Z")).toISOString()).toBe(
      "2026-09-15T18:01:04.000Z",
    );
  });

  it("updates repeated small drift observations from their midpoints", () => {
    const clock = createLogicalClock();
    clock.observeServerDate(
      Date.parse("2026-09-15T18:00:00Z"),
      Date.parse("2026-09-15T18:00:04Z"),
      "Tue, 15 Sep 2026 18:00:02 GMT",
    );

    const observation = clock.observeServerDate(
      Date.parse("2026-09-15T18:05:09Z"),
      Date.parse("2026-09-15T18:05:11Z"),
      "Tue, 15 Sep 2026 18:05:00 GMT",
    );

    expect(observation.accepted).toBe(true);
    expect(observation.offsetMs).toBe(-10_000);
    expect(clock.now(Date.parse("2026-09-15T18:06:10Z")).toISOString()).toBe(
      "2026-09-15T18:06:00.000Z",
    );
  });

  it("requires a second consistent midpoint observation before adopting large drift", () => {
    const clock = createLogicalClock();
    const base = Date.parse("2026-09-15T18:00:05Z");
    clock.observeServerDate(base, base, "Tue, 15 Sep 2026 18:00:00 GMT");

    const firstLarge = clock.observeServerDate(
      Date.parse("2026-09-15T18:10:00Z"),
      Date.parse("2026-09-15T18:10:04Z"),
      "Tue, 15 Sep 2026 18:15:02 GMT",
    );
    expect(firstLarge.accepted).toBe(false);
    expect(firstLarge.pendingLargeDrift).toBe(true);
    expect(clock.now(Date.parse("2026-09-15T18:10:04Z")).toISOString()).toBe(
      "2026-09-15T18:09:59.000Z",
    );

    const secondLarge = clock.observeServerDate(
      Date.parse("2026-09-15T18:10:10Z"),
      Date.parse("2026-09-15T18:10:14Z"),
      "Tue, 15 Sep 2026 18:15:12 GMT",
    );
    expect(secondLarge.accepted).toBe(true);
    expect(secondLarge.pendingLargeDrift).toBe(false);
    expect(clock.now(Date.parse("2026-09-15T18:10:14Z")).toISOString()).toBe(
      "2026-09-15T18:15:14.000Z",
    );
  });

  it("ignores an invalid server Date signal", () => {
    const clock = createLogicalClock();
    const first = Date.parse("2026-09-15T18:00:05Z");
    clock.observeServerDate(first, first, "Tue, 15 Sep 2026 18:00:00 GMT");

    const next = Date.parse("2026-09-15T18:01:05Z");
    const invalid = clock.observeServerDate(next, next, "not-a-date");
    expect(invalid.accepted).toBe(false);
    expect(clock.now(next).toISOString()).toBe("2026-09-15T18:01:00.000Z");
  });
});
