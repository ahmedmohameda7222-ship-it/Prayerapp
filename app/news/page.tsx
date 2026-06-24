import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { AnnouncementCard } from "@/components/news/AnnouncementCard";
import { announcements } from "@/lib/mock-data";

export default function NewsPage() {
  return (
    <AppShell>
      <PageHeader title="Announcements" />
      <div className="grid gap-3">
        {announcements.map((announcement) => <AnnouncementCard key={announcement.id} announcement={announcement} />)}
      </div>
    </AppShell>
  );
}
