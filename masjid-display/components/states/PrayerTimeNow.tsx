import type { DisplayRuntimeViewModel } from "../../lib/runtime/use-display-runtime";
import { prayerTarget, presentationTimezone, StateFrame } from "./state-view";

export function PrayerTimeNow({ vm }: { vm: DisplayRuntimeViewModel }) {
  return (
    <StateFrame
      testId="prayer-state-prayer-time-now"
      titleDe="Jetzt ist Zeit für den Adhan zum Gebet"
      titleAr="حان الآن موعد أذان صلاة"
      prayer={vm.state?.prayer}
      target={prayerTarget(vm, "prayer")}
      targetLabel="Adhan / الأذان"
      now={vm.logicalNow}
      timezone={presentationTimezone(vm)}
    />
  );
}
