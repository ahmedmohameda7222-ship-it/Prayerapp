import { AppShell } from "@/components/layout/AppShell";
import { AppHeader } from "@/components/layout/AppHeader";
import { getPrayerTimes } from "@/lib/data/prayer-times";
import { getAnnouncements } from "@/lib/data/announcements";
import { getDonationCampaigns, getDonationSettings } from "@/lib/data/donations";
import { getEvents } from "@/lib/data/events";
import { todayIso, addDaysIso } from "@/lib/date-utils";
import { HomePageClient } from "@/components/home/HomePageClient";

export default async function HomePage() {
  const today = todayIso();
  const startDate = addDaysIso(today, -1);
  const endDate = addDaysIso(today, 30);
  const [prayerTimesResult, announcementsResult, eventsResult, donationSettingsResult, donationCampaignsResult] = await Promise.allSettled([
    getPrayerTimes(false, startDate, endDate),
    getAnnouncements(),
    getEvents(),
    getDonationSettings(),
    getDonationCampaigns(),
  ]);
  const prayerTimes = prayerTimesResult.status === "fulfilled" ? prayerTimesResult.value : [];
  const urgentAnnouncements = announcementsResult.status === "fulfilled"
    ? announcementsResult.value.filter((announcement) => announcement.isUrgent)
    : [];
  const events = eventsResult.status === "fulfilled"
    ? eventsResult.value.filter((event) => event.date >= today)
    : [];
  const donationSettings = donationSettingsResult.status === "fulfilled" ? donationSettingsResult.value : undefined;
  const donationCampaigns = donationCampaignsResult.status === "fulfilled" ? donationCampaignsResult.value : [];

  return (
    <AppShell>
      <AppHeader />
      <HomePageClient
        initialPrayerTimes={prayerTimes}
        urgentAnnouncements={urgentAnnouncements}
        events={events}
        donationSettings={donationSettings}
        donationCampaigns={donationCampaigns}
      />
    </AppShell>
  );
}
