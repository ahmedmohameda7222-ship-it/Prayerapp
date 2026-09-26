import { AdminAnnouncementsPageClient } from "@/components/admin/AdminAnnouncementsPageClient";
import { getRuntimePrayerTimezone } from "@/lib/data/prayer-settings";

export default async function AdminAnnouncementsPage() {
  const timezone = await getRuntimePrayerTimezone();
  return <AdminAnnouncementsPageClient timezone={timezone} />;
}
