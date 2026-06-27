"use client";

import { Bell, Clock, FileClock, HandHeart, Receipt, ShieldCheck } from "lucide-react";
import { AdminShell } from "@/components/layout/AdminShell";
import { AdminStatCard } from "@/components/admin/AdminStatCard";
import { AdminWarningCard } from "@/components/admin/AdminWarningCard";
import { AdminTable } from "@/components/admin/AdminTable";
import { DataError, DataLoading } from "@/components/ui/DataState";
import { getAuditLogs } from "@/lib/data/audit-logs";
import { getAnnouncements } from "@/lib/data/announcements";
import { getDonationCampaigns, getDonationReceiptRequests } from "@/lib/data/donations";
import { getJumuahTimes } from "@/lib/data/jumuah";
import { getPrayerTimes } from "@/lib/data/prayer-times";
import { todayIso, addDaysIso } from "@/lib/date-utils";
import { useAsyncData } from "@/lib/hooks/use-async-data";
import { getLocalizedAuditAction } from "@/lib/i18n/audit-actions";
import { useTranslation } from "@/lib/i18n/use-translation";

export default function AdminDashboardPage() {
  const { t } = useTranslation();
  const { data, loading, error, reload } = useAsyncData(loadDashboard);
  const today = todayIso();
  const nextWeekMissing = data ? !data.prayerTimes.some((item) => item.date >= today && item.date <= addDaysIso(today, 7) && item.published) : false;

  return (
    <AdminShell titleKey="admin.dashboard">
      {loading ? <DataLoading /> : null}
      {error ? <DataError message={error} retry={reload} /> : null}
      {data ? <div className="grid gap-5">
        {nextWeekMissing ? <AdminWarningCard message={t("admin.missingNextWeek")} /> : null}
        <div className="admin-grid">
          <AdminStatCard label={t("admin.todayPrayerStatus")} value={data.prayerTimes.some((item) => item.date === today && item.published) ? t("admin.published") : t("admin.notPublished")} note={t("admin.liveDate", { date: today })} icon={Clock} />
          <AdminStatCard label={t("admin.jumuahStatus")} value={data.jumuah.some((item) => item.date >= today && item.published) ? t("admin.published") : t("admin.notPublished")} note={t("admin.fridayVisible")} icon={ShieldCheck} />
          <AdminStatCard label={t("admin.activeCampaigns")} value={data.campaigns.filter((item) => item.isActive).length} note={t("admin.featuredCount", { count: data.campaigns.filter((item) => item.isFeatured).length })} icon={HandHeart} />
          <AdminStatCard label={t("admin.pendingReceipts")} value={data.receipts.filter((item) => item.status === "Pending").length} note={t("admin.manualReview")} icon={Receipt} />
          <AdminStatCard label={t("admin.announcements")} value={t("admin.liveCount", { count: data.announcements.filter((item) => item.published).length })} note={t("admin.urgentCount", { count: data.announcements.filter((item) => item.isUrgent).length })} icon={Bell} />
          <AdminStatCard label={t("admin.recentChanges")} value={data.logs.length} note={t("admin.latestActivity")} icon={FileClock} />
        </div>
        <AdminTable headers={[t("admin.actor"), t("admin.action"), t("admin.date")]} rows={data.logs.map((log) => [log.actor, getLocalizedAuditAction(log.action, t), log.createdAt])} />
      </div> : null}
    </AdminShell>
  );
}

async function loadDashboard() {
  const [prayerTimes, jumuah, campaigns, receipts, announcements, logs] = await Promise.all([
    getPrayerTimes(true), getJumuahTimes(true), getDonationCampaigns(true),
    getDonationReceiptRequests(), getAnnouncements(true), getAuditLogs(),
  ]);
  return { prayerTimes, jumuah, campaigns, receipts, announcements, logs };
}
