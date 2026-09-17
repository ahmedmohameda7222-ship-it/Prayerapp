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
  return {
    observeServerDate() {
      return { accepted: false, offsetMs: 0, pendingLargeDrift: false };
    },
    now(deviceNowMs) {
      return new Date(deviceNowMs);
    },
  };
}
