import type { DisplayRuntimeViewModel } from "../lib/runtime/use-display-runtime";
import { DiagnosticsPanel } from "./DiagnosticsPanel";
import { DisplayMain } from "./DisplayMain";
import { Header } from "./Header";
import { PersistentAppQr } from "./PersistentAppQr";
import { PrayerStrip } from "./PrayerStrip";
import { PresentationModeControl } from "./PresentationModeControl";
import { StatusOverlay } from "./StatusOverlay";
import { TestModeBadge } from "./TestModeBadge";
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
      className="display-shell"
      data-testid="display-shell"
      style={{ transform: `translate3d(${pixelShift.x}px, ${pixelShift.y}px, 0)` }}
    >
      <Header vm={vm} />

      <main className="display-main" aria-live="polite">
        {vm.testMode ? <TestModeBadge /> : null}
        <DisplayMain vm={vm} />
        <StatusOverlay
          networkAvailable={vm.networkAvailable}
          usingLkg={vm.usingLkg}
          prayerScheduleStale={vm.prayerScheduleStale}
        />
      </main>

      <UrgentBar items={vm.urgent} logicalNow={vm.logicalNow} />
      <PrayerStrip vm={vm} />

      <footer className="display-footer">
        <div className="presentation-mode-slot">
          <PresentationModeControl />
        </div>
        <PersistentAppQr publicAppUrl={vm.publicAppUrl} />
      </footer>

      <DiagnosticsPanel enabled={diagnosticsEnabled} vm={vm} />
    </section>
  );
}
