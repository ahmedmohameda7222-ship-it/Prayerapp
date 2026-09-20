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
    getJumuahTimesForDisplayWindow: vi.fn(async () => [
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
    getAnnouncementsForDisplayWindow: vi.fn(async () => [
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
    getEventsForDisplayWindow: vi.fn(async () => [
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
    getDonationCampaignsForDisplayWindow: vi.fn(async () => [
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
    getMasjidDisplayGeneratedAt: vi.fn(async () => "2026-09-12T10:00:00.000Z"),
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

  it("uses fresh database-bounded readers for feed source reads", async () => {
    const source = deps();
    await buildMasjidDisplayFeed(new Date("2026-09-15T10:00:00.000Z"), source as never);

    expect(source.getPrayerTimes).toHaveBeenCalledWith(true, "2026-09-14", "2026-10-20");
    expect(source.getJumuahTimesForDisplayWindow).toHaveBeenCalledWith("2026-09-14", "2026-10-20");
    expect(source.getAnnouncementsForDisplayWindow).toHaveBeenCalledWith(
      "2026-09-15T10:00:00.000Z",
      expect.any(String),
    );
    expect(source.getEventsForDisplayWindow).toHaveBeenCalledWith("2026-09-15", "2026-10-20");
    expect(source.getDonationCampaignsForDisplayWindow).toHaveBeenCalledWith("2026-09-15", "2026-10-20");
    expect(source.getMosqueSettings).toHaveBeenCalledWith(true);
    expect(source.getMasjidDisplayGeneratedAt).toHaveBeenCalledWith(
      expect.objectContaining({
        prayerIds: expect.arrayContaining(["prayer-2026-09-14", "prayer-2026-10-20"]),
        jumuahIds: ["jumuah-second"],
        announcementIds: ["future-special"],
        eventIds: ["event-1"],
        campaignIds: ["campaign-1"],
        azkar: [
          expect.objectContaining({ id: "morning-1", arabicText: "سبحان الله" }),
          expect.objectContaining({ id: "evening-1", arabicText: "الحمد لله" }),
        ],
      }),
      expect.any(String),
    );
  });

  it("keeps Friday Dhuhr as the primary service and exports only later additional services", async () => {
    const feed = await buildMasjidDisplayFeed(new Date("2026-09-15T10:00:00.000Z"), deps() as never);
    const friday = feed.prayers.schedule.find((day) => day.date === "2026-09-18");
    expect(friday?.dhuhr).toBe("13:10");
    expect(feed.prayers.additionalJumuah.map((item) => item.prayerTime)).toEqual(["15:00"]);
  });

  it("uses represented source timestamps rather than request time for generatedAt", async () => {
    const source = deps();
    const first = await buildMasjidDisplayFeed(new Date("2026-09-15T10:00:00.000Z"), source as never);
    const second = await buildMasjidDisplayFeed(new Date("2026-09-15T10:00:01.000Z"), source as never);
    expect(first.generatedAt).toBe("2026-09-12T10:00:00.000Z");
    expect(second.generatedAt).toBe(first.generatedAt);
  });

  it("changes generatedAt when the represented source timestamp changes", async () => {
    const source = deps();
    source.getMasjidDisplayGeneratedAt
      .mockResolvedValueOnce("2026-09-12T10:00:00.000Z")
      .mockResolvedValueOnce("2026-09-12T10:01:00.000Z");

    const first = await buildMasjidDisplayFeed(new Date("2026-09-15T10:00:00.000Z"), source as never);
    const second = await buildMasjidDisplayFeed(new Date("2026-09-15T10:00:00.000Z"), source as never);

    expect(first.generatedAt).toBe("2026-09-12T10:00:00.000Z");
    expect(second.generatedAt).toBe("2026-09-12T10:01:00.000Z");
  });

  it("does not let omitted invalid legacy content change the supplied represented-source timestamp", async () => {
    const source = deps();
    source.getAnnouncementsForDisplayWindow.mockResolvedValue([
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
    expect(source.getMasjidDisplayGeneratedAt).toHaveBeenCalledWith(
      expect.objectContaining({ announcementIds: ["future-special"] }),
      expect.any(String),
    );
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
    source.getEventsForDisplayWindow.mockResolvedValue([
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
    source.getDonationCampaignsForDisplayWindow.mockResolvedValue([
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

  it("rejects an oversized generated public Feed instead of emitting an unbounded payload", async () => {
    const source = deps();
    const huge = "x".repeat(80 * 1024);
    source.getAnnouncementsForDisplayWindow.mockResolvedValue([
      {
        id: "oversized-announcement",
        title: "Oversized",
        message: "Oversized",
        type: "General",
        titleAr: "إعلان",
        titleDe: "Ankündigung",
        messageAr: huge,
        messageDe: huge,
        isUrgent: false,
        displayStyle: "normal",
        displayFrom: undefined,
        displayUntil: undefined,
        published: true,
        createdAt: "2026-09-12T10:00:00.000Z",
      },
    ] as never);

    await expect(
      buildMasjidDisplayFeed(new Date("2026-09-15T10:00:00.000Z"), source as never),
    ).rejects.toThrow(/maximum size|too large|payload/i);
  });

  it("fails closed when a dynamic source window contains more rows than the certified maximum", async () => {
    const source = deps();
    const announcements = Array.from({ length: 65 }, (_, index) => ({
      id: `announcement-${index}`,
      title: "Announcement",
      message: "Message",
      type: "General" as const,
      titleAr: "إعلان",
      titleDe: "Ankündigung",
      messageAr: "رسالة",
      messageDe: "Nachricht",
      isUrgent: index === 64,
      displayStyle: "normal" as const,
      displayFrom: undefined,
      displayUntil: undefined,
      published: true,
      createdAt: new Date(Date.UTC(2026, 8, 15, 12, 0, index)).toISOString(),
    }));
    source.getAnnouncementsForDisplayWindow.mockResolvedValue(announcements as never);

    await expect(
      buildMasjidDisplayFeed(new Date("2026-09-15T10:00:00.000Z"), source as never),
    ).rejects.toThrow(/maximum row count|too many|source/i);
  });

  it("fails closed when one dynamic source row exceeds the certified per-row size", async () => {
    const source = deps();
    const large = "x".repeat(9 * 1024);
    source.getAnnouncementsForDisplayWindow.mockResolvedValue([
      {
        id: "large-announcement",
        title: "Large",
        message: "Large",
        type: "General",
        titleAr: "إعلان",
        titleDe: "Ankündigung",
        messageAr: large,
        messageDe: large,
        isUrgent: true,
        displayStyle: "normal",
        displayFrom: undefined,
        displayUntil: undefined,
        published: true,
        createdAt: "2026-09-15T09:00:00.000Z",
      },
    ] as never);

    await expect(
      buildMasjidDisplayFeed(new Date("2026-09-15T10:00:00.000Z"), source as never),
    ).rejects.toThrow(/(?:source|public) row.*maximum size|maximum (?:source|public) row size/i);
  });

  it("accepts a bounded public campaign projection even when non-displayed legacy/locales make the raw source row large", async () => {
    const source = deps();
    const nonDisplayed = "x".repeat(5_000);
    source.getDonationCampaignsForDisplayWindow.mockResolvedValue([
      {
        id: "projection-sized-campaign",
        title: nonDisplayed,
        description: nonDisplayed,
        titleAr: "تبرع",
        titleEn: nonDisplayed,
        titleDe: "Spende",
        titleTr: nonDisplayed,
        descriptionAr: "وصف قصير",
        descriptionEn: nonDisplayed,
        descriptionDe: "Kurze Beschreibung",
        descriptionTr: nonDisplayed,
        targetAmount: 10_000,
        collectedAmount: 1_000,
        startDate: "2026-09-01",
        endDate: undefined,
        donationUrl: "https://donate.example.test",
        isActive: true,
        isFeatured: true,
        sourceUpdatedAt: "2026-09-12T10:00:00.000Z",
      },
    ] as never);

    const feed = await buildMasjidDisplayFeed(
      new Date("2026-09-15T10:00:00.000Z"),
      source as never,
    );

    expect(feed.campaigns).toEqual([
      expect.objectContaining({
        id: "projection-sized-campaign",
        titleAr: "تبرع",
        titleDe: "Spende",
        descriptionAr: "وصف قصير",
        descriptionDe: "Kurze Beschreibung",
      }),
    ]);
  });

  it("reserves static/Azkar capacity by rejecting dynamic content above 32 KiB", async () => {
    const source = deps();
    source.getAnnouncementsForDisplayWindow.mockResolvedValue(
      Array.from({ length: 5 }, (_, index) => ({
        id: `reserved-budget-${index}`,
        title: "Announcement",
        message: "Message",
        type: "General" as const,
        titleAr: "إعلان",
        titleDe: "Ankündigung",
        messageAr: "a".repeat(3_600),
        messageDe: "b".repeat(3_600),
        isUrgent: false,
        displayStyle: "normal" as const,
        displayFrom: undefined,
        displayUntil: undefined,
        published: true,
        createdAt: new Date(Date.UTC(2026, 8, 15, 12, 0, index)).toISOString(),
      })) as never,
    );

    await expect(
      buildMasjidDisplayFeed(new Date("2026-09-15T10:00:00.000Z"), source as never),
    ).rejects.toThrow(/dynamic content exceeds aggregate budget/i);
  });

  it("rejects a selected Azkar projection above the reserved 64 KiB envelope", async () => {
    const source = deps();
    source.getMasjidDisplaySettings.mockResolvedValue({
      fajrPrayerDurationMinutes: 10,
      dhuhrPrayerDurationMinutes: 10,
      asrPrayerDurationMinutes: 10,
      maghribPrayerDurationMinutes: 10,
      ishaPrayerDurationMinutes: 10,
      azkarPlaylistIds: ["huge-azkar"],
    });
    source.getAzkarItems.mockResolvedValue([
      {
        id: "huge-azkar",
        category: "Morning",
        arabicText: "ا".repeat(20_000),
        transliteration: "",
        translationEn: "",
        translationDe: "x".repeat(30_000),
        source: "Synthetic",
        repeatCount: 1,
        sortOrder: 1,
        isPublished: true,
      },
    ]);

    await expect(
      buildMasjidDisplayFeed(new Date("2026-09-15T10:00:00.000Z"), source as never),
    ).rejects.toThrow(/Azkar.*aggregate budget/i);
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
