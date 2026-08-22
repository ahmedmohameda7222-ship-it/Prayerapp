import { addDaysIso } from "@/lib/date-utils";

export const MINIMUM_FUTURE_PRAYER_DAYS = 31;
export const CANONICAL_PRAYER_CRON_ENDPOINT =
  "https://donaumoschee.vercel.app/api/cron/prayer-reminders";

const exactQaMarkers = new Set(["SUPABASE_QA_MOCK", "HOME_UI_V2_PREVIEW"]);
const placeholderPattern = /(^|[^a-z0-9])(mock|test|testing|placeholder|preview|sandbox|dummy|example)([^a-z0-9]|$)/iu;

type PrayerScheduleReadinessRow = {
  date: string;
  published?: boolean | null;
  note?: string | null;
  note_ar?: string | null;
  note_en?: string | null;
  note_de?: string | null;
  note_tr?: string | null;
};

type PublishedContentRow = Record<string, string | boolean | number | null | undefined> & {
  published?: boolean | null;
};

type MosqueSettingsReadinessRow = {
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  google_maps_link?: string | null;
  whatsapp_link?: string | null;
  telegram_link?: string | null;
};

type DonationSettingsReadinessRow = {
  account_holder?: string | null;
  iban?: string | null;
  bic?: string | null;
  paypal_link?: string | null;
};

export type LaunchDataReadinessIssue = {
  code: string;
  count?: number;
  fields?: string[];
};

export type LaunchDataReadinessInput = {
  today: string;
  prayerTimes: PrayerScheduleReadinessRow[];
  jumuahTimes: PublishedContentRow[];
  ramadanDays: PublishedContentRow[];
  mosqueSettings: MosqueSettingsReadinessRow | null;
  donationSettings: DonationSettingsReadinessRow | null;
};

function isPlaceholder(value: string | null | undefined) {
  const normalized = value?.trim() || "";
  return !normalized || exactQaMarkers.has(normalized) || placeholderPattern.test(normalized);
}

function rowHasPlaceholder(row: PublishedContentRow) {
  return Object.entries(row).some(([key, value]) =>
    key !== "published" && key !== "id" && key !== "date" && typeof value === "string" && isPlaceholder(value),
  );
}

export function isPrayerScheduleQaRow(row: PrayerScheduleReadinessRow) {
  return [row.note, row.note_ar, row.note_en, row.note_de, row.note_tr]
    .some((value) => typeof value === "string" && isPlaceholder(value));
}

function placeholderFields<T extends object>(row: T | null, fields: (keyof T)[]) {
  if (!row) return fields.map(String).sort();
  return fields
    .filter((field) => isPlaceholder(row[field] as string | null | undefined))
    .map(String)
    .sort();
}

export function assessLaunchDataReadiness(input: LaunchDataReadinessInput) {
  const issues: LaunchDataReadinessIssue[] = [];
  const publishedPrayerRows = input.prayerTimes.filter((row) => row.published !== false);
  const qaPrayerRows = publishedPrayerRows.filter(isPrayerScheduleQaRow);
  const usableDates = new Set(
    publishedPrayerRows
      .filter((row) => !isPrayerScheduleQaRow(row))
      .map((row) => row.date),
  );
  const missingPrayerDates = Array.from({ length: MINIMUM_FUTURE_PRAYER_DAYS }, (_, index) =>
    addDaysIso(input.today, index),
  ).filter((date) => !usableDates.has(date));

  if (missingPrayerDates.length > 0) {
    issues.push({ code: "prayer.future_coverage_missing", count: missingPrayerDates.length });
  }
  if (qaPrayerRows.length > 0) {
    issues.push({ code: "prayer.published_qa_rows", count: qaPrayerRows.length });
  }

  const testJumuahRows = input.jumuahTimes.filter((row) => row.published !== false && rowHasPlaceholder(row));
  if (testJumuahRows.length > 0) {
    issues.push({ code: "jumuah.published_test_rows", count: testJumuahRows.length });
  }

  const testRamadanRows = input.ramadanDays.filter((row) => row.published !== false && rowHasPlaceholder(row));
  if (testRamadanRows.length > 0) {
    issues.push({ code: "ramadan.published_test_rows", count: testRamadanRows.length });
  }

  const mosqueFields = placeholderFields(input.mosqueSettings, [
    "address",
    "phone",
    "email",
    "google_maps_link",
    "whatsapp_link",
    "telegram_link",
  ]);
  if (mosqueFields.length > 0) {
    issues.push({ code: "mosque.placeholder_contact_fields", fields: mosqueFields });
  }

  const donationFields = placeholderFields(input.donationSettings, [
    "account_holder",
    "iban",
    "bic",
    "paypal_link",
  ]);
  if (donationFields.length > 0) {
    issues.push({ code: "donation.placeholder_payment_fields", fields: donationFields });
  }

  return {
    automatedReady: issues.length === 0,
    policy: { minimumFuturePrayerDays: MINIMUM_FUTURE_PRAYER_DAYS },
    prayerCoverage: {
      requiredDays: MINIMUM_FUTURE_PRAYER_DAYS,
      availableDays: MINIMUM_FUTURE_PRAYER_DAYS - missingPrayerDates.length,
      missingDates: missingPrayerDates,
    },
    issues,
    manualChecks: [
      { code: "mosque.contact_values_verified", required: true },
      { code: "donation.payment_values_verified", required: true },
      { code: "prayer.schedule_source_verified", required: true },
      { code: "public.content_reviewed", required: true },
    ],
  };
}
