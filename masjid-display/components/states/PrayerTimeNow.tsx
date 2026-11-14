import type { DisplayRuntimeViewModel } from "../../lib/runtime/use-display-runtime";
import { prayerTarget, presentationTimezone, StateFrame } from "./state-view";

export function PrayerTimeNow({ vm }: { vm: DisplayRuntimeViewModel }) {
  return (
    <StateFrame
      testId="prayer-state-prayer-time-now"
      titleDe="Gebetszeit ist jetzt"
      titleAr="حان وقت الصلاة"
      prayer={vm.state?.prayer}
      target={prayerTarget(vm, "prayer")}
      targetLabel="Adhan / الأذان"
      supportDe="Die Gebetszeit hat begonnen"
      supportAr="دخل وقت الصلاة"
      now={vm.logicalNow}
      timezone={presentationTimezone(vm)}
    />
  );
}
