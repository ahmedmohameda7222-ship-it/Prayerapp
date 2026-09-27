const COARSE_DATE_JITTER_TOLERANCE_MS = 1_500;
const CONSISTENT_DRIFT_TOLERANCE_MS = 2_000;

export interface ClockObservation {
  accepted: boolean;
  offsetMs: number;
  pendingLargeDrift: boolean;
}

export interface LogicalClock {
  observeServerDate(
    requestStartedAtMs: number,
    responseReceivedAtMs: number,
    serverDateHeader: string,
  ): ClockObservation;
  now(deviceNowMs: number): Date;
}

export function createLogicalClock(): LogicalClock {
  let offsetMs = 0;
  let hasValidatedOffset = false;
  let pendingOffsetMs: number | null = null;

  const observation = (accepted: boolean): ClockObservation => ({
    accepted,
    offsetMs,
    pendingLargeDrift: pendingOffsetMs !== null,
  });

  return {
    observeServerDate(requestStartedAtMs, responseReceivedAtMs, serverDateHeader) {
      const serverNowMs = Date.parse(serverDateHeader);
      if (
        !Number.isFinite(requestStartedAtMs) ||
        !Number.isFinite(responseReceivedAtMs) ||
        responseReceivedAtMs < requestStartedAtMs ||
        !Number.isFinite(serverNowMs)
      ) {
        return observation(false);
      }

      // HTTP Date describes when the response was originated, so calibrate it
      // against response receipt. Using the request midpoint turns variable
      // server processing time into false clock drift.
      const candidateOffsetMs = serverNowMs - responseReceivedAtMs;

      if (!hasValidatedOffset) {
        offsetMs = candidateOffsetMs;
        hasValidatedOffset = true;
        pendingOffsetMs = null;
        return observation(true);
      }

      const driftFromAcceptedOffsetMs = candidateOffsetMs - offsetMs;
      if (Math.abs(driftFromAcceptedOffsetMs) <= COARSE_DATE_JITTER_TOLERANCE_MS) {
        pendingOffsetMs = null;
        return observation(true);
      }

      if (
        pendingOffsetMs !== null &&
        Math.abs(candidateOffsetMs - pendingOffsetMs) <= CONSISTENT_DRIFT_TOLERANCE_MS
      ) {
        offsetMs = candidateOffsetMs;
        pendingOffsetMs = null;
        return observation(true);
      }

      pendingOffsetMs = candidateOffsetMs;
      return observation(false);
    },

    now(deviceNowMs) {
      return new Date(deviceNowMs + offsetMs);
    },
  };
}
