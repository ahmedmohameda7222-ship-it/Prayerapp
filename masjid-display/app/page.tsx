"use client";

import { useEffect, useMemo, useSyncExternalStore } from "react";
import { DisplayShell } from "../components/DisplayShell";
import { pixelShiftForEpoch } from "../lib/pixel-shift";
import { useDisplayRuntime } from "../lib/runtime/use-display-runtime";
import { useGermanFridayKhutbah } from "../lib/runtime/use-german-friday-khutbah";
import { localDateIso } from "../lib/time";
import { useTvTestCommand } from "../lib/runtime/use-tv-test-command";
import { applyTvTestCommand, parseTvTestStatus } from "../lib/runtime/tv-test-presenter";
import { createWatchdog } from "../lib/runtime/watchdog";

const PIXEL_SHIFT_EPOCH_MS = 10 * 60_000;
const WATCHDOG_CHECK_MS = 30_000;
const WATCHDOG_HARD_FAILURE_MS = 120_000;

function subscribeToLocation(onStoreChange: () => void) {
  window.addEventListener("popstate", onStoreChange);
  return () => window.removeEventListener("popstate", onStoreChange);
}

function diagnosticsFromLocation() {
  return new URLSearchParams(window.location.search).get("diagnostics") === "1";
}

function diagnosticsOnServer() {
  return false;
}

export default function Home() {
  const liveVm = useDisplayRuntime();
  const remoteCommand = useTvTestCommand();
  // Read test status independently from the production Feed; expire locally
  // even if the status endpoint is unreachable or the browser was sleeping.
  const activeTest = parseTvTestStatus(
    { active: remoteCommand !== null, command: remoteCommand },
    liveVm.logicalNow,
  );
  const presentationVm = applyTvTestCommand(liveVm, activeTest);
  // Preload published German sermon during Friday countdown as well, so a
  // brief network outage at Jumuah start does not lose already fetched text.
  const fridayDate = (presentationVm.state?.kind === "FRIDAY_MODE" || presentationVm.state?.kind === "JUMUAH_NOW") && presentationVm.feed
    ? localDateIso(presentationVm.logicalNow, presentationVm.feed.timezone)
    : null;
  const germanKhutbah = useGermanFridayKhutbah(fridayDate);
  const vm = { ...presentationVm, fridayKhutbah: germanKhutbah };
  const watchdog = useMemo(
    () => createWatchdog({ hardFailureMs: WATCHDOG_HARD_FAILURE_MS }),
    [],
  );
  const diagnosticsEnabled = useSyncExternalStore(
    subscribeToLocation,
    diagnosticsFromLocation,
    diagnosticsOnServer,
  );

  useEffect(() => {
    watchdog.heartbeat(Date.now());
  }, [watchdog, vm.logicalNow]);

  useEffect(() => {
    const resetAfterWake = () => {
      if (document.visibilityState === "visible") {
        watchdog.heartbeat(Date.now());
      }
    };

    document.addEventListener("visibilitychange", resetAfterWake);
    window.addEventListener("pageshow", resetAfterWake);
    return () => {
      document.removeEventListener("visibilitychange", resetAfterWake);
      window.removeEventListener("pageshow", resetAfterWake);
    };
  }, [watchdog]);

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
      testMode={activeTest && liveVm.feed ? activeTest.scenario : null}
      diagnosticsEnabled={diagnosticsEnabled}
      pixelShift={pixelShift}
    />
  );
}
