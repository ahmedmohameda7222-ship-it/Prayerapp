import type { DisplayRuntimeViewModel } from "../../lib/runtime/use-display-runtime";
import { fridayTarget, presentationTimezone, StateFrame } from "./state-view";

export function FridayMode({ vm }: { vm: DisplayRuntimeViewModel }) {
  const serviceNumber = (vm.state?.serviceIndex ?? 0) + 1;
  return (
    <StateFrame
      testId="prayer-state-friday-mode"
      titleDe={`Jumuah ${serviceNumber} — Countdown`}
      titleAr={`الجمعة ${serviceNumber}`}
      target={fridayTarget(vm)}
      now={vm.logicalNow}
      timezone={presentationTimezone(vm)}
    />
  );
}
