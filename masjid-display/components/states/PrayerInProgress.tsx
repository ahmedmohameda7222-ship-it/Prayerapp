import type { DisplayRuntimeViewModel } from "../../lib/runtime/use-display-runtime";
import { presentationTimezone, StateFrame } from "./state-view";

export function PrayerInProgress({ vm }: { vm: DisplayRuntimeViewModel }) {
  return (
    <StateFrame
      testId="prayer-state-prayer-in-progress"
      titleDe="Gebet läuft"
      titleAr="الصلاة قائمة"
      prayer={vm.state?.prayer}
      supportDe="Bitte Ruhe bewahren"
      supportAr="يرجى التزام الهدوء"
      now={vm.logicalNow}
      timezone={presentationTimezone(vm)}
    />
  );
}
