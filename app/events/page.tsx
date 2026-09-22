import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { EventCard } from "@/components/events/EventCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { getEvents } from "@/lib/data/events";
import { getRuntimePrayerSettings } from "@/lib/data/prayer-settings";
import { isUpcomingEvent } from "@/lib/event-utils";
import { getServerLocale, getTranslation } from "@/lib/i18n/server-translation";

export default async function EventsPage() {
  const locale = await getServerLocale();
  const { t } = getTranslation(locale);
  const now = new Date();
  const prayerSettings = await getRuntimePrayerSettings().catch(() => null);
  const prayerTimezone = prayerSettings?.timezone;
  const events = (await getEvents()).filter((event) =>
    isUpcomingEvent(event, now, prayerTimezone ?? undefined),
  );

  return (
    <AppShell>
      <PageHeader titleKey="events.title" backHref="/more" />
      {!events.length ? <EmptyState message={t("events.empty")} /> : null}
      {events.length ? (
        <div className="native-feed">
          {events.map((event) => <EventCard key={event.id} event={event} />)}
        </div>
      ) : null}
    </AppShell>
  );
}
