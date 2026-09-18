"use client";

import { useEffect, useMemo, useState } from "react";
import { DisplayShell } from "../components/DisplayShell";
import { pixelShiftForEpoch } from "../lib/pixel-shift";
import { useDisplayRuntime } from "../lib/runtime/use-display-runtime";
import { createWatchdog } from "../lib/runtime/watchdog";

const PIXEL_SHIFT_EPOCH_MS = 10 * 60_000;
const WATCHDOG_CHECK_MS = 30_000;
const WATCHDOG_HARD_FAILURE_MS = 120_000;

export default function Home() {
  const vm = useDisplayRuntime();
  const watchdog = useMemo(
    () => createWatchdog({ hardFailureMs: WATCHDOG_HARD_FAILURE_MS }),
    [],
  );
  const [diagnosticsEnabled, setDiagnosticsEnabled] = useState(false);

  useEffect(() => {
    setDiagnosticsEnabled(
      new URLSearchParams(window.location.search).get("diagnostics") === "1",
    );
  }, []);

  useEffect(() => {
    watchdog.heartbeat(Date.now());
  }, [watchdog, vm.logicalNow]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      if (watchdog.shouldReload(Date.now())) {
        window.location.reload();
      }
    }, WATCHDOG_CHECK_MS);

    return () => window.clearInterval(interval);
  }, [watchdog]);

  const pixelShift = useMemo(
    () => pixelShiftForEpoch(Math.floor(vm.logicalNow.getTime() / PIXEL_SHIFT_EPOCH_MS)),
    [vm.logicalNow],
  );

  return (
    <DisplayShell
      vm={vm}
      diagnosticsEnabled={diagnosticsEnabled}
      pixelShift={pixelShift}
    />
  );
}
