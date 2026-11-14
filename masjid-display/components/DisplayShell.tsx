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
  pixelShift?: { x: number; y: number };
}

export function DisplayShell({
  vm,
  diagnosticsEnabled = false,
  pixelShift = { x: 0, y: 0 },
}: DisplayShellProps) {
  return (
    <section
      className="display-shell tv-v2"
      data-testid="display-shell"
      style={{ transform: `translate3d(${pixelShift.x}px, ${pixelShift.y}px, 0)` }}
    >
      <Header vm={vm} />

      <main className="display-main tv-hero" data-testid="tv-hero" data-layout={vm.state?.kind.toLowerCase().replaceAll("_", "-") ?? "initial-loading"} aria-live="polite">
        <DisplayMain vm={vm} />
        {vm.feed ? (
          <StatusOverlay
            networkAvailable={vm.networkAvailable}
            usingLkg={vm.usingLkg}
            prayerScheduleStale={vm.prayerScheduleStale}
          />
        ) : null}
      </main>

      <UrgentBar items={vm.urgent} logicalNow={vm.logicalNow} />
      <div className="tv-prayer-dock" data-testid="tv-prayer-dock">
        <PrayerStrip vm={vm} />
        <PersistentAppQr publicAppUrl={vm.publicAppUrl} />
      </div>

      <footer className="display-footer">
        <div className="presentation-mode-slot">
          <PresentationModeControl />
        </div>
      </footer>

      <DiagnosticsPanel enabled={diagnosticsEnabled} vm={vm} />
    </section>
  );
}
