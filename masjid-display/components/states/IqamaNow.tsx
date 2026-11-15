import type { DisplayRuntimeViewModel } from "../../lib/runtime/use-display-runtime";
import { presentationTimezone, StateFrame } from "./state-view";

export function IqamaNow({ vm }: { vm: DisplayRuntimeViewModel }) {
  return (
    <StateFrame
      testId="prayer-state-iqama-now"
      titleDe="Jetzt ist Zeit für die Iqama zum Gebet"
      titleAr="حان الآن موعد إقامة صلاة"
      prayer={vm.state?.prayer}
      now={vm.logicalNow}
      timezone={presentationTimezone(vm)}
    />
  );
}
