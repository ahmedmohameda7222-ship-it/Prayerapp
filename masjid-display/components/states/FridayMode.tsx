import type { DisplayRuntimeViewModel } from "../../lib/runtime/use-display-runtime";
import { localDateIso, zonedDateTime } from "../../lib/time";
import { formatTargetTime, fridayTarget, presentationTimezone, StateFrame } from "./state-view";

export function FridayMode({ vm }: { vm: DisplayRuntimeViewModel }) {
  const serviceNumber = (vm.state?.serviceIndex ?? 0) + 1;
  const timezone = presentationTimezone(vm);
  const date = localDateIso(vm.logicalNow, timezone);
  const day = vm.feed?.prayers.schedule.find((entry) => entry.date === date);
  const additional = vm.feed?.prayers.additionalJumuah
    .filter((entry) => entry.date === date && !!day && entry.prayerTime > day.dhuhr)
    .sort((a,b) => a.prayerTime.localeCompare(b.prayerTime)) ?? [];
  const services = day ? [day.dhuhr, ...new Set(additional.map((service) => service.prayerTime))] : [];

  return (
    <StateFrame
      testId="prayer-state-friday-mode"
      titleDe={`Jumuah ${serviceNumber} — Countdown`}
      titleAr={`الجمعة ${serviceNumber}`}
      nameAr="صلاة الجمعة"
      nameDe="Jumuah"
      target={fridayTarget(vm)}
      targetLabel="Beginn / الموعد"
      now={vm.logicalNow}
      timezone={timezone}
      extra={services.length > 1 ? (
        <div className="state-friday-numbers" aria-label="Friday service times">
          {services.map((time, index) => (
            <span className={index + 1 === serviceNumber ? "active" : undefined} key={time}>
              Freitag {index + 1} · {formatTargetTime(zonedDateTime(date, time, timezone), timezone)}
            </span>
          ))}
        </div>
      ) : null}
    />
  );
}
