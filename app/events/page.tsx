"use client";

import { CalendarDays, MapPin } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { events } from "@/lib/mock-data";
import { FormattedTimeRange } from "@/components/ui/FormattedTime";
import { useTranslation } from "@/lib/i18n/use-translation";
import { getLocalizedField } from "@/lib/i18n/localized-content";
import { formatShortDate } from "@/lib/date-utils";

export default function EventsPage() {
  const { t, locale } = useTranslation();

  return (
    <AppShell>
      <PageHeader titleKey="events.title" />
      <div className="grid gap-3">
        {events.map((event) => {
          const title = getLocalizedField(event, "title", locale);
          const description = getLocalizedField(event, "description", locale);
          const location = getLocalizedField(event, "location", locale);
          return (
            <article key={event.id} className="card p-4">
              <div className="mb-2 flex items-center justify-between gap-2">
                <h2 className="font-bold text-[var(--color-emerald)]">{title}</h2>
                <Badge tone="gold">{t(`eventTypes.${event.type}`)}</Badge>
              </div>
              <p className="text-sm leading-6 text-[var(--color-muted)]">{description}</p>
              <div className="mt-3 grid gap-2 text-sm font-bold text-[var(--color-charcoal)]">
                <p className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-[var(--color-gold-dark)]" /> {formatShortDate(event.date, locale)} | <FormattedTimeRange start={event.startTime} end={event.endTime} /></p>
                <p className="flex items-center gap-2"><MapPin className="h-4 w-4 text-[var(--color-gold-dark)]" /> {location}</p>
              </div>
            </article>
          );
        })}
      </div>
    </AppShell>
  );
}
