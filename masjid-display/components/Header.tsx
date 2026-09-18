import type { DisplayRuntimeViewModel } from "../lib/runtime/use-display-runtime";

function formatClock(now: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).format(now);
}

function formatGregorian(now: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("de-DE", {
    timeZone,
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(now);
}

function formatHijri(now: Date, timeZone: string): string {
  const formatter = new Intl.DateTimeFormat("ar-u-ca-islamic-umalqura", {
    timeZone,
    day: "numeric",
    month: "long",
    year: "numeric",
    numberingSystem: "arab",
  });
  const values = Object.fromEntries(
    formatter
      .formatToParts(now)
      .filter(
        (part) =>
          part.type === "day" ||
          part.type === "month" ||
          part.type === "year" ||
          part.type === "era",
      )
      .map((part) => [part.type, part.value]),
  );

  return (["day", "month", "year", "era"] as const)
    .filter((type) => typeof values[type] === "string")
    .map((type) => values[type] as string)
    .join(" ");
}

export function Header({ vm }: { vm: DisplayRuntimeViewModel }) {
  const feed = vm.feed;
  const timeZone = feed?.timezone ?? "Europe/Berlin";

  return (
    <header className="display-header">
      <div className="mosque-identity">
        <strong>{feed?.mosque.nameDe ?? "Prayerapp Masjid Display"}</strong>
        {feed ? <span dir="rtl">{feed.mosque.nameAr}</span> : null}
      </div>

      <div className="header-dates">
        <time data-testid="gregorian-date" dateTime={vm.logicalNow.toISOString()}>
          {formatGregorian(vm.logicalNow, timeZone)}
        </time>
        <span data-testid="hijri-date" dir="rtl">
          {formatHijri(vm.logicalNow, timeZone)}
        </span>
      </div>

      <time
        className="header-clock"
        data-testid="header-clock"
        dateTime={vm.logicalNow.toISOString()}
      >
        {formatClock(vm.logicalNow, timeZone)}
      </time>
    </header>
  );
}
