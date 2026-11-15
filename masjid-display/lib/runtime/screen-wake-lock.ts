/**
 * TV presentation may request browser screen-wake permission. Silk/Fire OS can
 * ignore or reject it; synthetic mouse/key events never reset OS inactivity.
 */
export const SCREEN_WAKE_RECHECK_MS = 4 * 60_000;

export type TvWakeLockStatus = "pending" | "active" | "unsupported" | "denied" | "hidden" | "released";

export function installScreenWakeLock(onStatus?: (status: TvWakeLockStatus) => void): () => void {
  let sentinel: WakeLockSentinel | null = null;
  let acquiring = false;
  let disposed = false;

  const acquire = async () => {
    if (disposed || acquiring) return;
    if (document.visibilityState !== "visible") {
      onStatus?.("hidden");
      return;
    }
    if (!("wakeLock" in navigator) || !navigator.wakeLock ||
        typeof navigator.wakeLock.request !== "function") {
      onStatus?.("unsupported");
      return;
    }
    if (sentinel && !sentinel.released) return;

    acquiring = true;
    try {
      const next = await navigator.wakeLock.request("screen");
      if (disposed || document.visibilityState !== "visible") {
        void next.release();
        if (!disposed) onStatus?.("hidden");
        return;
      }
      sentinel = next;
      onStatus?.("active");
      next.addEventListener("release", () => {
        if (sentinel === next) {
          sentinel = null;
          if (!disposed) onStatus?.("released");
        }
      });
    } catch {
      if (!disposed) onStatus?.("denied");
      // The TV must keep presenting even if Silk denies this API.
    } finally {
      acquiring = false;
    }
  };

  const recheck = () => { void acquire(); };
  document.addEventListener("visibilitychange", recheck);
  window.addEventListener("pageshow", recheck);
  window.addEventListener("online", recheck);
  const timer = window.setInterval(recheck, SCREEN_WAKE_RECHECK_MS);
  recheck();

  return () => {
    disposed = true;
    window.clearInterval(timer);
    document.removeEventListener("visibilitychange", recheck);
    window.removeEventListener("pageshow", recheck);
    window.removeEventListener("online", recheck);
    const held = sentinel;
    sentinel = null;
    if (held && !held.released) void held.release();
  };
}
