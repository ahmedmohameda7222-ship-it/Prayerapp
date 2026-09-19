import type { DisplayRuntimeViewModel } from "../lib/runtime/use-display-runtime";

export interface DiagnosticsPanelProps {
  enabled: boolean;
  vm: DisplayRuntimeViewModel;
}

function coverage(vm: DisplayRuntimeViewModel) {
  const schedule = vm.feed?.prayers.schedule ?? [];
  if (schedule.length === 0) return "unavailable";
  return `${schedule[0].date} → ${schedule[schedule.length - 1].date}`;
}

export function DiagnosticsPanel({ enabled, vm }: DiagnosticsPanelProps) {
  if (!enabled) return null;

  const diagnostics = vm.diagnostics;

  return (
    <aside className="diagnostics-panel" data-testid="diagnostics-panel" aria-label="Display diagnostics">
      <h2>Diagnostics</h2>
      <dl>
        <dt>App</dt>
        <dd>{process.env.NEXT_PUBLIC_APP_VERSION ?? "development"}</dd>
        <dt>Schema</dt>
        <dd>{vm.feed?.schemaVersion ?? "none"}</dd>
        <dt>Snapshot</dt>
        <dd>{vm.feed?.snapshotRevision ?? "none"}</dd>
        <dt>Generated</dt>
        <dd>{vm.feed?.generatedAt ?? "none"}</dd>
        <dt>Last attempt</dt>
        <dd>{diagnostics?.lastAttemptAt ?? "none"}</dd>
        <dt>Last sync</dt>
        <dd>{diagnostics?.lastSyncAt ?? "none"}</dd>
        <dt>Clock offset ms</dt>
        <dd>{diagnostics?.clockOffsetMs ?? 0}</dd>
        <dt>State</dt>
        <dd>{vm.state?.kind ?? "none"}</dd>
        <dt>Prayer coverage</dt>
        <dd>{coverage(vm)}</dd>
        <dt>Flags</dt>
        <dd>
          offline={String(!vm.networkAvailable)} lkg={String(vm.usingLkg)} test={String(vm.testMode)}
        </dd>
        <dt>Validation</dt>
        <dd>{diagnostics?.validationError ?? "none"}</dd>
      </dl>
    </aside>
  );
}
