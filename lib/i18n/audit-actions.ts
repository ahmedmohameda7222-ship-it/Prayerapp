import type { PrayerName } from "@/lib/types";

type Translate = (key: string, values?: Record<string, string | number>) => string;

const prayerNameLookup: Record<string, PrayerName> = {
  Fajr: "fajr",
  Sunrise: "sunrise",
  Dhuhr: "dhuhr",
  Asr: "asr",
  Maghrib: "maghrib",
  Isha: "isha",
};

export function getLocalizedAuditAction(action: string, t: Translate) {
  const match = action.match(/^changed (\w+) time on ([0-9-]+) from ([0-9:]+) to ([0-9:]+)$/u);
  if (match) {
    const prayer = prayerNameLookup[match[1]] ? t(`prayer.${prayerNameLookup[match[1]]}`) : match[1];
    return t("admin.audit.changedPrayerTime", { prayer, date: match[2], from: match[3], to: match[4] });
  }

  if (/^created announcement/u.test(action)) return t("admin.audit.createdAnnouncement");
  if (/^updated announcement/u.test(action)) return t("admin.audit.updatedAnnouncement");
  if (/^deleted announcement/u.test(action)) return t("admin.audit.deletedAnnouncement");
  if (/^published announcement/u.test(action)) return t("admin.audit.publishedAnnouncement");
  if (/^unpublished announcement/u.test(action)) return t("admin.audit.unpublishedAnnouncement");
  if (/^marked urgent announcement/u.test(action)) return t("admin.audit.markedUrgentAnnouncement");
  if (/^unmarked urgent announcement/u.test(action)) return t("admin.audit.unmarkedUrgentAnnouncement");

  if (/^updated donation settings/u.test(action)) return t("admin.audit.updatedDonationSettings");
  if (/^created donation campaign/u.test(action)) return t("admin.audit.createdDonationCampaign");
  if (/^updated donation campaign/u.test(action)) return t("admin.audit.updatedDonationCampaign");
  if (/^deleted donation campaign/u.test(action)) return t("admin.audit.deletedDonationCampaign");
  if (/^activated donation campaign/u.test(action)) return t("admin.audit.activatedDonationCampaign");
  if (/^deactivated donation campaign/u.test(action)) return t("admin.audit.deactivatedDonationCampaign");
  if (/^featured donation campaign/u.test(action)) return t("admin.audit.featuredDonationCampaign");
  if (/^unfeatured donation campaign/u.test(action)) return t("admin.audit.unfeaturedDonationCampaign");

  if (/^created event/u.test(action)) return t("admin.audit.createdEvent");
  if (/^updated event/u.test(action)) return t("admin.audit.updatedEvent");
  if (/^deleted event/u.test(action)) return t("admin.audit.deletedEvent");

  if (/^created azkar item/u.test(action)) return t("admin.audit.createdAzkar");
  if (/^updated azkar item/u.test(action)) return t("admin.audit.updatedAzkar");
  if (/^deleted azkar item/u.test(action)) return t("admin.audit.deletedAzkar");
  if (/^published azkar item/u.test(action)) return t("admin.audit.publishedAzkar");
  if (/^unpublished azkar item/u.test(action)) return t("admin.audit.unpublishedAzkar");

  if (/^created Jumu'ah entry/u.test(action)) return t("admin.audit.createdJumuah");
  if (/^updated Jumu'ah entry/u.test(action)) return t("admin.audit.updatedJumuah");
  if (/^deleted Jumu'ah entry/u.test(action)) return t("admin.audit.deletedJumuah");
  if (/^published Jumu'ah entry/u.test(action)) return t("admin.audit.publishedJumuah");
  if (/^unpublished Jumu'ah entry/u.test(action)) return t("admin.audit.unpublishedJumuah");

  if (/^created prayer time/u.test(action)) return t("admin.audit.createdPrayerTime");
  if (/^updated prayer time/u.test(action)) return t("admin.audit.updatedPrayerTime");
  if (/^deleted prayer time/u.test(action)) return t("admin.audit.deletedPrayerTime");
  if (/^published prayer time/u.test(action)) return t("admin.audit.publishedPrayerTime");
  if (/^unpublished prayer time/u.test(action)) return t("admin.audit.unpublishedPrayerTime");

  if (/^created Ramadan day/u.test(action)) return t("admin.audit.createdRamadanDay");
  if (/^updated Ramadan day/u.test(action)) return t("admin.audit.updatedRamadanDay");
  if (/^deleted Ramadan day/u.test(action)) return t("admin.audit.deletedRamadanDay");
  if (/^published Friday location update/u.test(action)) return t("admin.audit.publishedFridayLocationUpdate");
  if (/^updated mosque settings/u.test(action)) return t("admin.audit.updatedMosqueSettings");

  return t("admin.audit.unknown");
}
