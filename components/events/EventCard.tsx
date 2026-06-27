"use client";

import { CalendarDays, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
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
    <article className="card p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className="font-bold text-[var(--color-emerald)]">{title}</h2>
        <Badge tone="gold">{t(`eventTypes.${event.type}`)}</Badge>
      </div>
      <p className="text-sm leading-6 text-[var(--color-muted)]">{description}</p>
      <div className="mt-3 grid gap-2 text-sm font-bold text-[var(--color-charcoal)]">
        <p className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-[var(--color-gold-dark)]" aria-hidden="true" />
          {formatShortDate(event.date, locale)} | <FormattedTimeRange start={event.startTime} end={event.endTime} />
        </p>
        <p className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-[var(--color-gold-dark)]" aria-hidden="true" />
          {location}
        </p>
      </div>
    </article>
  );
}
