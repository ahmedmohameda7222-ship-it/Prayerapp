import type { DisplayRuntimeViewModel } from "../lib/runtime/use-display-runtime";
import { DiagnosticsPanel } from "./DiagnosticsPanel";
import { DisplayMain } from "./DisplayMain";
import { Header } from "./Header";
import { PersistentAppQr } from "./PersistentAppQr";
import { PrayerStrip } from "./PrayerStrip";
import { PresentationModeControl } from "./PresentationModeControl";
import { StatusOverlay } from "./StatusOverlay";
import { UrgentBar } from "./UrgentBar";

export interface DisplayShellProps {
  vm: DisplayRuntimeViewModel;
  diagnosticsEnabled?: boolean;
  testMode?: string | null;
  pixelShift?: { x: number; y: number };
}

export function DisplayShell({
  vm,
  diagnosticsEnabled = false,
  testMode = null,
  pixelShift = { x: 0, y: 0 },
}: DisplayShellProps) {
  // Congregation blackout bypasses the entire shell. It must be literally black:
  // no clock, prayer rail, QR, diagnostics, alerts, controls, pixel shift or badge.
  if (vm.state?.kind === "PRAYER_IN_PROGRESS") {
    return (
      <div
        data-testid="prayer-blackout"
        style={{ position: "fixed", inset: "0", backgroundColor: "#000000", zIndex: 2147483647 }}
      />
    );
  }
  const isPostPrayer = vm.state?.kind === "POST_PRAYER_AZKAR";

  return (
    <section
      className="display-shell tv-v2"
      data-testid="display-shell"
      data-tv-test={testMode ? "active" : undefined}
      data-display-mode={isPostPrayer ? "post-prayer" : undefined}
      style={{ transform: `translate3d(${pixelShift.x}px, ${pixelShift.y}px, 0)` }}
    >
      {!isPostPrayer ? <Header vm={vm} /> : null}

      <main className="display-main tv-hero" data-testid="tv-hero" data-layout={vm.state?.kind.toLowerCase().replaceAll("_", "-") ?? "initial-loading"} aria-live="polite">
        {testMode ? (
          <aside className="tv-test-badge" role="status" data-testid="tv-test-badge">
            TV TEST MODE · {testMode}
          </aside>
        ) : null}
        <DisplayMain vm={vm} />
        {vm.feed && !isPostPrayer ? (
          <StatusOverlay
            networkAvailable={vm.networkAvailable}
            usingLkg={vm.usingLkg}
            prayerScheduleStale={vm.prayerScheduleStale}
          />
        ) : null}
      </main>

      {!isPostPrayer ? (
        <UrgentBar items={vm.state?.kind === "JUMUAH_NOW" ? [] : vm.urgent} logicalNow={vm.logicalNow} />
      ) : null}
      {!isPostPrayer ? (
        <div className="tv-prayer-dock" data-testid="tv-prayer-dock">
          <PrayerStrip vm={vm} />
          <PersistentAppQr publicAppUrl={vm.publicAppUrl} />
        </div>
      ) : null}

      {!isPostPrayer ? (
        <footer className="display-footer">
          <div className="presentation-mode-slot">
            <PresentationModeControl />
          </div>
        </footer>
      ) : null}

      <DiagnosticsPanel enabled={diagnosticsEnabled} vm={vm} />
    </section>
  );
}
