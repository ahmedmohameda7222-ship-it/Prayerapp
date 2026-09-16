import { describe, expect, it } from "vitest";
import type { MasjidDisplayFeedV1 } from "./feed-contract";
import { validateMasjidDisplayFeed } from "./validate-feed";

function validFeed(): MasjidDisplayFeedV1 {
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
      schedule: [{
        date: "2026-09-15",
        fajr: "05:00",
        sunrise: "06:30",
        dhuhr: "13:10",
        asr: "16:45",
        maghrib: "19:20",
        isha: "20:45",
        maghribProgram: {
          enabled: true,
          lessonTitle: "درس المغرب",
          lessonDurationMinutes: 10,
          combinedIshaTime: "20:15",
        },
      }],
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
      displayFrom: null,
      displayUntil: null,
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
      endTime: null,
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
      endDate: null,
      donationUrl: "https://donate.example.test",
      isFeatured: true,
    }],
  };
}

describe("Masjid Display Feed v1 contract", () => {
  it("accepts only the approved public Feed v1 boundary", () => {
    const feed = validFeed();
    expect(validateMasjidDisplayFeed(feed).schemaVersion).toBe(1);

    const json = JSON.stringify(feed);
    for (const forbidden of [
      "service_role",
      "admin_users",
      "audit_logs",
      "latitude",
      "longitude",
      "fajrAngle",
      "ishaAngle",
      "fajrIqama",
      "fajr_iqama",
      "calculationMethod",
    ]) {
      expect(json).not.toContain(forbidden);
    }
  });
});
