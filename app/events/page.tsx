import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { EventCard } from "@/components/events/EventCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { getEvents } from "@/lib/data/events";
import { getServerLocale, getTranslation } from "@/lib/i18n/server-translation";
import { todayIso } from "@/lib/date-utils";

export default async function EventsPage() {
  const locale = await getServerLocale();
  const { t } = getTranslation(locale);
  const events = (await getEvents()).filter((event) => event.date >= todayIso());

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
