"use client";

import type { TvWakeLockStatus } from "../lib/runtime/screen-wake-lock";

export interface StayAwakeControlProps {
  requested: boolean;
  status: TvWakeLockStatus;
  onToggle: () => void;
}

/** A one-time user gesture requests a persistent, best-effort browser lock. */
export function StayAwakeControl({ requested, status, onToggle }: StayAwakeControlProps) {
  let message: string | null = null;
  let warning = false;
  if (requested) {
    if (status === "active") {
      message = "Browser Wake Lock active · متفعّل في المتصفح";
    } else if (status === "unsupported") {
      message = "Not supported by browser · غير مدعوم. Use Fire TV Kiosk.";
      warning = true;
    } else if (status === "denied") {
      message = "Wake Lock blocked by browser · المتصفح رفض الطلب. Use Fire TV Kiosk.";
      warning = true;
    } else {
      message = "Wake Lock pending/reconnecting · جارٍ إعادة التفعيل";
    }
  }
  return (
    <div className="stay-awake-control" data-testid="stay-awake-control">
      <button
        className="stay-awake-button"
        type="button"
        aria-pressed={requested}
        data-wake-status={status}
        onClick={onToggle}
        title="Request browser keep-awake once. Automatic retries while this page remains active."
      >
        Stay Awake {requested ? "ON" : "OFF"}
      </button>
      {message ? (
        <span className="stay-awake-status" role={warning ? "alert" : "status"}>
          {message}
        </span>
      ) : null}
    </div>
  );
}
