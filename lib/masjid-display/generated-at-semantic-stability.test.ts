import { describe, expect, it, vi } from "vitest";
import { addDaysIso } from "@/lib/date-utils";
import type { PrayerTime } from "@/lib/types";
import { buildMasjidDisplayFeed } from "./build-feed";

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
    getJumuahTimesForDisplayWindow: vi.fn(async () => []),
    getAnnouncementsForDisplayWindow: vi.fn(async () => []),
    getEventsForDisplayWindow: vi.fn(async () => []),
    getDonationCampaignsForDisplayWindow: vi.fn(async () => []),
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
      azkarPlaylistIds: [],
    })),
    getAzkarItems: vi.fn(async () => []),
    // Legacy source-wide clock. Plan 3 must not let this mutate an otherwise
    // identical semantic representation.
    getMasjidDisplayFeedRevision: vi.fn(async () => "2026-09-12T10:00:00.000Z"),
    // Desired relevant-window timestamp authority.
    getMasjidDisplayGeneratedAt: vi.fn(async () => "2026-09-10T10:00:00.000Z"),
  };
}

describe("Plan 3 generatedAt semantic stability", () => {
  it("ignores unrelated source-wide revision churn when represented feed data is unchanged", async () => {
    const source = deps();
    source.getMasjidDisplayFeedRevision
      .mockResolvedValueOnce("2026-09-12T10:00:00.000Z")
      .mockResolvedValueOnce("2026-09-12T10:01:00.000Z");

    const now = new Date("2026-09-15T10:00:00.000Z");
    const first = await buildMasjidDisplayFeed(now, source as never);
    const second = await buildMasjidDisplayFeed(now, source as never);

    expect(second).toEqual(first);
    expect(first.generatedAt).toBe("2026-09-10T10:00:00.000Z");
  });

  it("uses the relevant-window generation timestamp when that represented authority changes", async () => {
    const source = deps();
    source.getMasjidDisplayGeneratedAt
      .mockResolvedValueOnce("2026-09-10T10:00:00.000Z")
      .mockResolvedValueOnce("2026-09-13T09:30:00.000Z");

    const now = new Date("2026-09-15T10:00:00.000Z");
    const first = await buildMasjidDisplayFeed(now, source as never);
    const second = await buildMasjidDisplayFeed(now, source as never);

    expect(first.generatedAt).toBe("2026-09-10T10:00:00.000Z");
    expect(second.generatedAt).toBe("2026-09-13T09:30:00.000Z");
  });
});
