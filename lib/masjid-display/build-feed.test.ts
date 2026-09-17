import { describe, expect, it, vi } from "vitest";
import { addDaysIso } from "@/lib/date-utils";
import { buildMasjidDisplayFeed, DisplayFeedBuildError } from "./build-feed";
import type { PrayerTime } from "@/lib/types";

vi.mock("server-only", () => ({}));

function prayerRows(): PrayerTime[] {
  const rows: PrayerTime[] = [];
  let date = "2026-09-14";
  while (date <= "2026-10-20") {
    rows.push({
      id: `prayer-${date}`,
      date,
      fajr: "05:00",
      sunrise: "06:30",
      dhuhr: "13:10",
      asr: "16:45",
      maghrib: "19:20",
      isha: "20:45",
      maghribProgram: date === "2026-09-15" ? {
        enabled: true,
        lessonTitle: "درس المغرب",
        lessonDurationMinutes: 10,
        combinedIshaTime: "20:15",
      } : undefined,
      published: true,
      updatedAt: "2026-09-10T10:00:00.000Z",
    });
    date = addDaysIso(date, 1);
  }
  return rows;
}

function deps() {
  return {
    getPrayerTimes: vi.fn(async () => prayerRows()),
    getPrayerSettings: vi.fn(async () => ({
      iqamaDelays: { fajr: 20, dhuhr: 15, asr: 15, maghrib: 10, isha: 15 },
    })),
    getJumuahTimes: vi.fn(async () => [
      {
        id: "jumuah-primary",
        date: "2026-09-18",
        khutbahTime: "12:45",
        prayerTime: "13:10",
        language: "Arabic/German",
        notes: "",
        published: true,
      },
      {
        id: "jumuah-second",
        date: "2026-09-18",
        khutbahTime: "14:45",
        prayerTime: "15:00",
        language: "Arabic/German",
        notes: "",
        published: true,
      },
    ]),
    getAnnouncements: vi.fn(async () => [
      {
        id: "future-special",
        title: "Future",
        message: "Future",
        type: "General" as const,
        titleAr: "إعلان مستقبلي",
        titleDe: "Zukünftige Ankündigung",
        messageAr: "رسالة",
        messageDe: "Nachricht",
        isUrgent: false,
        displayStyle: "special" as const,
        displayFrom: "2026-09-20T08:00:00.000Z",
        displayUntil: "2026-09-21T08:00:00.000Z",
        published: true,
        createdAt: "2026-09-12T10:00:00.000Z",
      },
    ]),
    getEvents: vi.fn(async () => [
      {
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
        date: "2026-09-16",
        startTime: "18:00",
        endTime: "19:00",
        type: "Community",
        published: true,
      },
    ]),
    getDonationCampaigns: vi.fn(async () => [
      {
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
        donationUrl: "https://donate.example.test",
        isActive: true,
        isFeatured: true,
      },
    ]),
    getMosqueSettings: vi.fn(async () => ({
      mosqueName: "Donau Mosque",
      mosqueNameAr: "مسجد الدانوب",
      mosqueNameDe: "Donau Moschee",
      address: "Teststraße 1, 94469 Deggendorf",
      phone: "",
      email: "",
      googleMapsLink: "",
      whatsappLink: "",
      telegramLink: "",
      accountHolder: "",
      iban: "",
      bic: "",
      publicAppUrl: "https://example.test",
    })),
    getMasjidDisplaySettings: vi.fn(async () => ({
      fajrPrayerDurationMinutes: 10,
      dhuhrPrayerDurationMinutes: 10,
      asrPrayerDurationMinutes: 10,
      maghribPrayerDurationMinutes: 10,
      ishaPrayerDurationMinutes: 10,
      azkarPlaylistIds: ["morning-1", "evening-1"],
    })),
    getAzkarItems: vi.fn(async () => [
      {
        id: "morning-1",
        category: "Morning" as const,
        arabicText: "سبحان الله",
        transliteration: "Subhan Allah",
        translationEn: "Glory be to Allah",
        translationDe: "Gepriesen sei Allah",
        source: "Synthetic",
        repeatCount: 3,
        sortOrder: 1,
        isPublished: true,
      },
      {
        id: "evening-1",
        category: "Evening" as const,
        arabicText: "الحمد لله",
        transliteration: "Alhamdulillah",
        translationEn: "Praise be to Allah",
        translationDe: "Alles Lob gebührt Allah",
        source: "Synthetic",
        repeatCount: 3,
        sortOrder: 2,
        isPublished: true,
      },
    ]),
  };
}

describe("buildMasjidDisplayFeed", () => {
  it("builds previous-day plus 35-day coverage and preserves future scheduled content", async () => {
    const source = deps();
    const feed = await buildMasjidDisplayFeed(new Date("2026-09-15T10:00:00.000Z"), source as never);

    expect(source.getPrayerTimes).toHaveBeenCalledWith(true, "2026-09-14", "2026-10-20");
    expect(feed.prayers.schedule[0].date).toBe("2026-09-14");
    expect(feed.prayers.schedule.at(-1)?.date).toBe("2026-10-20");
    expect(feed.announcements.some((item) => item.displayFrom === "2026-09-20T08:00:00.000Z")).toBe(true);
    expect(feed.azkar.map((item) => item.id)).toEqual(["morning-1", "evening-1"]);
    expect(JSON.stringify(feed.prayers.schedule)).not.toContain("fajr" + "Iqama");
    expect(JSON.stringify(feed.prayers.schedule)).not.toContain("fajr_" + "iqama");
  });

  it("bypasses process-local public caches for feed source reads", async () => {
    const source = deps();
    await buildMasjidDisplayFeed(new Date("2026-09-15T10:00:00.000Z"), source as never);

    expect(source.getPrayerTimes).toHaveBeenCalledWith(true, "2026-09-14", "2026-10-20");
    expect(source.getJumuahTimes).toHaveBeenCalledWith(true);
    expect(source.getAnnouncements).toHaveBeenCalledWith(true);
    expect(source.getEvents).toHaveBeenCalledWith(true);
    expect(source.getDonationCampaigns).toHaveBeenCalledWith(true);
    expect(source.getMosqueSettings).toHaveBeenCalledWith(true);
  });

  it("keeps Friday Dhuhr as the primary service and exports only later additional services", async () => {
    const feed = await buildMasjidDisplayFeed(new Date("2026-09-15T10:00:00.000Z"), deps() as never);
    const friday = feed.prayers.schedule.find((day) => day.date === "2026-09-18");
    expect(friday?.dhuhr).toBe("13:10");
    expect(feed.prayers.additionalJumuah.map((item) => item.prayerTime)).toEqual(["15:00"]);
  });

  it("uses source timestamps rather than request time for generatedAt", async () => {
    const source = deps();
    const first = await buildMasjidDisplayFeed(new Date("2026-09-15T10:00:00.000Z"), source as never);
    const second = await buildMasjidDisplayFeed(new Date("2026-09-15T10:00:01.000Z"), source as never);
    expect(first.generatedAt).toBe("2026-09-12T10:00:00.000Z");
    expect(second.generatedAt).toBe(first.generatedAt);
  });

  it("does not let omitted invalid legacy content perturb generatedAt", async () => {
    const source = deps();
    source.getAnnouncements.mockResolvedValue([
      {
        id: "future-special",
        title: "Future",
        message: "Future",
        type: "General",
        titleAr: "إعلان مستقبلي",
        titleDe: "Zukünftige Ankündigung",
        messageAr: "رسالة",
        messageDe: "Nachricht",
        isUrgent: false,
        displayStyle: "special",
        displayFrom: "2026-09-20T08:00:00.000Z",
        displayUntil: "2026-09-21T08:00:00.000Z",
        published: true,
        createdAt: "2026-09-12T10:00:00.000Z",
      },
      {
        id: "invalid-newer",
        title: "Invalid",
        message: "Invalid",
        type: "General",
        titleAr: "إعلان",
        titleDe: "Ankündigung",
        messageAr: "رسالة",
        messageDe: "",
        isUrgent: false,
        displayStyle: "normal",
        displayFrom: undefined,
        displayUntil: undefined,
        published: true,
        createdAt: "2026-09-14T10:00:00.000Z",
      },
    ] as never);

    const feed = await buildMasjidDisplayFeed(new Date("2026-09-15T10:00:00.000Z"), source as never);
    expect(feed.announcements.map((item) => item.id)).toEqual(["future-special"]);
    expect(feed.generatedAt).toBe("2026-09-12T10:00:00.000Z");
  });

  it("rejects a religious snapshot with an internal prayer-date gap", async () => {
    const source = deps();
    source.getPrayerTimes.mockResolvedValue(prayerRows().filter((row) => row.date !== "2026-09-25"));

    await expect(
      buildMasjidDisplayFeed(new Date("2026-09-15T10:00:00.000Z"), source as never),
    ).rejects.toBeInstanceOf(DisplayFeedBuildError);
  });

  it("omits malformed legacy events instead of aborting the feed", async () => {
    const source = deps();
    source.getEvents.mockResolvedValue([
      {
        id: "bad-event",
        title: "Bad event",
        description: "Description",
        location: "Mosque",
        titleAr: "فعالية",
        titleDe: "Veranstaltung",
        descriptionAr: "وصف",
        descriptionDe: "Beschreibung",
        locationAr: "المسجد",
        locationDe: "Moschee",
        date: "not-a-date",
        startTime: "18:00",
        endTime: "19:00",
        type: "Community",
        published: true,
      },
    ] as never);

    const feed = await buildMasjidDisplayFeed(new Date("2026-09-15T10:00:00.000Z"), source as never);
    expect(feed.events).toEqual([]);
  });

  it("omits malformed legacy campaigns before final feed validation", async () => {
    const source = deps();
    source.getDonationCampaigns.mockResolvedValue([
      {
        id: "bad-campaign",
        title: "Campaign",
        description: "Description",
        titleAr: "تبرع",
        titleDe: "Spende",
        descriptionAr: "وصف",
        descriptionDe: "Beschreibung",
        targetAmount: -1,
        collectedAmount: 100,
        startDate: "2026-09-01",
        endDate: undefined,
        donationUrl: "https://donate.example.test",
        isActive: true,
        isFeatured: true,
      },
    ] as never);

    const feed = await buildMasjidDisplayFeed(new Date("2026-09-15T10:00:00.000Z"), source as never);
    expect(feed.campaigns).toEqual([]);
  });

  it("filters unknown canonical Azkar playlist IDs defensively", async () => {
    const source = deps();
    source.getMasjidDisplaySettings.mockResolvedValue({
      fajrPrayerDurationMinutes: 10,
      dhuhrPrayerDurationMinutes: 10,
      asrPrayerDurationMinutes: 10,
      maghribPrayerDurationMinutes: 10,
      ishaPrayerDurationMinutes: 10,
      azkarPlaylistIds: ["morning-1", "unknown-azkar"],
    });

    const feed = await buildMasjidDisplayFeed(
      new Date("2026-09-15T10:00:00.000Z"),
      source as never,
    );

    expect(feed.displaySettings.azkarPlaylistIds).toEqual(["morning-1"]);
    expect(feed.azkar.map((item) => item.id)).toEqual(["morning-1"]);
  });

  it("fails atomically when required prayer or display settings are missing", async () => {
    const missingPrayer = deps();
    missingPrayer.getPrayerSettings.mockResolvedValue(null as never);
    await expect(buildMasjidDisplayFeed(new Date("2026-09-15T10:00:00.000Z"), missingPrayer as never)).rejects.toBeInstanceOf(DisplayFeedBuildError);

    const missingDisplay = deps();
    missingDisplay.getMasjidDisplaySettings.mockResolvedValue(null as never);
    await expect(buildMasjidDisplayFeed(new Date("2026-09-15T10:00:00.000Z"), missingDisplay as never)).rejects.toBeInstanceOf(DisplayFeedBuildError);
  });
});