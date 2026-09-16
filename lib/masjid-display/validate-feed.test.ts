import { describe, expect, it } from "vitest";
import { DisplayFeedValidationError, validateMasjidDisplayFeed } from "./validate-feed";

function validFeed() {
  return {
    schemaVersion: 1,
    snapshotRevision: "a".repeat(64),
    generatedAt: "2026-09-15T08:00:00.000Z",
    timezone: "Europe/Berlin",
    mosque: {
      nameAr: "مسجد الدانوب",
      nameDe: "Donau Moschee",
      address: "Teststraße 1, 94469 Deggendorf",
      publicAppUrl: "https://example.test",
    },
    prayers: {
      schedule: [
        {
          date: "2026-09-15",
          fajr: "05:00",
          sunrise: "06:30",
          dhuhr: "13:10",
          asr: "16:45",
          maghrib: "19:20",
          isha: "20:45",
          maghribProgram: null as null | {
            enabled: boolean;
            lessonTitle: string;
            lessonDurationMinutes: number;
            combinedIshaTime: string;
          },
        },
        {
          date: "2026-09-16",
          fajr: "05:02",
          sunrise: "06:32",
          dhuhr: "13:10",
          asr: "16:43",
          maghrib: "19:18",
          isha: "20:43",
          maghribProgram: {
            enabled: true,
            lessonTitle: "درس المغرب",
            lessonDurationMinutes: 10,
            combinedIshaTime: "20:10",
          },
        },
      ],
      iqamaDelays: { fajr: 20, dhuhr: 15, asr: 15, maghrib: 10, isha: 15 },
      additionalJumuah: [{ id: "jumuah-2", date: "2026-09-18", prayerTime: "15:00" }],
    },
    displaySettings: {
      prayerDurations: { fajr: 10, dhuhr: 10, asr: 10, maghrib: 10, isha: 10 },
      azkarPlaylistIds: ["morning-1"],
    },
    azkar: [{
      id: "morning-1",
      category: "Morning",
      arabicText: "سبحان الله",
      translationDe: "Gepriesen sei Allah",
      source: "Synthetic",
      repeatCount: 3,
      sortOrder: 1,
    }],
    announcements: [{
      id: "announcement-1",
      titleAr: "إعلان",
      titleDe: "Ankündigung",
      messageAr: "رسالة",
      messageDe: "Nachricht",
      isUrgent: false,
      displayStyle: "normal",
      displayFrom: null as string | null,
      displayUntil: null as string | null,
    }],
    events: [{
      id: "event-1",
      titleAr: "فعالية",
      titleDe: "Veranstaltung",
      descriptionAr: "وصف",
      descriptionDe: "Beschreibung",
      locationAr: "المسجد",
      locationDe: "Moschee",
      date: "2026-09-16",
      startTime: "18:00",
      endTime: null as string | null,
      type: "Community",
    }],
    campaigns: [{
      id: "campaign-1",
      titleAr: "تبرع",
      titleDe: "Spende",
      descriptionAr: "الوصف",
      descriptionDe: "Beschreibung",
      targetAmount: 1000,
      collectedAmount: 100,
      startDate: "2026-09-01",
      endDate: null as string | null,
      donationUrl: "https://donate.example.test" as string | null,
      isFeatured: true,
    }],
  };
}

type MutableFeed = ReturnType<typeof validFeed>;

function expectInvalid(mutator: (feed: MutableFeed) => void, expectedPath: string) {
  const feed = validFeed();
  mutator(feed);
  try {
    validateMasjidDisplayFeed(feed);
    throw new Error("expected validation to fail");
  } catch (error) {
    expect(error).toBeInstanceOf(DisplayFeedValidationError);
    const validationError = error as DisplayFeedValidationError;
    expect(validationError.issues.some((issue) => issue.path === expectedPath)).toBe(true);
  }
}

describe("validateMasjidDisplayFeed", () => {
  it("rejects unsupported schema versions", () => {
    expectInvalid((feed) => { feed.schemaVersion = 2; }, "schemaVersion");
  });

  it("rejects duplicate or out-of-order prayer dates", () => {
    expectInvalid((feed) => { feed.prayers.schedule[1].date = "2026-09-15"; }, "prayers.schedule[1].date");
    expectInvalid((feed) => { feed.prayers.schedule[1].date = "2026-09-14"; }, "prayers.schedule[1].date");
  });

  it("rejects malformed HH:MM values", () => {
    expectInvalid((feed) => { feed.prayers.schedule[0].fajr = "25:61"; }, "prayers.schedule[0].fajr");
  });

  it("rejects missing or negative Iqama delays", () => {
    expectInvalid((feed) => { delete (feed.prayers.iqamaDelays as Partial<typeof feed.prayers.iqamaDelays>).fajr; }, "prayers.iqamaDelays.fajr");
    expectInvalid((feed) => { feed.prayers.iqamaDelays.isha = -1; }, "prayers.iqamaDelays.isha");
  });

  it("rejects display durations outside 2..120 minutes", () => {
    expectInvalid((feed) => { feed.displaySettings.prayerDurations.asr = 1; }, "displaySettings.prayerDurations.asr");
    expectInvalid((feed) => { feed.displaySettings.prayerDurations.isha = 121; }, "displaySettings.prayerDurations.isha");
  });

  it("rejects duplicate public content IDs", () => {
    expectInvalid((feed) => { feed.announcements.push({ ...feed.announcements[0] }); }, "announcements[1].id");
  });

  it("rejects invalid public and donation URLs", () => {
    expectInvalid((feed) => { feed.mosque.publicAppUrl = "http://example.test"; }, "mosque.publicAppUrl");
    expectInvalid((feed) => { feed.campaigns[0].donationUrl = "javascript:alert(1)"; }, "campaigns[0].donationUrl");
  });

  it("rejects incomplete Arabic/German dynamic content", () => {
    expectInvalid((feed) => { feed.announcements[0].messageDe = ""; }, "announcements[0].messageDe");
    expectInvalid((feed) => { feed.events[0].locationAr = ""; }, "events[0].locationAr");
    expectInvalid((feed) => { feed.campaigns[0].titleDe = ""; }, "campaigns[0].titleDe");
  });

  it("rejects event end times earlier than their start time", () => {
    expectInvalid((feed) => {
      feed.events[0].startTime = "18:00";
      feed.events[0].endTime = "17:59";
    }, "events[0].endTime");
  });

  it("rejects invalid additional Jumuah data", () => {
    expectInvalid((feed) => { feed.prayers.additionalJumuah[0].prayerTime = "99:00"; }, "prayers.additionalJumuah[0].prayerTime");
  });

  it("rejects unknown fields at the public boundary", () => {
    expectInvalid((feed) => { (feed as MutableFeed & { admin_users?: unknown[] }).admin_users = []; }, "admin_users");
    expectInvalid((feed) => { (feed.mosque as typeof feed.mosque & { latitude?: number }).latitude = 48.8; }, "mosque.latitude");
  });
});
