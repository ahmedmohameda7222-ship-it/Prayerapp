import { addDaysIso, todayIso, zonedDateTime } from "@/lib/date-utils";
import type { Announcement, DonationCampaign, Event } from "@/lib/types";

function timestamp(value?: string) {
  if (!value) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function isAnnouncementActive(item: Announcement, now: Date): boolean {
  if (!item.published) return false;
  const current = now.getTime();
  const from = timestamp(item.displayFrom);
  const until = timestamp(item.displayUntil);
  if (item.displayFrom && from === null) return false;
  if (item.displayUntil && until === null) return false;
  return (from === null || current >= from) && (until === null || current <= until);
}

export function includeAnnouncementInFeed(item: Announcement, now: Date, horizonEnd: Date): boolean {
  if (!item.published) return false;
  const current = now.getTime();
  const horizon = horizonEnd.getTime();
  const from = timestamp(item.displayFrom);
  const until = timestamp(item.displayUntil);
  if (item.displayFrom && from === null) return false;
  if (item.displayUntil && until === null) return false;
  if (until !== null && until < current) return false;
  if (from !== null && from > horizon) return false;
  return true;
}

function eventStart(item: Event): Date {
  return zonedDateTime(item.date, item.startTime);
}

function eventEnd(item: Event): Date {
  if (item.endTime) return zonedDateTime(item.date, item.endTime);
  const nextDay = addDaysIso(item.date, 1);
  return new Date(zonedDateTime(nextDay, "00:00").getTime() - 1);
}

export function isEventActive(item: Event, now: Date): boolean {
  if (item.published !== true) return false;
  const current = now.getTime();
  return current >= eventStart(item).getTime() && current <= eventEnd(item).getTime();
}

export function includeEventInFeed(item: Event, now: Date, horizonEnd: Date): boolean {
  if (item.published !== true) return false;
  return eventEnd(item).getTime() >= now.getTime() && eventStart(item).getTime() <= horizonEnd.getTime();
}

export function isCampaignActive(item: DonationCampaign, now: Date): boolean {
  if (!item.isActive) return false;
  const currentDate = todayIso(now);
  if (item.startDate && currentDate < item.startDate) return false;
  if (item.endDate && currentDate > item.endDate) return false;
  return true;
}

export function includeCampaignInFeed(item: DonationCampaign, now: Date, horizonEnd: Date): boolean {
  if (!item.isActive) return false;
  const currentDate = todayIso(now);
  const horizonDate = todayIso(horizonEnd);
  if (item.endDate && item.endDate < currentDate) return false;
  if (item.startDate && item.startDate > horizonDate) return false;
  return true;
}
