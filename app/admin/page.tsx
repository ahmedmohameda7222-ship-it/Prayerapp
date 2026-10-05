"use client";

import Link from "next/link";
import { Bell, Clock, FlaskConical, HandHeart, Monitor, ShieldCheck } from "lucide-react";
import { AdminShell } from "@/components/layout/AdminShell";
import { AdminStatCard } from "@/components/admin/AdminStatCard";
import { AdminWarningCard } from "@/components/admin/AdminWarningCard";
import { Card } from "@/components/ui/Card";
import { DataError, DataLoading } from "@/components/ui/DataState";
import { useAdminAuth } from "@/lib/auth/use-admin-auth";
import { useAsyncData } from "@/lib/hooks/use-async-data";
import { useTranslation } from "@/lib/i18n/use-translation";
import { loadAdminDashboardSummaryAction } from "./dashboard-summary";

export default function AdminDashboardPage() {
  const { t } = useTranslation();
  const { session } = useAdminAuth();
  const accessToken = session?.access_token || "";
  const { data, loading, error, reload } = useAsyncData(
    async () => {
      if (!accessToken) return null;
      const result = await loadAdminDashboardSummaryAction(accessToken);
      if (!result.success || !result.data) {
        throw new Error(result.error || "Unable to load admin dashboard summary");
      }
      return result.data;
    },
    accessToken,
  );

  return (
    <AdminShell titleKey="admin.dashboard">
      {loading ? <DataLoading /> : null}
      {error ? <DataError message={error} retry={reload} /> : null}
      {data ? <div className="grid gap-5">
        {data.nextWeekMissing ? <AdminWarningCard message={t("admin.missingNextWeek")} /> : null}
        <div className="admin-grid">
          <AdminStatCard
            label={t("admin.todayPrayerStatus")}
            value={data.todayPrayerPublished ? t("admin.published") : t("admin.notPublished")}
            note={t("admin.liveDate", { date: data.today })}
            icon={Clock}
          />
          <AdminStatCard
            label={t("admin.jumuahStatus")}
            value={data.upcomingJumuahPublished ? t("admin.published") : t("admin.notPublished")}
            note={t("admin.fridayVisible")}
            icon={ShieldCheck}
          />
          <AdminStatCard
            label={t("admin.activeCampaigns")}
            value={data.activeCampaignCount}
            note={t("admin.featuredCount", { count: data.featuredCampaignCount })}
            icon={HandHeart}
          />
          <AdminStatCard
            label={t("admin.announcements")}
            value={t("admin.liveCount", { count: data.publishedAnnouncementCount })}
            note={t("admin.urgentCount", { count: data.urgentAnnouncementCount })}
            icon={Bell}
          />
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <Card className="p-0">
            <Link href="/admin/masjid-display" className="flex items-center gap-4 p-5 font-bold text-[var(--color-emerald)]">
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[var(--color-emerald-soft)]"><Monitor className="h-5 w-5" aria-hidden="true" /></span>
              <span><span className="block">Masjid Display</span><span className="block text-xs font-normal text-[var(--color-muted)]">Prayer-in-progress durations and Azkar playlist</span></span>
            </Link>
          </Card>
          <Card className="p-0">
            <Link href="/admin/masjid-display-test" className="flex items-center gap-4 p-5 font-bold text-[var(--color-emerald)]">
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[var(--color-emerald-soft)]"><FlaskConical className="h-5 w-5" aria-hidden="true" /></span>
              <span><span className="block">Masjid Display Test Control</span><span className="block text-xs font-normal text-[var(--color-muted)]">Run synthetic scenarios on the real TV</span></span>
            </Link>
          </Card>
        </div>
      </div> : null}
    </AdminShell>
  );
}
