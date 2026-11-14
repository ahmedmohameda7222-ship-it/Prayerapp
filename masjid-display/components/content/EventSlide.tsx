import type { DisplayEventDto } from "../../lib/feed-types";
import { BilingualBlock } from "./content-view";

function textLength(item: DisplayEventDto) {
  return [
    item.titleAr, item.titleDe, item.descriptionAr, item.descriptionDe,
    item.locationAr, item.locationDe,
  ].join("").length;
}

export function EventSlide({
  items, selectedId, now,
}: {
  items: DisplayEventDto[];
  selectedId: string | null;
  now: Date;
}) {
  const item = items.find((entry) => entry.id === selectedId) ?? items[0];
  if (!item) return null;

  // Use the event's stored local calendar date, never a browser-timezone conversion.
  const [year, month, day] = item.date.split("-").map(Number);
  const monthName = new Intl.DateTimeFormat("de-DE", { month: "short", timeZone: "UTC" })
    .format(new Date(Date.UTC(year, month - 1, day)));

  return (
    <article className="event-layout" data-testid="event-card">
      <div className="event-date" aria-label={item.date}>
        <time dateTime={item.date} data-testid="event-date">
          <span className="event-day">{String(day).padStart(2, "0")}</span>
          <span className="event-month">{monthName.toUpperCase()}</span>
        </time>
      </div>
      <div className="event-content">
        <span className="hero-kicker">GEMEINDEVERANSTALTUNG · فعالية</span>
        <BilingualBlock
          className="event-languages"
          titleAr={item.titleAr}
          titleDe={item.titleDe}
          bodyAr={item.descriptionAr}
          bodyDe={item.descriptionDe}
          copyLength={textLength(item)}
          now={now}
        />
        <div className="event-meta">
          <span>{item.startTime}{item.endTime ? `–${item.endTime}` : ""}</span>
          <span lang="de">{item.locationDe}</span>
          <span lang="ar" dir="rtl">{item.locationAr}</span>
        </div>
      </div>
    </article>
  );
}
