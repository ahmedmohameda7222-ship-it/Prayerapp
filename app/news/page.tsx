import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { AnnouncementCard } from "@/components/news/AnnouncementCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { getAnnouncements } from "@/lib/data/announcements";
import { getServerLocale, getTranslation } from "@/lib/i18n/server-translation";

export default async function NewsPage() {
  const locale = await getServerLocale();
  const { t } = getTranslation(locale);
  const announcements = await getAnnouncements();

  return (
    <AppShell>
      <PageHeader titleKey="news.title" />
      {!announcements.length ? <EmptyState message={t("news.empty")} /> : null}
      <div className="grid gap-3 lg:grid-cols-2">
        {announcements.map((item) => (
          <AnnouncementCard key={item.id} announcement={item} />
        ))}
      </div>
    </AppShell>
  );
}
