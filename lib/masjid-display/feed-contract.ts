export type DisplayPrayerName = "fajr" | "dhuhr" | "asr" | "maghrib" | "isha";

export type DisplayIqamaDelays = Record<DisplayPrayerName, number>;
export type DisplayPrayerDurations = Record<DisplayPrayerName, number>;

export interface DisplayMaghribProgram {
  enabled: boolean;
  lessonTitle: string | null;
  lessonDurationMinutes: number | null;
  combinedIshaTime: string | null;
}

export interface DisplayPrayerDay {
  date: string;
  fajr: string;
  sunrise: string;
  dhuhr: string;
  asr: string;
  maghrib: string;
  isha: string;
  maghribProgram: DisplayMaghribProgram | null;
}

export interface DisplayJumuahService {
  id: string;
  date: string;
  prayerTime: string;
}

export interface DisplaySettingsDto {
  prayerDurations: DisplayPrayerDurations;
  azkarPlaylistIds: string[];
}

export type DisplayAzkarCategory =
  | "Morning"
  | "Evening"
  | "After Prayer"
  | "Sleep"
  | "Travel"
  | "Friday";

export interface DisplayAzkarDto {
  id: string;
  category: DisplayAzkarCategory;
  arabicText: string;
  translationDe: string;
  source: string;
  repeatCount: number;
  sortOrder: number;
}

export interface DisplayAnnouncementDto {
  id: string;
  titleAr: string;
  titleDe: string;
  messageAr: string;
  messageDe: string;
  isUrgent: boolean;
  displayStyle: "normal" | "special";
  displayFrom: string | null;
  displayUntil: string | null;
}

export interface DisplayEventDto {
  id: string;
  titleAr: string;
  titleDe: string;
  descriptionAr: string;
  descriptionDe: string;
  locationAr: string;
  locationDe: string;
  date: string;
  startTime: string;
  endTime: string | null;
  type: string;
}

export interface DisplayCampaignDto {
  id: string;
  titleAr: string;
  titleDe: string;
  descriptionAr: string;
  descriptionDe: string;
  targetAmount: number;
  collectedAmount: number;
  startDate: string;
  endDate: string | null;
  donationUrl: string | null;
  isFeatured: boolean;
}

export interface MasjidDisplayFeedV1 {
  schemaVersion: 1;
  snapshotRevision: string;
  /**
   * Deterministic snapshot source-version timestamp, not request/current time.
   * Hardcoded represented Azkar are content-versioned into this ISO-compatible
   * value; consumers use the HTTP Date header for the current server clock.
   */
  generatedAt: string;
  timezone: string;

  mosque: {
    nameAr: string;
    nameDe: string;
    address: string;
    publicAppUrl: string;
  };

  prayers: {
    schedule: DisplayPrayerDay[];
    iqamaDelays: DisplayIqamaDelays;
    additionalJumuah: DisplayJumuahService[];
  };

  displaySettings: DisplaySettingsDto;

  azkar: DisplayAzkarDto[];
  announcements: DisplayAnnouncementDto[];
  events: DisplayEventDto[];
  campaigns: DisplayCampaignDto[];
}

export type MasjidDisplayFeedBodyV1 = Omit<MasjidDisplayFeedV1, "snapshotRevision">;
