import "server-only";

import { addDaysIso, APP_TIME_ZONE, todayIso, zonedDateTime } from "@/lib/date-utils";
import { getValidAdditionalFridayServices, isFridayIso } from "@/lib/friday";
import { getAnnouncements } from "@/lib/data/announcements";
import { getAzkarItems } from "@/lib/data/azkar";
import { getDonationCampaigns } from "@/lib/data/donations";
import { getEvents } from "@/lib/data/events";
import { getJumuahTimes } from "@/lib/data/jumuah";
import { getMasjidDisplaySettings } from "@/lib/data/masjid-display-settings";
import { getMosqueSettings } from "@/lib/data/mosque-settings";
import { getPrayerSettings } from "@/lib/data/prayer-settings";
import { getPrayerTimes } from "@/lib/data/prayer-times";
import type { Announcement, DonationCampaign, Event, PrayerTime } from "@/lib/types";
import { selectDisplayAzkar } from "./azkar-selection";
import {
  includeAnnouncementInFeed,
  includeCampaignInFeed,
  includeEventInFeed,
} from "./content-eligibility";
import { validateDisplayPublishableContent } from "./content-validation";
import type {
  DisplayAnnouncementDto,
  DisplayCampaignDto,
  DisplayEventDto,
  DisplayPrayerDay,
  MasjidDisplayFeedBodyV1,
} from "./feed-contract";

export class DisplayFeedBuildError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DisplayFeedBuildError";
  }
}

type FeedDependencies = {
  getPrayerTimes: typeof getPrayerTimes;
  getPrayerSettings: typeof getPrayerSettings;
  getJumuahTimes: typeof getJumuahTimes;
  getAnnouncements: typeof getAnnouncements;
  getEvents: typeof getEvents;
  getDonationCampaigns: typeof getDonationCampaigns;
  getMosqueSettings: typeof getMosqueSettings;
  getMasjidDisplaySettings: typeof getMasjidDisplaySettings;
  getAzkarItems: typeof getAzkarItems;
};

const defaultDependencies: FeedDependencies = {
  getPrayerTimes,
  getPrayerSettings,
  getJumuahTimes,
  getAnnouncements,
  getEvents,
  getDonationCampaigns,
  getMosqueSettings,
  getMasjidDisplaySettings,
  getAzkarItems,
};

const HH_MM = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function endOfLocalDate(date: string) {
  return new Date(zonedDateTime(addDaysIso(date, 1), "00:00").getTime() - 1);
}

function requiredText(value: string | undefined, field: string) {
  if (!value?.trim()) throw new DisplayFeedBuildError(`Missing required display setting: ${field}`);
  return value;
}

function requirePublicAppUrl(value: string) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") throw new Error("not https");
  } catch {
    throw new DisplayFeedBuildError("Invalid required display setting: publicAppUrl");
  }
  return value;
}

function requireInteger(value: number, field: string, min: number, max: number) {
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new DisplayFeedBuildError(`Invalid required display setting: ${field}`);
  }
  return value;
}

function prayerDay(row: PrayerTime): DisplayPrayerDay {
  const program = row.maghribProgram;
  return {
    date: row.date,
    fajr: row.fajr,
    sunrise: row.sunrise,
    dhuhr: row.dhuhr,
    asr: row.asr,
    maghrib: row.maghrib,
    isha: row.isha,
    maghribProgram: program ? {
      enabled: program.enabled,
      lessonTitle: program.lessonTitle?.trim() || null,
      lessonDurationMinutes: program.lessonDurationMinutes ?? null,
      combinedIshaTime: program.combinedIshaTime || null,
    } : null,
  };
}

function validHttpUrl(value: string | undefined) {
  if (!value) return true;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function validIsoDate(value: string | undefined) {
  if (!value || !ISO_DATE.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
}

function validTime(value: string | undefined) {
  return typeof value === "string" && HH_MM.test(value);
}

function validTimestamp(value: string | undefined) {
  return !value || (/^\d{4}-\d{2}-\d{2}T/.test(value) && Number.isFinite(Date.parse(value)));
}

function validNonNegativeNumber(value: number) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function diagnostic(kind: "announcement" | "event" | "campaign", id: string, reasons: string[]) {
  console.warn("Masjid Display feed omitted invalid dynamic content", { kind, id, reasons });
}

function projectAnnouncement(item: Announcement): DisplayAnnouncementDto | null {
  const reasons = validateDisplayPublishableContent("announcement", item);
  if (!item.id?.trim()) reasons.push("ID is required");
  if (item.displayStyle !== "normal" && item.displayStyle !== "special") reasons.push("Display style is invalid");
  if (typeof item.isUrgent !== "boolean") reasons.push("Urgent flag is invalid");
  if (!validTimestamp(item.displayFrom)) reasons.push("Display start is invalid");
  if (!validTimestamp(item.displayUntil)) reasons.push("Display end is invalid");
  if (
    item.displayFrom &&
    item.displayUntil &&
    Number.isFinite(Date.parse(item.displayFrom)) &&
    Number.isFinite(Date.parse(item.displayUntil)) &&
    Date.parse(item.displayUntil) < Date.parse(item.displayFrom)
  ) {
    reasons.push("Display end precedes display start");
  }
  if (reasons.length > 0) {
    diagnostic("announcement", item.id || "<missing>", reasons);
    return null;
  }
  return {
    id: item.id,
    titleAr: item.titleAr!.trim(),
    titleDe: item.titleDe!.trim(),
    messageAr: item.messageAr!.trim(),
    messageDe: item.messageDe!.trim(),
    isUrgent: item.isUrgent,
    displayStyle: item.displayStyle,
    displayFrom: item.displayFrom || null,
    displayUntil: item.displayUntil || null,
  };
}

function projectEvent(item: Event): DisplayEventDto | null {
  const reasons = validateDisplayPublishableContent("event", item);
  if (!item.id?.trim()) reasons.push("ID is required");
  if (!validIsoDate(item.date)) reasons.push("Event date is invalid");
  if (!validTime(item.startTime)) reasons.push("Event start time is invalid");
  if (item.endTime && !validTime(item.endTime)) reasons.push("Event end time is invalid");
  if (item.endTime && validTime(item.startTime) && validTime(item.endTime) && item.endTime < item.startTime) {
    reasons.push("Event end time precedes start time");
  }
  if (!item.type?.trim()) reasons.push("Event type is required");
  if (reasons.length > 0) {
    diagnostic("event", item.id || "<missing>", reasons);
    return null;
  }
  return {
    id: item.id,
    titleAr: item.titleAr!.trim(),
    titleDe: item.titleDe!.trim(),
    descriptionAr: item.descriptionAr!.trim(),
    descriptionDe: item.descriptionDe!.trim(),
    locationAr: item.locationAr!.trim(),
    locationDe: item.locationDe!.trim(),
    date: item.date,
    startTime: item.startTime,
    endTime: item.endTime || null,
    type: item.type,
  };
}

function projectCampaign(item: DonationCampaign): DisplayCampaignDto | null {
  const reasons = validateDisplayPublishableContent("campaign", item);
  if (!item.id?.trim()) reasons.push("ID is required");
  if (!validNonNegativeNumber(item.targetAmount)) reasons.push("Target amount is invalid");
  if (!validNonNegativeNumber(item.collectedAmount)) reasons.push("Collected amount is invalid");
  if (!validIsoDate(item.startDate)) reasons.push("Campaign start date is invalid");
  if (item.endDate && !validIsoDate(item.endDate)) reasons.push("Campaign end date is invalid");
  if (item.endDate && validIsoDate(item.startDate) && validIsoDate(item.endDate) && item.endDate < item.startDate) {
    reasons.push("Campaign end date precedes start date");
  }
  if (!validHttpUrl(item.donationUrl)) reasons.push("Donation URL is invalid");
  if (typeof item.isFeatured !== "boolean") reasons.push("Featured flag is invalid");
  if (reasons.length > 0) {
    diagnostic("campaign", item.id || "<missing>", reasons);
    return null;
  }
  return {
    id: item.id,
    titleAr: item.titleAr!.trim(),
    titleDe: item.titleDe!.trim(),
    descriptionAr: item.descriptionAr!.trim(),
    descriptionDe: item.descriptionDe!.trim(),
    targetAmount: item.targetAmount,
    collectedAmount: item.collectedAmount,
    startDate: item.startDate,
    endDate: item.endDate || null,
    donationUrl: item.donationUrl || null,
    isFeatured: item.isFeatured,
  };
}

function latestSourceTimestamp(prayers: PrayerTime[], announcements: Announcement[], fallback: Date) {
  const timestamps = [
    ...prayers.map((item) => item.updatedAt),
    ...announcements.map((item) => item.createdAt),
  ]
    .map((value) => Date.parse(value))
    .filter(Number.isFinite);
  return new Date(timestamps.length > 0 ? Math.max(...timestamps) : fallback.getTime()).toISOString();
}

function expectedScheduleDates(startDate: string, endDate: string) {
  const dates: string[] = [];
  for (let date = startDate; date <= endDate; date = addDaysIso(date, 1)) dates.push(date);
  return dates;
}

export async function buildMasjidDisplayFeed(
  now = new Date(),
  dependencies: FeedDependencies = defaultDependencies,
): Promise<MasjidDisplayFeedBodyV1> {
  const today = todayIso(now);
  const startDate = addDaysIso(today, -1);
  const endDate = addDaysIso(today, 35);
  const horizonEnd = endOfLocalDate(endDate);

  const [
    prayers,
    prayerSettings,
    jumuahTimes,
    announcements,
    events,
    campaigns,
    mosqueSettings,
    displaySettings,
    azkarItems,
  ] = await Promise.all([
    dependencies.getPrayerTimes(false, startDate, endDate),
    dependencies.getPrayerSettings(),
    dependencies.getJumuahTimes(false),
    dependencies.getAnnouncements(false),
    dependencies.getEvents(false),
    dependencies.getDonationCampaigns(false),
    dependencies.getMosqueSettings(),
    dependencies.getMasjidDisplaySettings(),
    dependencies.getAzkarItems(true),
  ]);

  if (!prayerSettings) throw new DisplayFeedBuildError("Prayer settings are required for the display feed");
  if (!displaySettings) throw new DisplayFeedBuildError("Masjid Display settings are required for the display feed");
  if (prayers.length === 0) throw new DisplayFeedBuildError("Published prayer schedule is unavailable for the display window");

  const iqamaDelays = {
    fajr: requireInteger(prayerSettings.iqamaDelays.fajr, "fajr iqama delay", 0, 180),
    dhuhr: requireInteger(prayerSettings.iqamaDelays.dhuhr, "dhuhr iqama delay", 0, 180),
    asr: requireInteger(prayerSettings.iqamaDelays.asr, "asr iqama delay", 0, 180),
    maghrib: requireInteger(prayerSettings.iqamaDelays.maghrib, "maghrib iqama delay", 0, 180),
    isha: requireInteger(prayerSettings.iqamaDelays.isha, "isha iqama delay", 0, 180),
  };

  const prayerDurations = {
    fajr: requireInteger(displaySettings.fajrPrayerDurationMinutes, "fajr prayer duration", 2, 120),
    dhuhr: requireInteger(displaySettings.dhuhrPrayerDurationMinutes, "dhuhr prayer duration", 2, 120),
    asr: requireInteger(displaySettings.asrPrayerDurationMinutes, "asr prayer duration", 2, 120),
    maghrib: requireInteger(displaySettings.maghribPrayerDurationMinutes, "maghrib prayer duration", 2, 120),
    isha: requireInteger(displaySettings.ishaPrayerDurationMinutes, "isha prayer duration", 2, 120),
  };

  const canonicalAzkarIds = new Set(azkarItems.map((item) => item.id));
  for (const id of displaySettings.azkarPlaylistIds) {
    if (!canonicalAzkarIds.has(id)) {
      throw new DisplayFeedBuildError(`Invalid Masjid Display settings: unknown Azkar playlist ID ${id}`);
    }
  }

  const representedPrayers = prayers
    .filter((item) => item.published && item.date >= startDate && item.date <= endDate)
    .sort((a, b) => a.date.localeCompare(b.date));
  const schedule = representedPrayers.map(prayerDay);
  const expectedDates = expectedScheduleDates(startDate, endDate);
  if (
    schedule.length !== expectedDates.length ||
    schedule.some((day, index) => day.date !== expectedDates[index])
  ) {
    throw new DisplayFeedBuildError("Published prayer schedule is incomplete for the display window");
  }

  const additionalJumuah = representedPrayers
    .filter((item) => isFridayIso(item.date))
    .flatMap((item) => getValidAdditionalFridayServices(item.date, item.dhuhr, jumuahTimes))
    .map((item) => ({ id: item.id, date: item.date, prayerTime: item.prayerTime }))
    .sort((a, b) => a.date.localeCompare(b.date) || a.prayerTime.localeCompare(b.prayerTime) || a.id.localeCompare(b.id));

  const representedAnnouncementSources: Announcement[] = [];
  const projectedAnnouncements: DisplayAnnouncementDto[] = [];
  for (const item of announcements) {
    const projected = projectAnnouncement(item);
    if (!projected || !includeAnnouncementInFeed(item, now, horizonEnd)) continue;
    representedAnnouncementSources.push(item);
    projectedAnnouncements.push(projected);
  }
  projectedAnnouncements.sort((a, b) => {
    const aSource = representedAnnouncementSources.find((item) => item.id === a.id);
    const bSource = representedAnnouncementSources.find((item) => item.id === b.id);
    return (aSource?.createdAt || "").localeCompare(bSource?.createdAt || "") || a.id.localeCompare(b.id);
  });
  representedAnnouncementSources.sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));

  const projectedEvents: DisplayEventDto[] = [];
  for (const item of events) {
    const projected = projectEvent(item);
    if (!projected || !includeEventInFeed(item, now, horizonEnd)) continue;
    projectedEvents.push(projected);
  }
  projectedEvents.sort((a, b) => `${a.date}T${a.startTime}`.localeCompare(`${b.date}T${b.startTime}`) || a.id.localeCompare(b.id));

  const projectedCampaigns: DisplayCampaignDto[] = [];
  for (const item of campaigns) {
    const projected = projectCampaign(item);
    if (!projected || !includeCampaignInFeed(item, now, horizonEnd)) continue;
    projectedCampaigns.push(projected);
  }
  projectedCampaigns.sort((a, b) => a.startDate.localeCompare(b.startDate) || a.id.localeCompare(b.id));

  const anchor = zonedDateTime(today, "00:00");

  return {
    schemaVersion: 1,
    generatedAt: latestSourceTimestamp(representedPrayers, representedAnnouncementSources, anchor),
    timezone: APP_TIME_ZONE,
    mosque: {
      nameAr: requiredText(mosqueSettings.mosqueNameAr, "mosqueNameAr"),
      nameDe: requiredText(mosqueSettings.mosqueNameDe, "mosqueNameDe"),
      address: requiredText(mosqueSettings.address, "address"),
      publicAppUrl: requirePublicAppUrl(mosqueSettings.publicAppUrl),
    },
    prayers: {
      schedule,
      iqamaDelays,
      additionalJumuah,
    },
    displaySettings: {
      prayerDurations,
      azkarPlaylistIds: [...new Set(displaySettings.azkarPlaylistIds)],
    },
    azkar: selectDisplayAzkar(azkarItems, displaySettings.azkarPlaylistIds),
    announcements: projectedAnnouncements,
    events: projectedEvents,
    campaigns: projectedCampaigns,
  };
}
