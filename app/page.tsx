import { AppShell } from "@/components/layout/AppShell";
import { AppHeader } from "@/components/layout/AppHeader";
import { getPrayerRuntimeAuthority } from "@/lib/data/prayer-settings";
import { getPublishedPrayerScheduleSnapshot } from "@/lib/data/prayer-schedule-snapshot";
import { getUrgentAnnouncements } from "@/lib/data/announcements";
import { getDonationCampaigns, getDonationReport, getDonationSettings } from "@/lib/data/donations";
import { getEvents } from "@/lib/data/events";
import { getJumuahTimes } from "@/lib/data/jumuah";
import { getMosqueSettings } from "@/lib/data/mosque-settings";
import { APP_TIME_ZONE } from "@/lib/date-utils";
import { isUpcomingEvent } from "@/lib/event-utils";
import { HomePageClient } from "@/components/home/HomePageClient";

const QA_MOCK_MARKER = "SUPABASE_QA_MOCK";

export default async function HomePage() {
  const initialNow = new Date().toISOString();
  const now = new Date(initialNow);
  const [prayerSnapshotResult, prayerAuthorityResult, urgentAnnouncementsResult, jumuahTimesResult, eventsResult, donationSettingsResult, donationCampaignsResult, donationReportResult, mosqueSettingsResult] = await Promise.allSettled([
    getPublishedPrayerScheduleSnapshot({ now, daysBefore: 1, daysAfter: 30 }),
    getPrayerRuntimeAuthority(),
    getUrgentAnnouncements(),
    getJumuahTimes(),
    getEvents(),
    getDonationSettings(),
    getDonationCampaigns(),
    getDonationReport(),
    getMosqueSettings(),
  ]);

  const prayerSnapshot = prayerSnapshotResult.status === "fulfilled" ? prayerSnapshotResult.value : null;
  const prayerSettings = prayerAuthorityResult.status === "fulfilled" ? prayerAuthorityResult.value : null;
  const prayerTimezone = prayerSnapshot?.timezone ?? prayerAuthority?.timezone ?? APP_TIME_ZONE;
  const prayerTimes = prayerSnapshot?.rows ?? [];
  const urgentAnnouncements = urgentAnnouncementsResult.status === "fulfilled" ? urgentAnnouncementsResult.value : [];
  const jumuahTimes = jumuahTimesResult.status === "fulfilled" ? jumuahTimesResult.value : [];
  const events = eventsResult.status === "fulfilled"
    ? eventsResult.value
      .filter((event) => isUpcomingEvent(event, now, prayerTimezone))
      .sort((a, b) => `${a.date}T${a.startTime}`.localeCompare(`${b.date}T${b.startTime}`))
    : [];
  const donationSettings = donationSettingsResult.status === "fulfilled" ? donationSettingsResult.value : undefined;
  const donationCampaigns = donationCampaignsResult.status === "fulfilled" ? donationCampaignsResult.value : [];
  const donationReport = donationReportResult.status === "fulfilled" ? donationReportResult.value : undefined;
  const mosqueSettings = mosqueSettingsResult.status === "fulfilled" ? mosqueSettingsResult.value : undefined;
  const allowAnyFutureJumuah = jumuahTimes.some((item) => item.notes === QA_MOCK_MARKER);

  return (
    <AppShell surface="home">
      <AppHeader timezone={prayerTimezone} whatsappLink={mosqueSettings?.whatsappLink} googleMapsLink={mosqueSettings?.googleMapsLink} />
      <HomePageClient
        initialPrayerTimes={prayerTimes}
        iqamaDelays={prayerAuthority?.iqamaDelays ?? null}
        timezone={prayerTimezone}
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
