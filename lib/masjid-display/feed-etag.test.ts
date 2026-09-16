import { describe, expect, it } from "vitest";
import { canonicalJson, etagForFeed, finalizeFeed } from "./feed-etag";

function body(overrides: Record<string, unknown> = {}) {
  return {
    schemaVersion: 1 as const,
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
        maghribProgram: null,
      }],
      iqamaDelays: { fajr: 20, dhuhr: 15, asr: 15, maghrib: 10, isha: 15 },
      additionalJumuah: [],
    },
    displaySettings: {
      prayerDurations: { fajr: 10, dhuhr: 10, asr: 10, maghrib: 10, isha: 10 },
      azkarPlaylistIds: [],
    },
    azkar: [],
    announcements: [],
    events: [],
    campaigns: [],
    ...overrides,
  };
}

describe("display feed canonical representation", () => {
  it("canonicalizes object key order while preserving array order", () => {
    expect(canonicalJson({ b: 2, a: 1, list: [{ z: 2, y: 1 }, "x"] })).toBe('{"a":1,"b":2,"list":[{"y":1,"z":2},"x"]}');
    expect(canonicalJson({ list: [2, 1] })).not.toBe(canonicalJson({ list: [1, 2] }));
  });

  it("gives the same revision and ETag for the same semantic representation", () => {
    const first = body();
    const second = body({
      mosque: {
        publicAppUrl: "https://example.test",
        address: "Teststraße 1, 94469 Deggendorf",
        nameDe: "Donau Moschee",
        nameAr: "مسجد الدانوب",
      },
    });
    const a = finalizeFeed(first as any);
    const b = finalizeFeed(second as any);
    expect(a.snapshotRevision).toBe(b.snapshotRevision);
    expect(etagForFeed(a)).toBe(etagForFeed(b));
    expect(a.snapshotRevision).toMatch(/^[a-f0-9]{64}$/);
    expect(etagForFeed(a)).toMatch(/^"[a-f0-9]{64}"$/);
  });

  it("changes revision and ETag when content changes", () => {
    const a = finalizeFeed(body() as any);
    const b = finalizeFeed(body({ mosque: { ...body().mosque, nameDe: "Andere Moschee" } }) as any);
    expect(a.snapshotRevision).not.toBe(b.snapshotRevision);
    expect(etagForFeed(a)).not.toBe(etagForFeed(b));
  });
});
