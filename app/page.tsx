import { AppShell } from "@/components/layout/AppShell";
import { AppHeader } from "@/components/layout/AppHeader";
import { getPrayerTimes } from "@/lib/data/prayer-times";
import { getUrgentAnnouncements } from "@/lib/data/announcements";
import { getDonationCampaigns, getDonationSettings } from "@/lib/data/donations";
import { getEvents } from "@/lib/data/events";
import { getJumuahTimes } from "@/lib/data/jumuah";
import { todayIso, addDaysIso } from "@/lib/date-utils";
import { HomePageClient } from "@/components/home/HomePageClient";

const QA_MOCK_MARKER = "SUPABASE_QA_MOCK";

export default async function HomePage() {
  const initialNow = new Date().toISOString();
  const today = todayIso(new Date(initialNow));
  const startDate = addDaysIso(today, -1);
  const endDate = addDaysIso(today, 30);
  const [prayerTimesResult, urgentAnnouncementsResult, jumuahTimesResult, eventsResult, donationSettingsResult, donationCampaignsResult] = await Promise.allSettled([
    getPrayerTimes(false, startDate, endDate),
    getUrgentAnnouncements(),
    getJumuahTimes(),
    getEvents(),
    getDonationSettings(),
    getDonationCampaigns(),
  ]);

  const prayerTimes = prayerTimesResult.status === "fulfilled" ? prayerTimesResult.value : [];
  // QA rows now live in Supabase. Keep reminder interactions inert for those rows.
  const prayerPreview = prayerTimes.some((item) => item.note === QA_MOCK_MARKER);
  const urgentAnnouncements = urgentAnnouncementsResult.status === "fulfilled" ? urgentAnnouncementsResult.value : [];
  const jumuahTimes = jumuahTimesResult.status === "fulfilled" ? jumuahTimesResult.value : [];
  const events = eventsResult.status === "fulfilled"
    ? eventsResult.value
      .filter((event) => event.date >= today)
      .sort((a, b) => `${a.date}T${a.startTime}`.localeCompare(`${b.date}T${b.startTime}`))
    : [];
  const donationSettings = donationSettingsResult.status === "fulfilled" ? donationSettingsResult.value : undefined;
  const donationCampaigns = donationCampaignsResult.status === "fulfilled" ? donationCampaignsResult.value : [];

  return (
    <AppShell surface="home">
      <AppHeader />
      <HomePageClient
        initialPrayerTimes={prayerTimes}
        prayerPreview={prayerPreview}
        urgentAnnouncements={urgentAnnouncements}
        jumuahTimes={jumuahTimes}
        allowAnyFutureJumuah
        events={events}
        donationSettings={donationSettings}
        donationCampaigns={donationCampaigns}
        initialNow={initialNow}
      />
    </AppShell>
  );
}
