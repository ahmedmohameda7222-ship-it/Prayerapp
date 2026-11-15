"use client";

import { useEffect, useState } from "react";
import { parseGermanKhutbah, type GermanFridayKhutbah } from "../friday-khutbah";

/**
 * Only fetch the published German sermon during JUMUAH_NOW.
 * Same-date in-memory fallback survives transient offline periods.
 * Never reuse a sermon for a different Friday.
 */
export function useGermanFridayKhutbah(date: string | null): GermanFridayKhutbah | null {
  const [lastGood, setLastGood] = useState<GermanFridayKhutbah | null>(null);

  useEffect(() => {
    if (!date) return;
    let disposed = false;
    let fetching = false;

    const refresh = async () => {
      if (disposed || fetching) return;
      fetching = true;
      try {
        const response = await fetch(`/api/khutbah?date=${encodeURIComponent(date)}`, { cache: "no-store" });
        if (!response.ok) return;
        const payload: unknown = await response.json();
        if (!disposed) {
          // null is an authoritative published-content absence;
          // do not keep old published text after an unpublish response.
          setLastGood(parseGermanKhutbah(payload, date));
        }
      } catch {
        // Preserve only a still-same-date trusted copy in memory.
      } finally {
        fetching = false;
      }
    };

    void refresh();
    const timer = window.setInterval(() => void refresh(), 60_000);
    const online = () => void refresh();
    const visible = () => { if (document.visibilityState === "visible") void refresh(); };
    window.addEventListener("online", online);
    document.addEventListener("visibilitychange", visible);
    return () => {
      disposed = true;
      window.clearInterval(timer);
      window.removeEventListener("online", online);
      document.removeEventListener("visibilitychange", visible);
    };
  }, [date]);

  return lastGood?.date === date ? lastGood : null;
}
