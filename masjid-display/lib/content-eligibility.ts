import type {
  DisplayAnnouncementDto,
  DisplayAzkarDto,
  DisplayCampaignDto,
  DisplayEventDto,
  DisplayPrayerDay,
  MasjidDisplayFeedV1,
} from "./feed-types";

export interface ActiveContent {
  prayerDay: DisplayPrayerDay | null;
  prayerScheduleStale: boolean;
  azkar: DisplayAzkarDto[];
  announcements: DisplayAnnouncementDto[];
  specialAnnouncements: DisplayAnnouncementDto[];
  urgentAnnouncements: DisplayAnnouncementDto[];
  events: DisplayEventDto[];
  campaigns: DisplayCampaignDto[];
  maghribPrograms: DisplayPrayerDay[];
}

export function isAnnouncementActive(_item: DisplayAnnouncementDto, _now: Date): boolean {
  return false;
}

export function isEventActive(_item: DisplayEventDto, _now: Date, _timezone: string): boolean {
  return false;
}

export function isCampaignActive(_item: DisplayCampaignDto, _now: Date, _timezone: string): boolean {
  return false;
}

export function activeDisplayContent(_feed: MasjidDisplayFeedV1, _now: Date): ActiveContent {
  return {
    prayerDay: null,
    prayerScheduleStale: false,
    azkar: [],
    announcements: [],
    specialAnnouncements: [],
    urgentAnnouncements: [],
    events: [],
    campaigns: [],
    maghribPrograms: [],
  };
}
