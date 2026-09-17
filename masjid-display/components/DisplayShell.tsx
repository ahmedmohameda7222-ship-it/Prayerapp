import type { DisplayRuntimeViewModel } from "../lib/runtime/use-display-runtime";
import { DisplayMain } from "./DisplayMain";
import { Header } from "./Header";
import { PersistentAppQr } from "./PersistentAppQr";
import { PrayerStrip } from "./PrayerStrip";
import { UrgentBar } from "./UrgentBar";

export interface DisplayShellProps {
  vm: DisplayRuntimeViewModel;
}

export function DisplayShell({ vm }: DisplayShellProps) {
  return (
    <section className="display-shell" data-testid="display-shell">
      <Header vm={vm} />

      <main className="display-main" aria-live="polite">
        {vm.testMode ? (
          <div className="test-mode-badge" role="status">
            TEST MODE / وضع الاختبار
          </div>
        ) : null}
        <DisplayMain vm={vm} />
      </main>

      <UrgentBar items={vm.urgent} />
      <PrayerStrip vm={vm} />

      <footer className="display-footer">
        <PersistentAppQr publicAppUrl={vm.publicAppUrl} />
      </footer>
    </section>
  );
}
