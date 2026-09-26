import type { DisplayRuntimeViewModel } from "../../lib/runtime/use-display-runtime";
import { prayerTarget, presentationTimezone, StateFrame } from "./state-view";

export function PrayerApproaching({ vm }: { vm: DisplayRuntimeViewModel }) {
  return (
    <StateFrame
      testId="prayer-state-prayer-approaching"
      titleDe="Gebet beginnt bald"
      titleAr="اقتربت الصلاة"
      prayer={vm.state?.prayer}
      target={prayerTarget(vm, "prayer")}
      now={vm.logicalNow}
      timezone={presentationTimezone(vm)}
    />
  );
}
