"use client";

import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { AnnouncementCard } from "@/components/news/AnnouncementCard";
import { DataError, DataLoading } from "@/components/ui/DataState";
import { EmptyState } from "@/components/ui/EmptyState";
import { getAnnouncements } from "@/lib/data/announcements";
import { useAsyncData } from "@/lib/hooks/use-async-data";
import { useTranslation } from "@/lib/i18n/use-translation";

export default function NewsPage() {
  const { t } = useTranslation();
  const { data, error, loading, reload } = useAsyncData(getAnnouncements);
  return (
    <AppShell>
      <PageHeader titleKey="news.title" />
      {loading ? <DataLoading /> : null}
      {error ? <DataError message={error} retry={reload} /> : null}
      {!loading && !error && !data?.length ? <EmptyState message={t("news.empty")} /> : null}
      <div className="grid gap-3">{data?.map((item) => <AnnouncementCard key={item.id} announcement={item} />)}</div>
    </AppShell>
  );
}
