import { describe, expect, it } from "vitest";
import {
  initialQiblaState,
  qiblaReducer,
  type LiveCompassBlockReason,
  type QiblaState,
} from "@/lib/qibla-state";

function bearingReady(): QiblaState {
  return qiblaReducer(
    qiblaReducer(initialQiblaState, { type: "LOCATE" }),
    { type: "LOCATION_READY", bearing: 132, source: "gps" },
  );
}

function liveState(heading = 100): QiblaState {
  const requested = qiblaReducer(bearingReady(), { type: "REQUEST_COMPASS" });
  return qiblaReducer(requested, { type: "TRUSTED_HEADING", heading });
}

describe("Qibla state machine", () => {
  it("moves idle -> locating -> bearing-ready without needing a compass", () => {
    const locating = qiblaReducer(initialQiblaState, { type: "LOCATE" });
    const ready = qiblaReducer(locating, {
      type: "LOCATION_READY",
      bearing: 132,
      source: "gps",
    });
    expect(locating.mode).toBe("locating");
    expect(ready.mode).toBe("bearing-ready");
    expect(ready.bearing).toBe(132);
  });

  it("moves bearing-ready -> requesting-compass -> live", () => {
    const requested = qiblaReducer(bearingReady(), { type: "REQUEST_COMPASS" });
    const live = qiblaReducer(requested, { type: "TRUSTED_HEADING", heading: 100 });
    expect(requested.mode).toBe("requesting-compass");
    expect(live.mode).toBe("live");
    expect(live.turnDelta).toBe(32);
  });

  it("uses hysteresis for live -> aligned -> live", () => {
    let state = liveState(128);
    expect(state.mode).toBe("aligned");

    state = qiblaReducer(state, { type: "TRUSTED_HEADING", heading: 127 });
    expect(state.mode).toBe("aligned");

    state = qiblaReducer(state, { type: "TRUSTED_HEADING", heading: 124 });
    expect(state.mode).toBe("live");
  });

  it.each([
    "permission-denied",
    "unsupported",
    "sensor-timeout",
    "relative-heading",
    "invalid-heading",
    "calibration-required",
    "magnetic-correction-unavailable",
    "landscape",
    "tilted",
  ] satisfies LiveCompassBlockReason[])(
    "preserves the bearing in bearing-only mode when blocked by %s",
    (reason) => {
      const blocked = qiblaReducer(liveState(), { type: "COMPASS_BLOCKED", reason });
      expect(blocked.mode).toBe("bearing-only");
      expect(blocked.bearing).toBe(132);
      expect(blocked.liveBlockReason).toBe(reason);
      expect(blocked.trueHeading).toBeNull();
    },
  );

  it("recovers from tilt after a fresh trustworthy heading", () => {
    const blocked = qiblaReducer(liveState(), {
      type: "COMPASS_BLOCKED",
      reason: "tilted",
    });
    const recovered = qiblaReducer(blocked, { type: "TRUSTED_HEADING", heading: 100 });
    expect(recovered.mode).toBe("live");
    expect(recovered.liveBlockReason).toBeNull();
  });

  it("recovers from landscape after a fresh trustworthy heading", () => {
    const blocked = qiblaReducer(liveState(), {
      type: "COMPASS_BLOCKED",
      reason: "landscape",
    });
    const recovered = qiblaReducer(blocked, { type: "TRUSTED_HEADING", heading: 100 });
    expect(recovered.mode).toBe("live");
  });

  it("keeps permission denial, relative-only sensors, timeout, invalid WebKit and WMM failure usable as bearing-only", () => {
    for (const reason of [
      "permission-denied",
      "relative-heading",
      "sensor-timeout",
      "invalid-heading",
      "magnetic-correction-unavailable",
    ] as const) {
      const requested = qiblaReducer(bearingReady(), { type: "REQUEST_COMPASS" });
      const blocked = qiblaReducer(requested, { type: "COMPASS_BLOCKED", reason });
      expect(blocked.mode).toBe("bearing-only");
      expect(blocked.bearing).toBe(132);
    }
  });

  it("moves location denial/failure to location-error and clears sensor-derived state", () => {
    const failed = qiblaReducer(liveState(), { type: "LOCATION_ERROR" });
    expect(failed.mode).toBe("location-error");
    expect(failed.bearing).toBeNull();
    expect(failed.trueHeading).toBeNull();
    expect(failed.liveBlockReason).toBeNull();
  });

  it("does not permit compass transitions before a bearing exists", () => {
    const requested = qiblaReducer(initialQiblaState, { type: "REQUEST_COMPASS" });
    const blocked = qiblaReducer(initialQiblaState, {
      type: "COMPASS_BLOCKED",
      reason: "unsupported",
    });
    const heading = qiblaReducer(initialQiblaState, { type: "TRUSTED_HEADING", heading: 90 });
    expect(requested).toBe(initialQiblaState);
    expect(blocked).toBe(initialQiblaState);
    expect(heading).toBe(initialQiblaState);
  });
});
