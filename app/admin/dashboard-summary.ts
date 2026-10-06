"use server";

import { requireAllowedAdminIdentity } from "@/lib/auth/admin-server";
import { addDaysIso, todayIso } from "@/lib/date-utils";
import { getRuntimePrayerTimezone } from "@/lib/data/prayer-settings";
import { adminActionError } from "@/lib/security/admin-audit";
import { createServerClient } from "@/lib/supabase/server";

export type AdminDashboardSummary = {
  today: string;
  timezone: string;
  todayPrayerPublished: boolean;
  nextWeekMissing: boolean;
  upcomingJumuahPublished: boolean;
  activeCampaignCount: number;
  featuredCampaignCount: number;
  publishedAnnouncementCount: number;
  urgentAnnouncementCount: number;
};

export type AdminDashboardSummaryActionResult = {
  success: boolean;
  data?: AdminDashboardSummary;
  error?: string;
};

export async function loadAdminDashboardSummaryAction(
  token: string,
): Promise<AdminDashboardSummaryActionResult> {
  try {
    await requireAllowedAdminIdentity(token);

    const timezone = await getRuntimePrayerTimezone();
    const today = todayIso(new Date(), timezone);
    const through = addDaysIso(today, 7);
    const client = createServerClient();
    if (!client) {
      throw new Error("admin.errors.supabaseNotConfigured");
    }

    const [
      prayerTimes,
      upcomingJumuah,
      activeCampaigns,
      featuredCampaigns,
      publishedAnnouncements,
      urgentAnnouncements,
    ] = await Promise.all([
      client
        .from("prayer_times")
        .select("date,published")
        .gte("date", today)
        .lte("date", through),
      client
        .from("jumuah_times")
        .select("id")
        .gte("date", today)
        .eq("published", true)
        .limit(1)
        .maybeSingle(),
      client
        .from("donation_campaigns")
        .select("id", { count: "exact", head: true })
        .eq("is_active", true),
      client
        .from("donation_campaigns")
        .select("id", { count: "exact", head: true })
        .eq("is_featured", true),
      client
        .from("announcements")
        .select("id", { count: "exact", head: true })
        .eq("published", true),
      client
        .from("announcements")
        .select("id", { count: "exact", head: true })
        .eq("is_urgent", true),
    ]);

    const firstError = [
      prayerTimes.error,
      upcomingJumuah.error,
      activeCampaigns.error,
      featuredCampaigns.error,
      publishedAnnouncements.error,
      urgentAnnouncements.error,
    ].find(Boolean);
    if (firstError) {
      throw firstError;
    }

    const publishedPrayerDates = new Set(
      (prayerTimes.data ?? [])
        .filter((item) => item.published)
        .map((item) => item.date),
    );
    const nextWeekMissing = Array.from({ length: 7 }, (_, index) =>
      addDaysIso(today, index + 1),
    ).some((date) => !publishedPrayerDates.has(date));

    return {
      success: true,
      data: {
        today,
        timezone,
        todayPrayerPublished: publishedPrayerDates.has(today),
        nextWeekMissing,
        upcomingJumuahPublished: Boolean(upcomingJumuah.data),
        activeCampaignCount: activeCampaigns.count ?? 0,
        featuredCampaignCount: featuredCampaigns.count ?? 0,
        publishedAnnouncementCount: publishedAnnouncements.count ?? 0,
        urgentAnnouncementCount: urgentAnnouncements.count ?? 0,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: adminActionError(error, "Unable to load admin dashboard summary"),
    };
  }
}
