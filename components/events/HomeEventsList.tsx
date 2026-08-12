"use client";

import { FormattedTimeRange } from "@/components/ui/FormattedTime";
import { getLocalizedField } from "@/lib/i18n/localized-content";
import { useTranslation } from "@/lib/i18n/use-translation";
import type { Event } from "@/lib/types";

const localeTags = { ar: "ar", en: "en", de: "de", tr: "tr" } as const;

function eventDateLabel(date: string, locale: keyof typeof localeTags) {
  const [year, month, day] = date.split("-").map(Number);
  const value = new Date(Date.UTC(year, month - 1, day, 12));
  return new Intl.DateTimeFormat(localeTags[locale], {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(value);
}

export function HomeEventsList({ events }: { events: Event[] }) {
  const { t, locale } = useTranslation();

  return (
    <div className="overflow-hidden rounded-[24px] border border-[var(--color-border)] bg-[var(--color-card)] shadow-[var(--shadow-soft)]" data-testid="home-events-surface">
      <div className="divide-y divide-[var(--color-border)]">
        {events.map((event) => {
          const title = getLocalizedField(event, "title", locale);
          const description = getLocalizedField(event, "description", locale);
          const location = getLocalizedField(event, "location", locale);
          return (
            <article key={event.id} className="grid grid-cols-[82px_minmax(0,1fr)] gap-3 px-4 py-4 sm:grid-cols-[100px_minmax(0,1fr)] sm:px-5" data-testid="home-event-row">
              <time dateTime={event.date} className="self-start rounded-xl bg-[var(--color-cream-deep)] px-2 py-2 text-center text-xs font-extrabold leading-5 text-[var(--color-emerald)]">
                {eventDateLabel(event.date, locale)}
              </time>
              <div className="min-w-0">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                  <h3 className="font-bold leading-6 text-[var(--color-emerald)]">{title}</h3>
                  <span className="text-[11px] font-bold uppercase tracking-[0.06em] text-[var(--color-gold-dark)]">{t(`eventTypes.${event.type}`)}</span>
                </div>
                <p className="mt-1 text-sm leading-6 text-[var(--color-muted)]">{description}</p>
                <p className="mt-2 text-sm font-bold text-[var(--color-charcoal)]">
                  <FormattedTimeRange start={event.startTime} end={event.endTime} />
                  <span aria-hidden="true"> · </span>
                  {location}
                </p>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
