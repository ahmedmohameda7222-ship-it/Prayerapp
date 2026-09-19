const LARGE_DRIFT_MS = 60_000;
const CONSISTENT_LARGE_DRIFT_TOLERANCE_MS = 2_000;

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

function requestMidpointMs(requestStartedAtMs: number, responseReceivedAtMs: number): number {
  return requestStartedAtMs + (responseReceivedAtMs - requestStartedAtMs) / 2;
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

      const observedDeviceNowMs = requestMidpointMs(
        requestStartedAtMs,
        responseReceivedAtMs,
      );
      const candidateOffsetMs = serverNowMs - observedDeviceNowMs;
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
