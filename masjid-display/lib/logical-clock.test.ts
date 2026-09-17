import { describe, expect, it } from "vitest";
import { createLogicalClock } from "./logical-clock";

describe("LogicalClock", () => {
  it("uses a validated server offset", () => {
    const clock = createLogicalClock();
    const observation = clock.observeServerDate(
      Date.parse("2026-09-15T18:00:05Z"),
      "Tue, 15 Sep 2026 18:00:00 GMT",
    );

    expect(observation.accepted).toBe(true);
    expect(observation.offsetMs).toBe(-5_000);
    expect(clock.now(Date.parse("2026-09-15T18:01:05Z")).toISOString()).toBe(
      "2026-09-15T18:01:00.000Z",
    );
  });

  it("updates small drift immediately", () => {
    const clock = createLogicalClock();
    clock.observeServerDate(
      Date.parse("2026-09-15T18:00:05Z"),
      "Tue, 15 Sep 2026 18:00:00 GMT",
    );

    const observation = clock.observeServerDate(
      Date.parse("2026-09-15T18:05:10Z"),
      "Tue, 15 Sep 2026 18:05:00 GMT",
    );

    expect(observation.accepted).toBe(true);
    expect(clock.now(Date.parse("2026-09-15T18:06:10Z")).toISOString()).toBe(
      "2026-09-15T18:06:00.000Z",
    );
  });

  it("requires a second consistent observation before adopting large drift", () => {
    const clock = createLogicalClock();
    clock.observeServerDate(
      Date.parse("2026-09-15T18:00:05Z"),
      "Tue, 15 Sep 2026 18:00:00 GMT",
    );

    const firstLarge = clock.observeServerDate(
      Date.parse("2026-09-15T18:10:00Z"),
      "Tue, 15 Sep 2026 18:15:00 GMT",
    );
    expect(firstLarge.accepted).toBe(false);
    expect(firstLarge.pendingLargeDrift).toBe(true);
    expect(clock.now(Date.parse("2026-09-15T18:10:00Z")).toISOString()).toBe(
      "2026-09-15T18:09:55.000Z",
    );

    const secondLarge = clock.observeServerDate(
      Date.parse("2026-09-15T18:10:10Z"),
      "Tue, 15 Sep 2026 18:15:10 GMT",
    );
    expect(secondLarge.accepted).toBe(true);
    expect(secondLarge.pendingLargeDrift).toBe(false);
    expect(clock.now(Date.parse("2026-09-15T18:10:10Z")).toISOString()).toBe(
      "2026-09-15T18:15:10.000Z",
    );
  });

  it("ignores an invalid server Date signal", () => {
    const clock = createLogicalClock();
    clock.observeServerDate(
      Date.parse("2026-09-15T18:00:05Z"),
      "Tue, 15 Sep 2026 18:00:00 GMT",
    );

    const invalid = clock.observeServerDate(Date.parse("2026-09-15T18:01:05Z"), "not-a-date");
    expect(invalid.accepted).toBe(false);
    expect(clock.now(Date.parse("2026-09-15T18:01:05Z")).toISOString()).toBe(
      "2026-09-15T18:01:00.000Z",
    );
  });
});
