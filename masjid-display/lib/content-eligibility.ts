import type {
  DisplayAnnouncementDto,
  DisplayAzkarCategory,
  DisplayAzkarDto,
  DisplayCampaignDto,
  DisplayEventDto,
  DisplayPrayerDay,
  MasjidDisplayFeedV1,
} from "./feed-types";
import { isFridayIso, localDateIso, zonedDateTime } from "./time";
import { resolvePostPrayerWindow } from "./state/post-prayer-state";
import { selectedPostPrayerAzkar } from "./post-prayer-selection";

export interface ActiveContent {
  prayerDay: DisplayPrayerDay | null;
  prayerScheduleStale: boolean;
  azkar: DisplayAzkarDto[];
  announcements: DisplayAnnouncementDto[];
  specialAnnouncements: DisplayAnnouncementDto[];
  urgentAnnouncements: DisplayAnnouncementDto[];
  events: DisplayEventDto[];
  campaigns: DisplayCampaignDto[];
  maghribPrograms: DisplayPrayerDay[];
}

function timestamp(value: string | null): number | null {
  if (!value) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function addIsoDay(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  const next = new Date(Date.UTC(year, month - 1, day + 1, 12));
  return `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, "0")}-${String(next.getUTCDate()).padStart(2, "0")}`;
}

function eventStart(item: DisplayEventDto, timezone: string): Date {
  return zonedDateTime(item.date, item.startTime, timezone);
}

function eventEnd(item: DisplayEventDto, timezone: string): Date {
  if (item.endTime) return zonedDateTime(item.date, item.endTime, timezone);
  return new Date(zonedDateTime(addIsoDay(item.date), "00:00", timezone).getTime() - 1);
}

function azkarCategory(now: Date, timezone: string): DisplayAzkarCategory | null {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      hour: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(now)
      .map((part) => [part.type, part.value]),
  );

  const hour = Number(parts.hour);
  if (hour >= 4 && hour < 12) return "Morning";
  if (hour >= 15 || hour < 4) return "Evening";
  return null;
}

export function isAnnouncementActive(item: DisplayAnnouncementDto, now: Date): boolean {
  const current = now.getTime();
  const from = timestamp(item.displayFrom);
  const until = timestamp(item.displayUntil);
  if (item.displayFrom && from === null) return false;
  if (item.displayUntil && until === null) return false;
  return (from === null || current >= from) && (until === null || current <= until);
}

export function isEventActive(item: DisplayEventDto, now: Date, timezone: string): boolean {
  const current = now.getTime();
  return current >= eventStart(item, timezone).getTime() && current <= eventEnd(item, timezone).getTime();
}

export function isCampaignActive(item: DisplayCampaignDto, now: Date, timezone: string): boolean {
  const currentDate = localDateIso(now, timezone);
  if (item.startDate && currentDate < item.startDate) return false;
  if (item.endDate && currentDate > item.endDate) return false;
  return true;
}

export function activeDisplayContent(feed: MasjidDisplayFeedV1, now: Date): ActiveContent {
  const currentDate = localDateIso(now, feed.timezone);
  const prayerDay = feed.prayers.schedule.find((day) => day.date === currentDate) ?? null;
  const playlist = new Set(feed.displaySettings.azkarPlaylistIds);
  const selectedAzkar = feed.azkar
    .filter((item) => playlist.has(item.id))
    .sort((left, right) => left.sortOrder - right.sortOrder);
  const daypart = azkarCategory(now, feed.timezone);
  const isFriday = isFridayIso(currentDate);
  // Special Friday Dhikr complements, rather than replaces, the correct
  // morning/evening/night category. At midday there is no generic daypart.
  // Never fall back to a different day's or time's contextual Azkar.
  const scheduledAzkar = selectedAzkar.filter(
    (item) => item.category === daypart || (isFriday && item.category === "Friday"),
  );
  const afterPrayer = resolvePostPrayerWindow(feed, now);
  const postPrayerAzkar = afterPrayer
    ? selectedPostPrayerAzkar(feed, afterPrayer.prayer)
    : [];
  // A fixed four-minute context replaces regular Azkar only if it has
  // content applicable to this completed prayer.
  const eligibleAzkar = postPrayerAzkar.length > 0 ? postPrayerAzkar : scheduledAzkar;

  const activeAnnouncements = feed.announcements.filter((item) => isAnnouncementActive(item, now));
  const urgentAnnouncements = activeAnnouncements.filter((item) => item.isUrgent);
  const specialAnnouncements = activeAnnouncements.filter(
    (item) => !item.isUrgent && item.displayStyle === "special",
  );
  const announcements = activeAnnouncements.filter(
    (item) => !item.isUrgent && item.displayStyle === "normal",
  );

  const nowMs = now.getTime();
  const events = feed.events
    .filter((item) => eventEnd(item, feed.timezone).getTime() >= nowMs)
    .sort(
      (left, right) =>
        eventStart(left, feed.timezone).getTime() - eventStart(right, feed.timezone).getTime(),
    );
  const campaigns = feed.campaigns.filter((item) => isCampaignActive(item, now, feed.timezone));
  const maghribPrograms = prayerDay?.maghribProgram?.enabled ? [prayerDay] : [];

  return {
    prayerDay,
    prayerScheduleStale: prayerDay === null,
    azkar: eligibleAzkar,
    announcements,
    specialAnnouncements,
    urgentAnnouncements,
    events,
    campaigns,
    maghribPrograms,
  };
}
