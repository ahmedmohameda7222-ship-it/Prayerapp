import type { DisplayRuntimeViewModel } from "../lib/runtime/use-display-runtime";

export interface DisplayShellProps {
  vm: DisplayRuntimeViewModel;
}

export function DisplayShell({ vm: _vm }: DisplayShellProps) {
  return <section className="display-shell" data-testid="display-shell" />;
}
