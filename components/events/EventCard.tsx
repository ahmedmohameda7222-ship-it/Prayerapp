"use client";

import { CalendarDays, MapPin } from "lucide-react";
import { FormattedTimeRange } from "@/components/ui/FormattedTime";
import { formatShortDate } from "@/lib/date-utils";
import { getLocalizedField } from "@/lib/i18n/localized-content";
import { useTranslation } from "@/lib/i18n/use-translation";
import type { Event } from "@/lib/types";

export function EventCard({ event }: { event: Event }) {
  const { t, locale } = useTranslation();
  const title = getLocalizedField(event, "title", locale);
  const description = getLocalizedField(event, "description", locale);
  const location = getLocalizedField(event, "location", locale);

  return (
    <article className="native-feed-item">
      <div className="flex items-start gap-3">
        <div className="min-w-[58px] shrink-0 text-center">
          <CalendarDays className="mx-auto h-4 w-4 text-[var(--app-brand)]" aria-hidden="true" />
          <time className="mt-1 block text-xs font-semibold leading-4 text-[var(--app-text-secondary)]" dateTime={event.date}>
            {formatShortDate(event.date, locale)}
          </time>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <h2 className="native-feed-item-title">{title}</h2>
            <span className="text-xs font-semibold text-[var(--app-brand)]">{t(`eventTypes.${event.type}`)}</span>
          </div>
          <p className="native-feed-item-meta mt-1">
            <FormattedTimeRange start={event.startTime} end={event.endTime} />
          </p>
          {description ? <p className="native-feed-item-copy">{description}</p> : null}
          {location ? (
            <p className="native-feed-item-meta flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{location}</span>
            </p>
          ) : null}
        </div>
      </div>
    </article>
  );
}
