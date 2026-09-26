import type { DisplayRuntimeViewModel } from "../../lib/runtime/use-display-runtime";
import { presentationTimezone, StateFrame } from "./state-view";

export function PrayerTimeNow({ vm }: { vm: DisplayRuntimeViewModel }) {
  return (
    <StateFrame
      testId="prayer-state-prayer-time-now"
      titleDe="Gebetszeit ist jetzt"
      titleAr="حان وقت الصلاة"
      prayer={vm.state?.prayer}
      now={vm.logicalNow}
      timezone={presentationTimezone(vm)}
    />
  );
}
