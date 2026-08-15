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
      <PageHeader titleKey="news.title" backHref={null} />
      {!announcements.length ? <EmptyState message={t("news.empty")} /> : null}
      {announcements.length ? (
        <div className="native-feed">
          {announcements.map((item) => (
            <AnnouncementCard key={item.id} announcement={item} />
          ))}
        </div>
      ) : null}
    </AppShell>
  );
}
