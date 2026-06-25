"use client";

import { CalendarDays, MapPin } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { events } from "@/lib/mock-data";
import { FormattedTimeRange } from "@/components/ui/FormattedTime";

export default function EventsPage() {
  return (
    <AppShell>
      <PageHeader title="Events" />
      <div className="grid gap-3">
        {events.map((event) => (
          <article key={event.id} className="card p-4">
            <div className="mb-2 flex items-center justify-between gap-2">
              <h2 className="font-bold text-[var(--color-emerald)]">{event.title}</h2>
              <Badge tone="gold">{event.type}</Badge>
            </div>
            <p className="text-sm leading-6 text-[var(--color-muted)]">{event.description}</p>
            <div className="mt-3 grid gap-2 text-sm font-bold text-[var(--color-charcoal)]">
              <p className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-[var(--color-gold-dark)]" /> {event.date} · <FormattedTimeRange start={event.startTime} end={event.endTime} /></p>
              <p className="flex items-center gap-2"><MapPin className="h-4 w-4 text-[var(--color-gold-dark)]" /> {event.location}</p>
            </div>
          </article>
        ))}
      </div>
    </AppShell>
  );
}
