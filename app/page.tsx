import { AppShell } from "@/components/layout/AppShell";
import { AppHeader } from "@/components/layout/AppHeader";
import { getPrayerTimes } from "@/lib/data/prayer-times";
import { getUrgentAnnouncements } from "@/lib/data/announcements";
import { getDonationCampaigns, getDonationSettings } from "@/lib/data/donations";
import { getEvents } from "@/lib/data/events";
import { getJumuahTimes } from "@/lib/data/jumuah";
import { todayIso, addDaysIso } from "@/lib/date-utils";
import { getFridayPreviewMockData } from "@/lib/friday-preview-mock";
import { getPrayerPreviewMockData } from "@/lib/prayer-preview-mock";
import { HomePageClient } from "@/components/home/HomePageClient";

export default async function HomePage() {
  const initialNow = new Date().toISOString();
  const initialDate = new Date(initialNow);
  const today = todayIso(initialDate);
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
  const realPrayerTimes = prayerTimesResult.status === "fulfilled" ? prayerTimesResult.value : [];
  const prayerPreview = prayerTimesResult.status === "fulfilled" && realPrayerTimes.length === 0;
  const prayerTimes = prayerPreview
    ? getPrayerPreviewMockData(startDate, endDate, initialDate)
    : realPrayerTimes;
  const urgentAnnouncements = urgentAnnouncementsResult.status === "fulfilled" ? urgentAnnouncementsResult.value : [];
  const realJumuahTimes = jumuahTimesResult.status === "fulfilled" ? jumuahTimesResult.value : [];
  const jumuahPreview = jumuahTimesResult.status === "fulfilled" && realJumuahTimes.length === 0;
  const jumuahTimes = jumuahPreview
    ? getFridayPreviewMockData(initialDate)
    : realJumuahTimes;
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
        jumuahPreview={jumuahPreview}
        events={events}
        donationSettings={donationSettings}
        donationCampaigns={donationCampaigns}
        initialNow={initialNow}
      />
    </AppShell>
  );
}
