import type { DisplayPrayerName } from "../../lib/feed-types";
import type { DisplayRuntimeViewModel } from "../../lib/runtime/use-display-runtime";
import { localDateIso, zonedDateTime } from "../../lib/time";

const PRAYER_LABELS: Record<DisplayPrayerName, { de: string; ar: string }> = {
  fajr: { de: "Fajr", ar: "الفجر" },
  dhuhr: { de: "Dhuhr", ar: "الظهر" },
  asr: { de: "Asr", ar: "العصر" },
  maghrib: { de: "Maghrib", ar: "المغرب" },
  isha: { de: "Isha", ar: "العشاء" },
};

export function prayerLabels(prayer: DisplayPrayerName | null) {
  return prayer ? PRAYER_LABELS[prayer] : null;
}

function payloadTarget(vm: DisplayRuntimeViewModel): Date | null {
  const value = vm.testPayload?.targetAt;
  if (typeof value !== "string") return null;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? new Date(timestamp) : null;
}

export function presentationTimezone(vm: DisplayRuntimeViewModel) {
  return vm.feed?.timezone ?? "Europe/Berlin";
}

export function prayerTarget(
  vm: DisplayRuntimeViewModel,
  target: "prayer" | "iqama",
): Date | null {
  const synthetic = payloadTarget(vm);
  if (synthetic) return synthetic;
  if (!vm.feed || !vm.state?.prayer) return null;

  const date = localDateIso(vm.logicalNow, vm.feed.timezone);
  const day = vm.feed.prayers.schedule.find((entry) => entry.date === date);
  if (!day) return null;

  const prayer = vm.state.prayer;
  const prayerInstant = zonedDateTime(date, day[prayer], vm.feed.timezone);
  if (target === "prayer") return prayerInstant;
  return new Date(
    prayerInstant.getTime() + vm.feed.prayers.iqamaDelays[prayer] * 60_000,
  );
}

export function fridayTarget(vm: DisplayRuntimeViewModel): Date | null {
  const synthetic = payloadTarget(vm);
  if (synthetic) return synthetic;
  if (!vm.feed || !vm.state) return null;

  const serviceId = vm.state.serviceId;
  if (serviceId?.startsWith("primary:")) {
    const date = serviceId.slice("primary:".length);
    const day = vm.feed.prayers.schedule.find((entry) => entry.date === date);
    return day ? zonedDateTime(date, day.dhuhr, vm.feed.timezone) : null;
  }

  if (serviceId) {
    const additional = vm.feed.prayers.additionalJumuah.find(
      (service) => service.id === serviceId,
    );
    if (additional) {
      return zonedDateTime(
        additional.date,
        additional.prayerTime,
        vm.feed.timezone,
      );
    }
  }

  if (vm.state.serviceIndex === 0) {
    const date = localDateIso(vm.logicalNow, vm.feed.timezone);
    const day = vm.feed.prayers.schedule.find((entry) => entry.date === date);
    return day ? zonedDateTime(date, day.dhuhr, vm.feed.timezone) : null;
  }

  return null;
}

export function formatTargetTime(target: Date | null, timezone: string) {
  if (!target) return null;
  return new Intl.DateTimeFormat("de-DE", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(target);
}

export function formatCountdown(target: Date | null, now: Date) {
  if (!target) return null;
  const totalSeconds = Math.max(
    0,
    Math.ceil((target.getTime() - now.getTime()) / 1000),
  );
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function StateFrame({
  testId,
  titleDe,
  titleAr,
  prayer,
  target,
  now,
  timezone,
  targetLabel,
}: {
  testId: string;
  titleDe: string;
  titleAr: string;
  prayer?: DisplayPrayerName | null;
  target?: Date | null;
  now: Date;
  timezone: string;
  targetLabel?: string;
}) {
  const labels = prayerLabels(prayer ?? null);
  const targetTime = formatTargetTime(target ?? null, timezone);
  const countdown = formatCountdown(target ?? null, now);

  return (
    <section className="state-panel" data-testid={testId}>
      <div className="state-copy">
        <p className="state-eyebrow">{titleDe}</p>
        <p className="state-eyebrow" dir="rtl">{titleAr}</p>
      </div>
      {labels ? (
        <div className="state-prayer-name">
          <strong>{labels.de}</strong>
          <strong dir="rtl">{labels.ar}</strong>
        </div>
      ) : null}
      {targetTime ? (
        <div className="state-target">
          {targetLabel ? <span>{targetLabel}</span> : null}
          <time data-testid="state-target-time">{targetTime}</time>
        </div>
      ) : null}
      {countdown ? (
        <output className="state-countdown" data-testid="state-countdown">
          {countdown}
        </output>
      ) : null}
    </section>
  );
}
