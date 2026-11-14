import type { DisplayRuntimeViewModel } from "../../lib/runtime/use-display-runtime";
import { presentationTimezone, StateFrame } from "./state-view";

export function IqamaNow({ vm }: { vm: DisplayRuntimeViewModel }) {
  return (
    <StateFrame
      testId="prayer-state-iqama-now"
      titleDe="Iqama"
      titleAr="إقامة الصلاة"
      prayer={vm.state?.prayer}
      supportDe="Beginn jetzt"
      supportAr="الإقامة الآن"
      now={vm.logicalNow}
      timezone={presentationTimezone(vm)}
    />
  );
}
