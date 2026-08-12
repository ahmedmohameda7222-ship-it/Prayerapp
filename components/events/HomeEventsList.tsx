"use client";

import { FormattedTimeRange } from "@/components/ui/FormattedTime";
import { getLocalizedField } from "@/lib/i18n/localized-content";
import { useTranslation } from "@/lib/i18n/use-translation";
import type { Event } from "@/lib/types";

const localeTags = { ar: "ar", en: "en", de: "de", tr: "tr" } as const;

function eventDateParts(date: string, locale: keyof typeof localeTags) {
  const [year, month, day] = date.split("-").map(Number);
  const value = new Date(Date.UTC(year, month - 1, day, 12));
  return {
    day: new Intl.DateTimeFormat(localeTags[locale], { day: "numeric", timeZone: "UTC" }).format(value),
    context: new Intl.DateTimeFormat(localeTags[locale], { weekday: "short", month: "short", timeZone: "UTC" }).format(value),
  };
}

export function HomeEventsList({ events }: { events: Event[] }) {
  const { t, locale } = useTranslation();

  return (
    <div className="home-events-surface divide-y divide-[var(--home-divider)] px-4" data-testid="home-events-surface">
      {events.map((event) => {
        const title = getLocalizedField(event, "title", locale);
        const description = getLocalizedField(event, "description", locale);
        const location = getLocalizedField(event, "location", locale);
        const date = eventDateParts(event.date, locale);
        return (
          <article key={event.id} className="grid grid-cols-[64px_minmax(0,1fr)] gap-4 py-4 sm:grid-cols-[76px_minmax(0,1fr)]" data-testid="home-event-row">
            <time dateTime={event.date} className="home-tabular self-start text-center text-[var(--home-text)]">
              <span className="block text-2xl font-bold leading-none">{date.day}</span>
              <span className="mt-1 block text-xs font-semibold text-[var(--home-text-secondary)]">{date.context}</span>
            </time>
            <div className="min-w-0">
              <h3 className="font-bold leading-6 text-[var(--home-text)]">{title}</h3>
              <p className="mt-0.5 text-xs font-semibold text-[var(--home-text-secondary)]">{t(`eventTypes.${event.type}`)}</p>
              <p className="mt-1 text-sm leading-6 text-[var(--home-text-secondary)]">{description}</p>
              <p className="mt-2 text-sm font-semibold text-[var(--home-text)]">
                <FormattedTimeRange start={event.startTime} end={event.endTime} />
                <span aria-hidden="true"> · </span>
                {location}
              </p>
            </div>
          </article>
        );
      })}
    </div>
  );
}
