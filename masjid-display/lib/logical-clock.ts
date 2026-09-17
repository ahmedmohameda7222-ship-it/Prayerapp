const LARGE_DRIFT_MS = 60_000;
const CONSISTENT_LARGE_DRIFT_TOLERANCE_MS = 2_000;

export interface ClockObservation {
  accepted: boolean;
  offsetMs: number;
  pendingLargeDrift: boolean;
}

export interface LogicalClock {
  observeServerDate(deviceNowMs: number, serverDateHeader: string): ClockObservation;
  now(deviceNowMs: number): Date;
}

export function createLogicalClock(): LogicalClock {
  let offsetMs = 0;
  let hasValidatedOffset = false;
  let pendingLargeOffsetMs: number | null = null;

  const observation = (accepted: boolean): ClockObservation => ({
    accepted,
    offsetMs,
    pendingLargeDrift: pendingLargeOffsetMs !== null,
  });

  return {
    observeServerDate(deviceNowMs, serverDateHeader) {
      const serverNowMs = Date.parse(serverDateHeader);
      if (!Number.isFinite(deviceNowMs) || !Number.isFinite(serverNowMs)) {
        return observation(false);
      }

      const candidateOffsetMs = serverNowMs - deviceNowMs;
      if (!hasValidatedOffset) {
        offsetMs = candidateOffsetMs;
        hasValidatedOffset = true;
        pendingLargeOffsetMs = null;
        return observation(true);
      }

      if (Math.abs(candidateOffsetMs - offsetMs) <= LARGE_DRIFT_MS) {
        offsetMs = candidateOffsetMs;
        pendingLargeOffsetMs = null;
        return observation(true);
      }

      if (
        pendingLargeOffsetMs !== null &&
        Math.abs(candidateOffsetMs - pendingLargeOffsetMs) <= CONSISTENT_LARGE_DRIFT_TOLERANCE_MS
      ) {
        offsetMs = candidateOffsetMs;
        pendingLargeOffsetMs = null;
        return observation(true);
      }

      pendingLargeOffsetMs = candidateOffsetMs;
      return observation(false);
    },

    now(deviceNowMs) {
      return new Date(deviceNowMs + offsetMs);
    },
  };
}
