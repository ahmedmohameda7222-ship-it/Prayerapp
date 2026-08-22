import { describe, expect, it } from "vitest";
import { addDaysIso } from "@/lib/date-utils";
import {
  MINIMUM_FUTURE_PRAYER_DAYS,
  assessLaunchDataReadiness,
  isPrayerScheduleQaRow,
} from "@/lib/launch-data-readiness";

const startDate = "2026-08-22";

function prayer(date: string, note: string | null = null) {
  return { date, published: true, note, note_ar: null, note_en: null, note_de: null, note_tr: null };
}

function completePrayerWindow() {
  return Array.from({ length: MINIMUM_FUTURE_PRAYER_DAYS }, (_, index) =>
    prayer(addDaysIso(startDate, index)),
  );
}

const validMosque = {
  address: "Verified address",
  phone: "+49 123 456789",
  email: "office@verified-mosque.de",
  google_maps_link: "https://maps.google.com/?q=verified",
  whatsapp_link: "https://wa.me/49123456789",
  telegram_link: "https://t.me/verifiedmosque",
};

const validDonation = {
  account_holder: "Verified Mosque Association",
  iban: "DE02120300000000202051",
  bic: "BYLADEM1001",
  paypal_link: "https://paypal.me/verifiedmosque",
};

describe("launch data readiness", () => {
  it("requires 31 consecutive future non-QA prayer schedules", () => {
    const report = assessLaunchDataReadiness({
      today: startDate,
      prayerTimes: completePrayerWindow().slice(0, 30),
      jumuahTimes: [],
      ramadanDays: [],
      mosqueSettings: validMosque,
      donationSettings: validDonation,
    });

    expect(MINIMUM_FUTURE_PRAYER_DAYS).toBe(31);
    expect(report.issues).toContainEqual(
      expect.objectContaining({ code: "prayer.future_coverage_missing", count: 1 }),
    );
    expect(report.automatedReady).toBe(false);
  });

  it("does not allow known QA prayer rows to satisfy coverage", () => {
    const rows = completePrayerWindow();
    rows[0] = prayer(startDate, "SUPABASE_QA_MOCK");
    rows[1] = prayer(addDaysIso(startDate, 1), "HOME_UI_V2_PREVIEW");

    const report = assessLaunchDataReadiness({
      today: startDate,
      prayerTimes: rows,
      jumuahTimes: [],
      ramadanDays: [],
      mosqueSettings: validMosque,
      donationSettings: validDonation,
    });

    expect(isPrayerScheduleQaRow(rows[0])).toBe(true);
    expect(report.issues).toContainEqual(
      expect.objectContaining({ code: "prayer.published_qa_rows", count: 2 }),
    );
    expect(report.issues).toContainEqual(
      expect.objectContaining({ code: "prayer.future_coverage_missing", count: 2 }),
    );
  });

  it("reports published Jumuah and Ramadan test content without echoing values", () => {
    const report = assessLaunchDataReadiness({
      today: startDate,
      prayerTimes: completePrayerWindow(),
      jumuahTimes: [{ published: true, notes: "SUPABASE_QA_MOCK", location_name: "Masjid" }],
      ramadanDays: [{ published: true, note: "Ramadan QA preview day" }],
      mosqueSettings: validMosque,
      donationSettings: validDonation,
    });

    expect(report.issues).toContainEqual(
      expect.objectContaining({ code: "jumuah.published_test_rows", count: 1 }),
    );
    expect(report.issues).toContainEqual(
      expect.objectContaining({ code: "ramadan.published_test_rows", count: 1 }),
    );
    expect(JSON.stringify(report)).not.toContain("SUPABASE_QA_MOCK");
  });

  it("identifies placeholder contact/payment fields and keeps human verification separate", () => {
    const report = assessLaunchDataReadiness({
      today: startDate,
      prayerTimes: completePrayerWindow(),
      jumuahTimes: [],
      ramadanDays: [],
      mosqueSettings: { ...validMosque, email: "mosque@example.test", phone: "" },
      donationSettings: { ...validDonation, account_holder: "Test account", paypal_link: "https://sandbox.paypal.com/test" },
    });

    expect(report.issues).toContainEqual(
      expect.objectContaining({
        code: "mosque.placeholder_contact_fields",
        fields: ["email", "phone"],
      }),
    );
    expect(report.issues).toContainEqual(
      expect.objectContaining({
        code: "donation.placeholder_payment_fields",
        fields: ["account_holder", "paypal_link"],
      }),
    );
    expect(report.manualChecks.map((item) => item.code)).toEqual([
      "mosque.contact_values_verified",
      "donation.payment_values_verified",
      "prayer.schedule_source_verified",
      "public.content_reviewed",
    ]);
  });

  it("rejects contact and payment links on unapproved destinations", () => {
    const report = assessLaunchDataReadiness({
      today: startDate,
      prayerTimes: completePrayerWindow(),
      jumuahTimes: [],
      ramadanDays: [],
      mosqueSettings: {
        ...validMosque,
        google_maps_link: "https://attacker.invalid/maps.google.com",
        whatsapp_link: "https://wa.me.attacker.invalid/49123456789",
      },
      donationSettings: {
        ...validDonation,
        paypal_link: "https://paypal.me.attacker.invalid/verifiedmosque",
      },
    });

    expect(report.issues).toContainEqual({
      code: "mosque.invalid_public_links",
      fields: ["google_maps_link", "whatsapp_link"],
    });
    expect(report.issues).toContainEqual({
      code: "donation.invalid_payment_links",
      fields: ["paypal_link"],
    });
  });

  it("passes automated checks only with a complete clean window and non-placeholder fields", () => {
    const report = assessLaunchDataReadiness({
      today: startDate,
      prayerTimes: completePrayerWindow(),
      jumuahTimes: [],
      ramadanDays: [],
      mosqueSettings: validMosque,
      donationSettings: validDonation,
    });

    expect(report.issues).toEqual([]);
    expect(report.automatedReady).toBe(true);
  });
});
