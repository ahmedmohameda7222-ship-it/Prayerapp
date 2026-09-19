import "server-only";

import { addDaysIso, APP_TIME_ZONE, todayIso, zonedDateTime } from "@/lib/date-utils";
import { getValidAdditionalFridayServices, isFridayIso } from "@/lib/friday";
import { getAnnouncementsForDisplayWindow } from "@/lib/data/announcements";
import { getAzkarItems } from "@/lib/data/azkar";
import { getDonationCampaignsForDisplayWindow } from "@/lib/data/donations";
import { getEventsForDisplayWindow } from "@/lib/data/events";
import { getJumuahTimesForDisplayWindow } from "@/lib/data/jumuah";
import { getMasjidDisplayGeneratedAt } from "@/lib/data/masjid-display-generated-at";
import { getMasjidDisplaySettings, getMasjidDisplaySettingsForDisplay } from "@/lib/data/masjid-display-settings";
import { getMosqueSettings, getMosqueSettingsForDisplay } from "@/lib/data/mosque-settings";
import { getPrayerSettings, getPrayerSettingsForDisplay } from "@/lib/data/prayer-settings";
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
  getPrayerSettingsForDisplay?: typeof getPrayerSettingsForDisplay;
  getJumuahTimesForDisplayWindow: typeof getJumuahTimesForDisplayWindow;
  getAnnouncementsForDisplayWindow: typeof getAnnouncementsForDisplayWindow;
  getEventsForDisplayWindow: typeof getEventsForDisplayWindow;
  getDonationCampaignsForDisplayWindow: typeof getDonationCampaignsForDisplayWindow;
  getMosqueSettings: typeof getMosqueSettings;
  getMosqueSettingsForDisplay?: typeof getMosqueSettingsForDisplay;
  getMasjidDisplaySettings: typeof getMasjidDisplaySettings;
  getMasjidDisplaySettingsForDisplay?: typeof getMasjidDisplaySettingsForDisplay;
  getAzkarItems: typeof getAzkarItems;
  getMasjidDisplayGeneratedAt: typeof getMasjidDisplayGeneratedAt;
};

const defaultDependencies: FeedDependencies = {
  getPrayerTimes,
  getPrayerSettings,
  getPrayerSettingsForDisplay,
  getJumuahTimesForDisplayWindow,
  getAnnouncementsForDisplayWindow,
  getEventsForDisplayWindow,
  getDonationCampaignsForDisplayWindow,
  getMosqueSettings,
  getMosqueSettingsForDisplay,
  getMasjidDisplaySettings,
  getMasjidDisplaySettingsForDisplay,
  getAzkarItems,
  getMasjidDisplayGeneratedAt,
};

export const MAX_MASJID_DISPLAY_FEED_BYTES = 128 * 1024;
export const MAX_MASJID_DISPLAY_SOURCE_ROW_BYTES = 16 * 1024;

const MAX_DISPLAY_JUMUAH_ROWS = 64;
const MAX_DISPLAY_ANNOUNCEMENT_ROWS = 64;
const MAX_DISPLAY_EVENT_ROWS = 128;
const MAX_DISPLAY_CAMPAIGN_ROWS = 64;

const HH_MM = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function assertMasjidDisplayFeedPayloadSize(value: unknown) {
  const serialized = typeof value === "string" ? value : JSON.stringify(value);
  const byteLength = new TextEncoder().encode(serialized).byteLength;
  if (byteLength > MAX_MASJID_DISPLAY_FEED_BYTES) {
    throw new DisplayFeedBuildError(
      `Masjid Display Feed exceeds maximum size of ${MAX_MASJID_DISPLAY_FEED_BYTES} bytes`,
    );
  }
}

function assertDynamicSourceBounds(label: string, rows: unknown[], maxRows: number) {
  if (rows.length > maxRows) {
    throw new DisplayFeedBuildError(
      `Masjid Display ${label} source exceeds maximum row count of ${maxRows}`,
    );
  }
}

function assertProjectedSourceRowSizes(label: string, rows: unknown[]) {
  for (const row of rows) {
    const bytes = new TextEncoder().encode(JSON.stringify(row)).byteLength;
    if (bytes > MAX_MASJID_DISPLAY_SOURCE_ROW_BYTES) {
      throw new DisplayFeedBuildError(
        `Masjid Display ${label} public row exceeds maximum size of ${MAX_MASJID_DISPLAY_SOURCE_ROW_BYTES} bytes`,
      );
    }
  }
}

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

  const prayerSettingsPromise = dependencies.getPrayerSettingsForDisplay
    ? dependencies.getPrayerSettingsForDisplay()
    : dependencies.getPrayerSettings().then((value) =>
        value ? { value, sourceUpdatedAt: undefined as string | undefined } : null
      );
  const mosqueSettingsPromise = dependencies.getMosqueSettingsForDisplay
    ? dependencies.getMosqueSettingsForDisplay()
    : dependencies.getMosqueSettings(true).then((value) => ({
        value,
        sourceUpdatedAt: undefined as string | undefined,
      }));
  const displaySettingsPromise = dependencies.getMasjidDisplaySettingsForDisplay
    ? dependencies.getMasjidDisplaySettingsForDisplay()
    : dependencies.getMasjidDisplaySettings().then((value) =>
        value ? { value, sourceUpdatedAt: undefined as string | undefined } : null
      );

  const [
    prayers,
    prayerSettingsSource,
    jumuahTimes,
    announcements,
    events,
    campaigns,
    mosqueSettingsSource,
    displaySettingsSource,
    azkarItems,
  ] = await Promise.all([
    dependencies.getPrayerTimes(true, startDate, endDate),
    prayerSettingsPromise,
    dependencies.getJumuahTimesForDisplayWindow(startDate, endDate),
    dependencies.getAnnouncementsForDisplayWindow(now.toISOString(), horizonEnd.toISOString()),
    dependencies.getEventsForDisplayWindow(today, endDate),
    dependencies.getDonationCampaignsForDisplayWindow(today, endDate),
    mosqueSettingsPromise,
    displaySettingsPromise,
    dependencies.getAzkarItems(true),
  ]);

  if (!prayerSettingsSource) throw new DisplayFeedBuildError("Prayer settings are required for the display feed");
  if (!displaySettingsSource) throw new DisplayFeedBuildError("Masjid Display settings are required for the display feed");
  if (prayers.length === 0) throw new DisplayFeedBuildError("Published prayer schedule is unavailable for the display window");

  assertDynamicSourceBounds("Jumuah", jumuahTimes, MAX_DISPLAY_JUMUAH_ROWS);
  assertDynamicSourceBounds("announcement", announcements, MAX_DISPLAY_ANNOUNCEMENT_ROWS);
  assertDynamicSourceBounds("event", events, MAX_DISPLAY_EVENT_ROWS);
  assertDynamicSourceBounds("campaign", campaigns, MAX_DISPLAY_CAMPAIGN_ROWS);

  const prayerSettings = prayerSettingsSource.value;
  const mosqueSettings = mosqueSettingsSource.value;
  const displaySettings = displaySettingsSource.value;

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
  const validAzkarPlaylistIds = [
    ...new Set(displaySettings.azkarPlaylistIds.filter((id) => canonicalAzkarIds.has(id))),
  ];

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
  assertProjectedSourceRowSizes("Jumuah", additionalJumuah);

  const representedAnnouncementSources: Array<Announcement & { sourceUpdatedAt?: string }> = [];
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
  assertProjectedSourceRowSizes("announcement", projectedAnnouncements);

  const representedEventSources: Array<Event & { sourceUpdatedAt?: string }> = [];
  const projectedEvents: DisplayEventDto[] = [];
  for (const item of events) {
    const projected = projectEvent(item);
    if (!projected || !includeEventInFeed(item, now, horizonEnd)) continue;
    representedEventSources.push(item);
    projectedEvents.push(projected);
  }
  projectedEvents.sort((a, b) => `${a.date}T${a.startTime}`.localeCompare(`${b.date}T${b.startTime}`) || a.id.localeCompare(b.id));
  assertProjectedSourceRowSizes("event", projectedEvents);

  const representedCampaignSources: Array<DonationCampaign & { sourceUpdatedAt?: string }> = [];
  const projectedCampaigns: DisplayCampaignDto[] = [];
  for (const item of campaigns) {
    const projected = projectCampaign(item);
    if (!projected || !includeCampaignInFeed(item, now, horizonEnd)) continue;
    representedCampaignSources.push(item);
    projectedCampaigns.push(projected);
  }
  projectedCampaigns.sort((a, b) => a.startDate.localeCompare(b.startDate) || a.id.localeCompare(b.id));
  assertProjectedSourceRowSizes("campaign", projectedCampaigns);

  const projectedAzkar = selectDisplayAzkar(azkarItems, validAzkarPlaylistIds);

  const prayerIds = representedPrayers.map((item) => item.id);
  const jumuahIds = additionalJumuah.map((item) => item.id);
  const announcementIds = projectedAnnouncements.map((item) => item.id);
  const eventIds = projectedEvents.map((item) => item.id);
  const campaignIds = projectedCampaigns.map((item) => item.id);
  const representedJumuahIds = new Set(jumuahIds);

  const sourceTimestamps = [
    ...representedPrayers.map((item) => item.updatedAt),
    prayerSettingsSource.sourceUpdatedAt,
    ...jumuahTimes
      .filter((item) => representedJumuahIds.has(item.id))
      .map((item) => item.sourceUpdatedAt),
    ...representedAnnouncementSources.map((item) => item.sourceUpdatedAt),
    ...representedEventSources.map((item) => item.sourceUpdatedAt),
    ...representedCampaignSources.map((item) => item.sourceUpdatedAt),
    mosqueSettingsSource.sourceUpdatedAt,
    displaySettingsSource.sourceUpdatedAt,
  ].filter((value): value is string => typeof value === "string" && value.length > 0);

  const generatedAt = await dependencies.getMasjidDisplayGeneratedAt(
    {
      prayerIds,
      jumuahIds,
      announcementIds,
      eventIds,
      campaignIds,
      sourceTimestamps: sourceTimestamps,
      azkar: projectedAzkar,
    },
    zonedDateTime(today, "00:00").toISOString(),
  );

  const feed: MasjidDisplayFeedBodyV1 = {
    schemaVersion: 1,
    generatedAt,
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
      azkarPlaylistIds: validAzkarPlaylistIds,
    },
    azkar: projectedAzkar,
    announcements: projectedAnnouncements,
    events: projectedEvents,
    campaigns: projectedCampaigns,
  };

  assertMasjidDisplayFeedPayloadSize(feed);
  return feed;
}
