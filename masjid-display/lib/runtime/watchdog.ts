export interface WatchdogOptions {
  hardFailureMs: number;
}

export interface DisplayWatchdog {
  heartbeat(nowMs: number): void;
  shouldReload(nowMs: number): boolean;
}

export function createWatchdog({ hardFailureMs }: WatchdogOptions): DisplayWatchdog {
  if (!Number.isFinite(hardFailureMs) || hardFailureMs <= 0) {
    throw new Error("hardFailureMs must be a positive finite number");
  }

  let lastHeartbeatMs: number | null = null;

  return {
    heartbeat(nowMs: number) {
      if (!Number.isFinite(nowMs)) return;
      lastHeartbeatMs = nowMs;
    },

    shouldReload(nowMs: number) {
      if (lastHeartbeatMs === null || !Number.isFinite(nowMs)) return false;
      return nowMs - lastHeartbeatMs >= hardFailureMs;
    },
  };
}
