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

  it("calibrates HTTP Date against response receipt rather than request midpoint", () => {
    const clock = createLogicalClock();
    const observation = clock.observeServerDate(
      Date.parse("2026-09-15T18:00:04.900Z"),
      Date.parse("2026-09-15T18:00:05.100Z"),
      "Tue, 15 Sep 2026 18:00:05 GMT",
    );

    expect(observation.accepted).toBe(true);
    expect(observation.offsetMs).toBe(-100);
  });

  it("does not turn slow server processing into clock drift", () => {
    const clock = createLogicalClock();
    const observation = clock.observeServerDate(
      Date.parse("2026-09-15T18:00:00Z"),
      Date.parse("2026-09-15T18:00:04Z"),
      "Tue, 15 Sep 2026 18:00:04 GMT",
    );

    expect(observation.accepted).toBe(true);
    expect(observation.offsetMs).toBe(0);
    expect(clock.now(Date.parse("2026-09-15T18:01:04Z")).toISOString()).toBe(
      "2026-09-15T18:01:04.000Z",
    );
  });

  it("requires a second consistent observation before adopting moderate drift", () => {
    const clock = createLogicalClock();
    const base = Date.parse("2026-09-15T18:00:00Z");
    clock.observeServerDate(base, base, "Tue, 15 Sep 2026 18:00:00 GMT");

    const first = clock.observeServerDate(
      Date.parse("2026-09-15T18:05:08Z"),
      Date.parse("2026-09-15T18:05:10Z"),
      "Tue, 15 Sep 2026 18:05:00 GMT",
    );

    expect(first.accepted).toBe(false);
    expect(first.pendingLargeDrift).toBe(true);
    expect(first.offsetMs).toBe(0);

    const second = clock.observeServerDate(
      Date.parse("2026-09-15T18:05:18Z"),
      Date.parse("2026-09-15T18:05:20Z"),
      "Tue, 15 Sep 2026 18:05:10 GMT",
    );

    expect(second.accepted).toBe(true);
    expect(second.pendingLargeDrift).toBe(false);
    expect(second.offsetMs).toBe(-10_000);
  });

  it("does not let one slow response move a validated clock", () => {
    const clock = createLogicalClock();
    const base = Date.parse("2026-09-15T18:00:05.500Z");
    clock.observeServerDate(base, base, "Tue, 15 Sep 2026 18:00:05 GMT");

    const slow = clock.observeServerDate(
      Date.parse("2026-09-15T18:00:07.000Z"),
      Date.parse("2026-09-15T18:00:11.000Z"),
      "Tue, 15 Sep 2026 18:00:11 GMT",
    );

    expect(slow.offsetMs).toBe(-500);
    expect(clock.now(Date.parse("2026-09-15T18:00:12.500Z")).toISOString()).toBe(
      "2026-09-15T18:00:12.000Z",
    );
  });

  it("requires a second consistent response-time observation before adopting large drift", () => {
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
      "2026-09-15T18:15:12.000Z",
    );
  });

  it("keeps a validated offset stable across sub-second HTTP Date jitter", () => {
    const clock = createLogicalClock();
    const firstDeviceNow = Date.parse("2026-09-15T18:00:05.500Z");
    const first = clock.observeServerDate(
      firstDeviceNow,
      firstDeviceNow,
      "Tue, 15 Sep 2026 18:00:05 GMT",
    );

    expect(first.accepted).toBe(true);
    expect(first.offsetMs).toBe(-500);

    const earlyInSecond = Date.parse("2026-09-15T18:00:07.050Z");
    const early = clock.observeServerDate(
      earlyInSecond,
      earlyInSecond,
      "Tue, 15 Sep 2026 18:00:07 GMT",
    );
    expect(early.accepted).toBe(true);
    expect(early.offsetMs).toBe(-500);

    const lateInSecond = Date.parse("2026-09-15T18:00:09.950Z");
    const late = clock.observeServerDate(
      lateInSecond,
      lateInSecond,
      "Tue, 15 Sep 2026 18:00:09 GMT",
    );
    expect(late.accepted).toBe(true);
    expect(late.offsetMs).toBe(-500);
    expect(clock.now(Date.parse("2026-09-15T18:00:10.500Z")).toISOString()).toBe(
      "2026-09-15T18:00:10.000Z",
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
