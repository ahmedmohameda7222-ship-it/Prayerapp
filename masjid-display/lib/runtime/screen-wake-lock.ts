/**
 * Screen Wake Lock is the only standard browser keep-awake mechanism.
 * Fire OS / Silk may ignore or reject it; no simulated user input is emitted.
 */
export const SCREEN_WAKE_RECHECK_MS = 4 * 60_000;
export const MANUAL_WAKE_RECHECK_MS = 60_000;
export const STAY_AWAKE_STORAGE_KEY = "prayerapp-tv-stay-awake";

export type TvWakeLockStatus =
  | "pending" | "active" | "unsupported" | "denied"
  | "hidden" | "released" | "off";

/**
 * Backward-compatible cleanup function with additional methods called
 * synchronously from a genuine click/remote event.
 */
export type ScreenWakeLockHandle = (() => void) & {
  requestStayAwake: () => void;
  stopStayAwake: () => void;
  isStayAwakeRequested: () => boolean;
};

function savedPreference(): "on" | "off" | null {
  try {
    const saved = window.localStorage.getItem(STAY_AWAKE_STORAGE_KEY);
    return saved === "on" || saved === "off" ? saved : null;
  } catch {
    return null;
  }
}

function storePreference(next: "on" | "off"): void {
  try {
    window.localStorage.setItem(STAY_AWAKE_STORAGE_KEY, next);
  } catch {
    // TV may deny localStorage in private browsing. Keep the session usable.
  }
}

export function installScreenWakeLock(onStatus?: (status: TvWakeLockStatus) => void): ScreenWakeLockHandle {
  const saved = savedPreference();
  let explicitlyRequested = saved === "on";
  // Preserve the existing automatic best-effort behavior on first visit.
  // A deliberate OFF remains OFF after refresh.
  let enabled = saved !== "off";
  let sentinel: WakeLockSentinel | null = null;
  let acquiring = false;
  let disposed = false;

  const report = (status: TvWakeLockStatus) => {
    if (!disposed) onStatus?.(status);
  };

  const acquire = async () => {
    if (disposed || !enabled || acquiring) return;
    if (document.visibilityState !== "visible") {
      report("hidden");
      return;
    }
    if (!("wakeLock" in navigator) || !navigator.wakeLock ||
        typeof navigator.wakeLock.request !== "function") {
      report("unsupported");
      return;
    }
    if (sentinel && !sentinel.released) {
      report("active");
      return;
    }

    acquiring = true;
    try {
      // Invoked directly from requestStayAwake() in the click handler too;
      // do not await or schedule anything before navigator.wakeLock.request.
      const next = await navigator.wakeLock.request("screen");
      if (disposed || !enabled || document.visibilityState !== "visible") {
        void next.release();
        if (enabled && !disposed) report("hidden");
        return;
      }

      sentinel = next;
      report("active");
      next.addEventListener("release", () => {
        if (sentinel === next) {
          sentinel = null;
          if (enabled) report("released");
        }
      });
    } catch {
      report("denied");
      // App remains fully functional; the OS may require a native TV app.
    } finally {
      acquiring = false;
    }
  };

  const recheck = () => { void acquire(); };
  document.addEventListener("visibilitychange", recheck);
  window.addEventListener("pageshow", recheck);
  window.addEventListener("online", recheck);
  const autoTimer = window.setInterval(recheck, SCREEN_WAKE_RECHECK_MS);
  const manualTimer = window.setInterval(() => {
    if (explicitlyRequested) recheck();
  }, MANUAL_WAKE_RECHECK_MS);
  recheck();

  const requestStayAwake = () => {
    if (disposed) return;
    enabled = true;
    explicitlyRequested = true;
    storePreference("on");
    report("pending");
    // Real activation: request is initiated before this handler returns.
    void acquire();
  };

  const stopStayAwake = () => {
    if (disposed) return;
    enabled = false;
    explicitlyRequested = false;
    storePreference("off");
    const held = sentinel;
    sentinel = null;
    report("off");
    if (held && !held.released) void held.release();
  };

  const dispose = () => {
    disposed = true;
    window.clearInterval(autoTimer);
    window.clearInterval(manualTimer);
    document.removeEventListener("visibilitychange", recheck);
    window.removeEventListener("pageshow", recheck);
    window.removeEventListener("online", recheck);
    const held = sentinel;
    sentinel = null;
    if (held && !held.released) void held.release();
  };

  return Object.assign(dispose, {
    requestStayAwake,
    stopStayAwake,
    isStayAwakeRequested: () => explicitlyRequested,
  });
}
