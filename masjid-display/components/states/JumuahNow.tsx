import type { DisplayRuntimeViewModel } from "../../lib/runtime/use-display-runtime";
import { presentationTimezone, StateFrame } from "./state-view";

export function JumuahNow({ vm }: { vm: DisplayRuntimeViewModel }) {
  const serviceNumber = (vm.state?.serviceIndex ?? 0) + 1;
  return (
    <StateFrame
      testId="prayer-state-jumuah-now"
      titleDe={`Jumuah jetzt — ${serviceNumber}`}
      titleAr="صلاة الجمعة الآن"
      nameDe="Jumuah"
      nameAr="الجمعة"
      supportDe="Die Freitagspredigt und das Gebet haben begonnen"
      supportAr="بدأت خطبة وصلاة الجمعة"
      now={vm.logicalNow}
      timezone={presentationTimezone(vm)}
    />
  );
}
