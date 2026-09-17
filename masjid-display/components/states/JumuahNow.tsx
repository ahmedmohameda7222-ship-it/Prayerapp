import type { DisplayRuntimeViewModel } from "../../lib/runtime/use-display-runtime";
import { presentationTimezone, StateFrame } from "./state-view";

export function JumuahNow({ vm }: { vm: DisplayRuntimeViewModel }) {
  const serviceNumber = (vm.state?.serviceIndex ?? 0) + 1;
  return (
    <StateFrame
      testId="prayer-state-jumuah-now"
      titleDe={`Jumuah jetzt — ${serviceNumber}`}
      titleAr="صلاة الجمعة الآن"
      now={vm.logicalNow}
      timezone={presentationTimezone(vm)}
    />
  );
}
