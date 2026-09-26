import type { DisplayRuntimeViewModel } from "../../lib/runtime/use-display-runtime";
import { prayerTarget, presentationTimezone, StateFrame } from "./state-view";

export function WaitingForIqama({ vm }: { vm: DisplayRuntimeViewModel }) {
  return (
    <StateFrame
      testId="prayer-state-waiting-for-iqama"
      titleDe="Iqama in"
      titleAr="الإقامة بعد"
      prayer={vm.state?.prayer}
      target={prayerTarget(vm, "iqama")}
      now={vm.logicalNow}
      timezone={presentationTimezone(vm)}
    />
  );
}
