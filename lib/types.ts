export type PrayerName = "fajr" | "sunrise" | "dhuhr" | "asr" | "maghrib" | "isha";
export type ObligatoryPrayerName = Exclude<PrayerName, "sunrise">;
export type PrayerIqamaTimes = Partial<Record<ObligatoryPrayerName, string>>;

export interface MaghribProgram {
  enabled: boolean;
  lessonTitle?: string;
  lessonDurationMinutes?: number;
  combinedIshaTime?: string;
}

export interface LocalizedTitleFields {
  titleAr?: string;
  titleEn?: string;
  titleDe?: string;
  titleTr?: string;
}

export interface LocalizedMessageFields {
  messageAr?: string;
  messageEn?: string;
  messageDe?: string;
  messageTr?: string;
}

export interface LocalizedDescriptionFields {
  descriptionAr?: string;
  descriptionEn?: string;
  descriptionDe?: string;
  descriptionTr?: string;
}

export interface LocalizedLocationFields {
  locationAr?: string;
  locationEn?: string;
  locationDe?: string;
  locationTr?: string;
}

export interface PrayerTime {
  id: string;
  date: string;
  fajr: string;
  sunrise: string;
  dhuhr: string;
  asr: string;
  maghrib: string;
  isha: string;
  maghribProgram?: MaghribProgram;
  note?: string;
  noteAr?: string;
  noteEn?: string;
  noteDe?: string;
  noteTr?: string;
  published: boolean;
  updatedAt: string;
}

export interface JumuahTime {
  id: string;
  date: string;
  khutbahTime: string;
  prayerTime: string;
  locationName?: string;
  locationAddress?: string;
  khateebName?: string;
  language: string;
  languageAr?: string;
  languageEn?: string;
  languageDe?: string;
  languageTr?: string;
  notes: string;
  notesAr?: string;
  notesEn?: string;
  notesDe?: string;
  notesTr?: string;
  published: boolean;
}

export type FridayServiceSource = "prayer-times" | "jumuah-times";

export interface FridayService {
  id: string;
  date: string;
  prayerTime: string;
  source: FridayServiceSource;
  editable: boolean;
  locationName?: string;
  locationAddress?: string;
  khateebName?: string;
  language?: string;
  languageAr?: string;
  languageEn?: string;
  languageDe?: string;
  languageTr?: string;
  notes?: string;
  notesAr?: string;
  notesEn?: string;
  notesDe?: string;
  notesTr?: string;
}

export interface FridaySchedule {
  date: string;
  items: FridayService[];
  nextIndex: number;
  isToday: boolean;
}

export type FridayKhutbah = {
  id: string;
  date: string;
  titleAr?: string;
  contentAr?: string;
  titleEn?: string;
  contentEn?: string;
  titleDe?: string;
  contentDe?: string;
  titleTr?: string;
  contentTr?: string;
  published: boolean;
  createdAt: string;
  updatedAt: string;
};

export type AnnouncementType = "General" | "Urgent" | "Location update" | "Community" | "Ramadan" | "Eid" | "Donation";
export type AnnouncementDisplayStyle = "normal" | "special";

export interface Announcement extends LocalizedTitleFields, LocalizedMessageFields {
  id: string;
  title: string;
  message: string;
  type: AnnouncementType;
  isUrgent: boolean;
  displayStyle: AnnouncementDisplayStyle;
  displayFrom?: string;
  displayUntil?: string;
  published: boolean;
  createdAt: string;
}

export interface DonationSettings {
  accountHolder: string;
  iban: string;
  bic: string;
  paypalLink?: string;
  defaultPurpose: string;
  defaultPurposeAr?: string;
  defaultPurposeEn?: string;
  defaultPurposeDe?: string;
  defaultPurposeTr?: string;
}

export interface DonationCampaign extends LocalizedTitleFields, LocalizedDescriptionFields {
  id: string;
  title: string;
  description: string;
  targetAmount: number;
  collectedAmount: number;
  startDate: string;
  endDate?: string;
  donationUrl?: string;
  isActive: boolean;
  isFeatured: boolean;
}

export interface Donation {
  id: string;
  amount: number;
  purpose: string;
  donorName?: string;
  receivedAt: string;
  method: "Bank transfer" | "Cash" | "PayPal";
}

export interface DonationReport {
  month: string;
  monthlyNeed: number;
  donationsReceived: number;
  remaining: number;
}

export type AzkarCategory = "Morning" | "Evening" | "After Prayer" | "Sleep" | "Travel" | "Friday";

export interface AzkarItem {
  id: string;
  category: AzkarCategory;
  arabicText: string;
  transliteration: string;
  translationEn: string;
  translationDe: string;
  translationAr?: string;
  translationTr?: string;
  repeatCount: number;
  source: string;
  sortOrder: number;
  isPublished: boolean;
}

export interface Event extends LocalizedTitleFields, LocalizedDescriptionFields, LocalizedLocationFields {
  id: string;
  title: string;
  description: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  type: string;
  published?: boolean;
}

export interface RamadanDay {
  id: string;
  date: string;
  ramadanDay: number;
  imsak: string;
  fajr: string;
  maghrib: string;
  iftar: string;
  taraweeh: string;
  note?: string;
  noteAr?: string;
  noteEn?: string;
  noteDe?: string;
  noteTr?: string;
  published?: boolean;
}

export interface MosqueSettings {
  mosqueName: string;
  mosqueNameAr?: string;
  mosqueNameEn?: string;
  mosqueNameDe?: string;
  mosqueNameTr?: string;
  address: string;
  phone: string;
  email: string;
  googleMapsLink: string;
  whatsappLink: string;
  telegramLink: string;
  accountHolder: string;
  iban: string;
  bic: string;
  publicAppUrl: string;
}

export interface MasjidDisplaySettings {
  fajrPrayerDurationMinutes: number;
  dhuhrPrayerDurationMinutes: number;
  asrPrayerDurationMinutes: number;
  maghribPrayerDurationMinutes: number;
  ishaPrayerDurationMinutes: number;
  azkarPlaylistIds: string[];
}

export const MASJID_DISPLAY_TEST_SCENARIOS = [
  "normal",
  "prayer_approaching",
  "prayer_time_now",
  "waiting_for_iqama",
  "iqama_now",
  "prayer_in_progress",
  "friday_first_countdown",
  "friday_next_countdown",
  "jumuah_now",
  "urgent",
  "special_display",
  "event",
  "campaign",
  "azkar",
  "offline",
  "stale_prayer_data",
  "missing_settings",
  "long_bilingual",
] as const;

export type MasjidDisplayTestScenario = (typeof MASJID_DISPLAY_TEST_SCENARIOS)[number];

type TestBase<S extends MasjidDisplayTestScenario> = { scenario: S; id: string };
type TestCopy = { titleAr: string; titleDe: string; messageAr: string; messageDe: string };

export type MasjidDisplayTestPayload =
  | (TestBase<"normal" | "urgent" | "special_display" | "offline" | "stale_prayer_data" | "missing_settings" | "long_bilingual"> & TestCopy)
  | (TestBase<"prayer_approaching" | "waiting_for_iqama" | "friday_first_countdown" | "friday_next_countdown"> & TestCopy & { targetAt: string; prayer?: ObligatoryPrayerName })
  | (TestBase<"prayer_time_now" | "iqama_now" | "prayer_in_progress" | "jumuah_now"> & TestCopy & { prayer?: ObligatoryPrayerName })
  | (TestBase<"event"> & { titleAr: string; titleDe: string; descriptionAr: string; descriptionDe: string; locationAr: string; locationDe: string; startsAt: string })
  | (TestBase<"campaign"> & { titleAr: string; titleDe: string; descriptionAr: string; descriptionDe: string; donationUrl: string })
  | (TestBase<"azkar"> & { azkarId: string; arabicText: string; germanText: string });

export interface MasjidDisplayTestState {
  enabled: boolean;
  scenario: MasjidDisplayTestScenario | null;
  payload: MasjidDisplayTestPayload | null;
  startedAt: string | null;
  expiresAt: string | null;
  updatedAt: string;
}
