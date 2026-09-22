import { AppShell } from "@/components/layout/AppShell";
import { AppHeader } from "@/components/layout/AppHeader";
import { getPrayerTimes } from "@/lib/data/prayer-times";
import { getRuntimePrayerSettings } from "@/lib/data/prayer-settings";
import { getUrgentAnnouncements } from "@/lib/data/announcements";
import { getDonationCampaigns, getDonationReport, getDonationSettings } from "@/lib/data/donations";
import { getEvents } from "@/lib/data/events";
import { getJumuahTimes } from "@/lib/data/jumuah";
import { getMosqueSettings } from "@/lib/data/mosque-settings";
import { todayIso, addDaysIso } from "@/lib/date-utils";
import { isUpcomingEvent } from "@/lib/event-utils";
import { HomePageClient } from "@/components/home/HomePageClient";

const QA_MOCK_MARKER = "SUPABASE_QA_MOCK";

export default async function HomePage() {
  const initialNow = new Date().toISOString();
  const now = new Date(initialNow);
  const prayerSettings = await getRuntimePrayerSettings().catch(() => null);
  const prayerTimezone = prayerSettings?.timezone ?? null;
  const today = prayerTimezone ? todayIso(now, prayerTimezone) : null;
  const startDate = today ? addDaysIso(today, -1) : null;
  const endDate = today ? addDaysIso(today, 30) : null;
  const [prayerTimesResult, urgentAnnouncementsResult, jumuahTimesResult, eventsResult, donationSettingsResult, donationCampaignsResult, donationReportResult, mosqueSettingsResult] = await Promise.allSettled([
    startDate && endDate ? getPrayerTimes(false, startDate, endDate) : Promise.resolve([]),
    getUrgentAnnouncements(),
    getJumuahTimes(),
    getEvents(),
    getDonationSettings(),
    getDonationCampaigns(),
    getDonationReport(),
    getMosqueSettings(),
  ]);

  const prayerTimes = prayerTimesResult.status === "fulfilled" ? prayerTimesResult.value : [];
  const urgentAnnouncements = urgentAnnouncementsResult.status === "fulfilled" ? urgentAnnouncementsResult.value : [];
  const jumuahTimes = jumuahTimesResult.status === "fulfilled" ? jumuahTimesResult.value : [];
  const events = eventsResult.status === "fulfilled"
    ? eventsResult.value
      .filter((event) => isUpcomingEvent(event, now, prayerTimezone ?? undefined))
      .sort((a, b) => `${a.date}T${a.startTime}`.localeCompare(`${b.date}T${b.startTime}`))
    : [];
  const donationSettings = donationSettingsResult.status === "fulfilled" ? donationSettingsResult.value : undefined;
  const donationCampaigns = donationCampaignsResult.status === "fulfilled" ? donationCampaignsResult.value : [];
  const donationReport = donationReportResult.status === "fulfilled" ? donationReportResult.value : undefined;
  const mosqueSettings = mosqueSettingsResult.status === "fulfilled" ? mosqueSettingsResult.value : undefined;
  const allowAnyFutureJumuah = jumuahTimes.some((item) => item.notes === QA_MOCK_MARKER);

  return (
    <AppShell surface="home">
      <AppHeader whatsappLink={mosqueSettings?.whatsappLink} googleMapsLink={mosqueSettings?.googleMapsLink} />
      <HomePageClient
        initialPrayerTimes={prayerTimes}
        iqamaDelays={prayerSettings?.iqamaDelays ?? null}
        timezone={prayerSettings?.timezone ?? null}
        urgentAnnouncements={urgentAnnouncements}
        jumuahTimes={jumuahTimes}
        allowAnyFutureJumuah={allowAnyFutureJumuah}
        events={events}
        donationSettings={donationSettings}
        donationCampaigns={donationCampaigns}
        donationReport={donationReport}
        initialNow={initialNow}
      />
    </AppShell>
  );
}
