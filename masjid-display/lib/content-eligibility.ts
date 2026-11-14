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
import { JUMUAH_HOLD_MS } from "./state/friday-state";

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

const MINUTE_MS = 60_000;
const AFTER_PRAYER_AZKAR_WINDOW_MS = 15 * MINUTE_MS;
const PRAYER_NAMES = ["fajr", "dhuhr", "asr", "maghrib", "isha"] as const;
const AMBIENT_CATEGORIES = new Set<DisplayAzkarCategory>(["Morning", "Evening", "Sleep"]);
type CompletedPrayerWindow = { startMs: number; endMs: number };

// Like prayer-state.ts, this depends only on the immutable, validated Feed.
// Avoid rebuilding hundreds of timezone-aware instants every second.
const AFTER_PRAYER_WINDOWS = new WeakMap<MasjidDisplayFeedV1, CompletedPrayerWindow[]>();

function afterPrayerWindows(feed: MasjidDisplayFeedV1): CompletedPrayerWindow[] {
  const cached = AFTER_PRAYER_WINDOWS.get(feed);
  if (cached) return cached;

  const windows: CompletedPrayerWindow[] = [];
  const addWindow = (endMs: number) => {
    windows.push({ startMs: endMs, endMs: endMs + AFTER_PRAYER_AZKAR_WINDOW_MS });
  };

  for (const day of feed.prayers.schedule) {
    for (const prayer of PRAYER_NAMES) {
      if (prayer === "dhuhr" && isFridayIso(day.date)) continue;
      const prayerAt = zonedDateTime(day.date, day[prayer], feed.timezone).getTime();
      const delay = feed.prayers.iqamaDelays[prayer];
      const duration = feed.displaySettings.prayerDurations[prayer];
      addWindow(prayerAt + (delay + duration) * MINUTE_MS);
    }

    if (!isFridayIso(day.date)) continue;
    const primaryAt = zonedDateTime(day.date, day.dhuhr, feed.timezone).getTime();
    addWindow(primaryAt + JUMUAH_HOLD_MS);

    // The first Friday service is the stored Dhuhr time. Extras are Admin-only.
    const uniqueAdditionalTimes = new Set<string>();
    for (const extra of feed.prayers.additionalJumuah) {
      if (
        extra.date !== day.date ||
        extra.prayerTime <= day.dhuhr ||
        uniqueAdditionalTimes.has(extra.prayerTime)
      ) continue;
      uniqueAdditionalTimes.add(extra.prayerTime);
      addWindow(zonedDateTime(extra.date, extra.prayerTime, feed.timezone).getTime() + JUMUAH_HOLD_MS);
    }
  }

  AFTER_PRAYER_WINDOWS.set(feed, windows);
  return windows;
}

function afterPrayerAzkarActive(feed: MasjidDisplayFeedV1, now: Date): boolean {
  const nowMs = now.getTime();
  return afterPrayerWindows(feed).some(({ startMs, endMs }) => nowMs >= startMs && nowMs < endMs);
}

function azkarCategory(now: Date, timezone: string): DisplayAzkarCategory {
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
  if (hour >= 15 && hour < 22) return "Evening";
  if (hour >= 22 || hour < 4) return "Sleep";
  return "Morning";
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
  const category = azkarCategory(now, feed.timezone);
  // Context-specific Azkar must never leak into unrelated periods through a
  // broad fallback. Friday Dhikr remains preferred throughout Friday except
  // for the short post-congregational window.
  const preferences: DisplayAzkarCategory[] = [
    ...(afterPrayerAzkarActive(feed, now) ? ["After Prayer" as const] : []),
    ...(isFridayIso(currentDate) ? ["Friday" as const] : []),
    category,
  ];
  const preferredAzkar = preferences
    .map((preferred) => selectedAzkar.filter((item) => item.category === preferred))
    .find((items) => items.length > 0);
  const eligibleAzkar =
    preferredAzkar ?? selectedAzkar.filter((item) => AMBIENT_CATEGORIES.has(item.category));

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
