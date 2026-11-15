/**
 * TV presentation may request browser screen-wake permission. Silk/Fire OS can
 * ignore or reject it; synthetic mouse/key events never reset OS inactivity.
 */
export const SCREEN_WAKE_RECHECK_MS = 4 * 60_000;

export function installScreenWakeLock(): () => void {
  let sentinel: WakeLockSentinel | null = null;
  let acquiring = false;
  let disposed = false;

  const acquire = async () => {
    if (disposed || acquiring || document.visibilityState !== "visible" ||
        !("wakeLock" in navigator) || !navigator.wakeLock ||
        typeof navigator.wakeLock.request !== "function" ||
        (sentinel && !sentinel.released)) return;

    acquiring = true;
    try {
      const next = await navigator.wakeLock.request("screen");
      if (disposed || document.visibilityState !== "visible") {
        void next.release();
        return;
      }
      sentinel = next;
      next.addEventListener("release", () => {
        if (sentinel === next) sentinel = null;
      });
    } catch {
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
