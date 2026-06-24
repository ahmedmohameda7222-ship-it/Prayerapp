import { Bell, Clock, FileClock, HandHeart, Receipt, ShieldCheck } from "lucide-react";
import { AdminShell } from "@/components/layout/AdminShell";
import { AdminStatCard } from "@/components/admin/AdminStatCard";
import { AdminWarningCard } from "@/components/admin/AdminWarningCard";
import { AdminTable } from "@/components/admin/AdminTable";
import { auditLogs, donationCampaigns, prayerTimes, receiptRequests } from "@/lib/mock-data";

export default function AdminDashboardPage() {
  return (
    <AdminShell title="Dashboard">
      <div className="grid gap-5">
        <AdminWarningCard message="Prayer times for next week are missing." />
        <div className="admin-grid">
          <AdminStatCard label="Today Prayer Status" value="Published" note={`${prayerTimes[2].date} is live`} icon={Clock} />
          <AdminStatCard label="Jumu'ah Published Status" value="Published" note="Friday details visible" icon={ShieldCheck} />
          <AdminStatCard label="Active Donation Campaigns" value={donationCampaigns.length} note="2 featured on public page" icon={HandHeart} />
          <AdminStatCard label="Pending Receipt Requests" value={receiptRequests.filter((item) => item.status === "Pending").length} note="Manual review required" icon={Receipt} />
          <AdminStatCard label="Announcements" value="3 live" note="1 urgent" icon={Bell} />
          <AdminStatCard label="Recent Admin Changes" value={auditLogs.length} note="Latest activity visible below" icon={FileClock} />
        </div>
        <AdminTable
          headers={["Actor", "Action", "Date"]}
          rows={auditLogs.map((log) => [log.actor, log.action, log.createdAt])}
        />
      </div>
    </AdminShell>
  );
}
