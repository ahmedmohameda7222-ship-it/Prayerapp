"use client";

import { useEffect, useState } from "react";
import { parseTvTestStatus, type TvTestCommand } from "./tv-test-presenter";

/** Polls independently of the 120s prayer Feed. Failure retains only an unexpired command. */
export function useTvTestCommand(): TvTestCommand | null {
  const [command, setCommand] = useState<TvTestCommand | null>(null);

  useEffect(() => {
    let disposed = false;
    let fetching = false;

    const poll = async () => {
      if (disposed || fetching) return;
      fetching = true;
      try {
        const response = await fetch("/api/tv-test", { cache: "no-store" });
        if (!response.ok) return;
        const payload: unknown = await response.json();
        // The TV's wall clock can drift. Prefer the trusted same-origin
        // response Date; the presentation also revalidates against the
        // Feed-corrected logical clock before showing any test.
        const serverDate = response.headers.get("date");
        const parsedServerDate = serverDate ? Date.parse(serverDate) : NaN;
        const checkNow = Number.isFinite(parsedServerDate) ? new Date(parsedServerDate) : new Date();
        if (!disposed) setCommand(parseTvTestStatus(payload, checkNow));
      } catch {
        // Never extend a stale test command if the network is unavailable.
      } finally {
        fetching = false;
      }
    };

    void poll();
    const timer = window.setInterval(() => void poll(), 3_000);
    const online = () => void poll();
    const visible = () => { if (document.visibilityState === "visible") void poll(); };
    window.addEventListener("online", online);
    document.addEventListener("visibilitychange", visible);
    return () => {
      disposed = true;
      window.clearInterval(timer);
      window.removeEventListener("online", online);
      document.removeEventListener("visibilitychange", visible);
    };
  }, []);

  return command;
}
