"use client";

import { Bell, Clock, FileClock, HandHeart, Receipt, ShieldCheck } from "lucide-react";
import { AdminShell } from "@/components/layout/AdminShell";
import { AdminStatCard } from "@/components/admin/AdminStatCard";
import { AdminWarningCard } from "@/components/admin/AdminWarningCard";
import { AdminTable } from "@/components/admin/AdminTable";
import { auditLogs, donationCampaigns, prayerTimes, receiptRequests } from "@/lib/mock-data";
import { getLocalizedAuditAction } from "@/lib/i18n/audit-actions";
import { useTranslation } from "@/lib/i18n/use-translation";

export default function AdminDashboardPage() {
  const { t } = useTranslation();

  return (
    <AdminShell titleKey="admin.dashboard">
      <div className="grid gap-5">
        <AdminWarningCard message={t("admin.missingNextWeek")} />
        <div className="admin-grid">
          <AdminStatCard label={t("admin.todayPrayerStatus")} value={t("admin.published")} note={t("admin.liveDate", { date: prayerTimes[2].date })} icon={Clock} />
          <AdminStatCard label={t("admin.jumuahStatus")} value={t("admin.published")} note={t("admin.fridayVisible")} icon={ShieldCheck} />
          <AdminStatCard label={t("admin.activeCampaigns")} value={donationCampaigns.length} note={t("admin.featuredCount", { count: 2 })} icon={HandHeart} />
          <AdminStatCard label={t("admin.pendingReceipts")} value={receiptRequests.filter((item) => item.status === "Pending").length} note={t("admin.manualReview")} icon={Receipt} />
          <AdminStatCard label={t("admin.announcements")} value={t("admin.liveCount", { count: 3 })} note={t("admin.urgentCount", { count: 1 })} icon={Bell} />
          <AdminStatCard label={t("admin.recentChanges")} value={auditLogs.length} note={t("admin.latestActivity")} icon={FileClock} />
        </div>
        <AdminTable
          headers={[t("admin.actor"), t("admin.action"), t("admin.date")]}
          rows={auditLogs.map((log) => [log.actor, getLocalizedAuditAction(log.action, t), log.createdAt])}
        />
      </div>
    </AdminShell>
  );
}
