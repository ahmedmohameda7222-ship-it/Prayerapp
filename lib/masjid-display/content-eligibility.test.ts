import { describe, expect, it } from "vitest";
import {
  includeAnnouncementInFeed,
  includeCampaignInFeed,
  includeEventInFeed,
  isAnnouncementActive,
  isCampaignActive,
  isEventActive,
} from "./content-eligibility";
import type { Announcement, DonationCampaign, Event } from "@/lib/types";

const announcement = (overrides: Partial<Announcement> = {}): Announcement => ({
  id: "announcement-1",
  title: "Announcement",
  message: "Message",
  titleAr: "إعلان",
  titleDe: "Ankündigung",
  messageAr: "رسالة",
  messageDe: "Nachricht",
  isUrgent: false,
  displayStyle: "normal",
  displayFrom: undefined,
  displayUntil: undefined,
  published: true,
  createdAt: "2026-09-10T08:00:00.000Z",
  ...overrides,
});

const event = (overrides: Partial<Event> = {}): Event => ({
  id: "event-1",
  title: "Event",
  description: "Description",
  location: "Mosque",
  titleAr: "فعالية",
  titleDe: "Veranstaltung",
  descriptionAr: "وصف",
  descriptionDe: "Beschreibung",
  locationAr: "المسجد",
  locationDe: "Moschee",
  date: "2026-09-15",
  startTime: "18:00",
  endTime: "20:00",
  type: "Community",
  published: true,
  ...overrides,
});

const campaign = (overrides: Partial<DonationCampaign> = {}): DonationCampaign => ({
  id: "campaign-1",
  title: "Campaign",
  description: "Description",
  titleAr: "تبرع",
  titleDe: "Spende",
  descriptionAr: "وصف",
  descriptionDe: "Beschreibung",
  targetAmount: 1000,
  collectedAmount: 100,
  startDate: "2026-09-01",
  endDate: undefined,
  donationUrl: undefined,
  isActive: true,
  isFeatured: false,
  ...overrides,
});

const now = new Date("2026-09-15T08:00:00.000Z");
const horizon = new Date("2026-10-20T21:59:59.999Z");

describe("display content eligibility", () => {
  it("includes a future announcement that activates inside the offline horizon", () => {
    const item = announcement({ displayFrom: "2026-09-20T08:00:00.000Z", displayUntil: "2026-09-21T08:00:00.000Z" });
    expect(isAnnouncementActive(item, now)).toBe(false);
    expect(includeAnnouncementInFeed(item, now, horizon)).toBe(true);
  });

  it("drops irreversibly expired or too-far-future announcements", () => {
    expect(includeAnnouncementInFeed(announcement({ displayUntil: "2026-09-14T08:00:00.000Z" }), now, horizon)).toBe(false);
    expect(includeAnnouncementInFeed(announcement({ displayFrom: "2026-10-21T08:00:00.000Z" }), now, horizon)).toBe(false);
  });

  it("uses event endTime and end-of-local-date expiry", () => {
    const active = event({ date: "2026-09-15", startTime: "09:00", endTime: "12:00" });
    expect(isEventActive(active, new Date("2026-09-15T08:30:00.000Z"))).toBe(true);
    expect(isEventActive(active, new Date("2026-09-15T10:30:00.000Z"))).toBe(false);

    const allDayTail = event({ date: "2026-09-15", startTime: "18:00", endTime: undefined });
    expect(includeEventInFeed(allDayTail, new Date("2026-09-15T21:30:00.000Z"), horizon)).toBe(true);
    expect(includeEventInFeed(allDayTail, new Date("2026-09-15T22:30:00.000Z"), horizon)).toBe(false);
  });

  it("includes current/upcoming events only through the horizon", () => {
    expect(includeEventInFeed(event({ date: "2026-10-20", startTime: "20:00", endTime: "21:00" }), now, horizon)).toBe(true);
    expect(includeEventInFeed(event({ date: "2026-10-21", startTime: "08:00", endTime: "09:00" }), now, horizon)).toBe(false);
  });

  it("uses campaign active/start/optional-end semantics", () => {
    expect(isCampaignActive(campaign(), now)).toBe(true);
    expect(isCampaignActive(campaign({ startDate: "2026-09-16" }), now)).toBe(false);
    expect(isCampaignActive(campaign({ endDate: "2026-09-14" }), now)).toBe(false);
    expect(isCampaignActive(campaign({ isActive: false }), now)).toBe(false);
    expect(includeCampaignInFeed(campaign({ startDate: "2026-10-20" }), now, horizon)).toBe(true);
    expect(includeCampaignInFeed(campaign({ startDate: "2026-10-21" }), now, horizon)).toBe(false);
    expect(includeCampaignInFeed(campaign({ endDate: undefined }), now, horizon)).toBe(true);
  });
});
