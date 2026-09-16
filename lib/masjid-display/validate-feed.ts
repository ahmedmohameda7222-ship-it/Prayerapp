import type {
  DisplayAnnouncementDto,
  DisplayAzkarCategory,
  DisplayCampaignDto,
  DisplayEventDto,
  DisplayIqamaDelays,
  DisplayJumuahService,
  DisplayMaghribProgram,
  DisplayPrayerDay,
  DisplayPrayerDurations,
  DisplaySettingsDto,
  MasjidDisplayFeedV1,
} from "./feed-contract";

export interface DisplayFeedValidationIssue {
  path: string;
  reason: string;
}

export class DisplayFeedValidationError extends Error {
  readonly issues: DisplayFeedValidationIssue[];

  constructor(issues: DisplayFeedValidationIssue[]) {
    super(`Invalid Masjid Display Feed (${issues.length} issue${issues.length === 1 ? "" : "s"})`);
    this.name = "DisplayFeedValidationError";
    this.issues = issues;
  }
}

const PRAYER_KEYS = ["fajr", "dhuhr", "asr", "maghrib", "isha"] as const;
const TIME_KEYS = ["fajr", "sunrise", "dhuhr", "asr", "maghrib", "isha"] as const;
const AZKAR_CATEGORIES: DisplayAzkarCategory[] = ["Morning", "Evening", "After Prayer", "Sleep", "Travel", "Friday"];
const HH_MM = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const HEX_64 = /^[a-f0-9]{64}$/;

type RecordValue = Record<string, unknown>;

function issue(issues: DisplayFeedValidationIssue[], path: string, reason: string) {
  issues.push({ path, reason });
}

function record(value: unknown, path: string, issues: DisplayFeedValidationIssue[]): RecordValue {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    issue(issues, path, "must be an object");
    return {};
  }
  return value as RecordValue;
}

function exactKeys(value: RecordValue, allowed: readonly string[], path: string, issues: DisplayFeedValidationIssue[]) {
  const allowedSet = new Set(allowed);
  for (const key of Object.keys(value)) {
    if (!allowedSet.has(key)) issue(issues, path ? `${path}.${key}` : key, "field is not allowed");
  }
}

function requiredString(value: unknown, path: string, issues: DisplayFeedValidationIssue[]): string {
  if (typeof value !== "string" || !value.trim()) {
    issue(issues, path, "must be a non-empty string");
    return "";
  }
  return value;
}

function nullableString(value: unknown, path: string, issues: DisplayFeedValidationIssue[]): string | null {
  if (value === null) return null;
  return requiredString(value, path, issues);
}

function booleanValue(value: unknown, path: string, issues: DisplayFeedValidationIssue[]): boolean {
  if (typeof value !== "boolean") {
    issue(issues, path, "must be a boolean");
    return false;
  }
  return value;
}

function numberValue(value: unknown, path: string, issues: DisplayFeedValidationIssue[], min = 0): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < min) {
    issue(issues, path, `must be a finite number >= ${min}`);
    return 0;
  }
  return value;
}

function integerRange(value: unknown, path: string, issues: DisplayFeedValidationIssue[], min: number, max: number): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < min || value > max) {
    issue(issues, path, `must be an integer between ${min} and ${max}`);
    return min;
  }
  return value;
}

function validDate(value: unknown, path: string, issues: DisplayFeedValidationIssue[]): string {
  const text = requiredString(value, path, issues);
  if (!ISO_DATE.test(text)) {
    if (text) issue(issues, path, "must be YYYY-MM-DD");
    return text;
  }
  const [year, month, day] = text.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    issue(issues, path, "must be a real calendar date");
  }
  return text;
}

function validTime(value: unknown, path: string, issues: DisplayFeedValidationIssue[]): string {
  const text = requiredString(value, path, issues);
  if (text && !HH_MM.test(text)) issue(issues, path, "must be HH:MM in 24-hour time");
  return text;
}

function validTimestamp(value: unknown, path: string, issues: DisplayFeedValidationIssue[]): string {
  const text = requiredString(value, path, issues);
  if (text && (!/^\d{4}-\d{2}-\d{2}T/.test(text) || !Number.isFinite(Date.parse(text)))) {
    issue(issues, path, "must be a valid ISO timestamp");
  }
  return text;
}

function nullableTimestamp(value: unknown, path: string, issues: DisplayFeedValidationIssue[]): string | null {
  if (value === null) return null;
  return validTimestamp(value, path, issues);
}

function validTimezone(value: unknown, path: string, issues: DisplayFeedValidationIssue[]): string {
  const timezone = requiredString(value, path, issues);
  if (!timezone) return timezone;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone }).format(new Date(0));
  } catch {
    issue(issues, path, "must be a valid IANA timezone");
  }
  return timezone;
}

function httpsUrl(value: unknown, path: string, issues: DisplayFeedValidationIssue[]): string {
  const text = requiredString(value, path, issues);
  if (!text) return text;
  try {
    const url = new URL(text);
    if (url.protocol !== "https:") issue(issues, path, "must use HTTPS");
  } catch {
    issue(issues, path, "must be a valid URL");
  }
  return text;
}

function nullableHttpUrl(value: unknown, path: string, issues: DisplayFeedValidationIssue[]): string | null {
  if (value === null) return null;
  const text = requiredString(value, path, issues);
  if (!text) return text;
  try {
    const url = new URL(text);
    if (url.protocol !== "https:" && url.protocol !== "http:") issue(issues, path, "must use HTTP or HTTPS");
  } catch {
    issue(issues, path, "must be a valid URL");
  }
  return text;
}

function uniqueIds(items: RecordValue[], path: string, issues: DisplayFeedValidationIssue[]) {
  const seen = new Set<string>();
  items.forEach((item, index) => {
    const id = item.id;
    if (typeof id !== "string" || !id.trim()) return;
    if (seen.has(id)) issue(issues, `${path}[${index}].id`, "must be unique");
    seen.add(id);
  });
}

function validateMaghribProgram(value: unknown, path: string, issues: DisplayFeedValidationIssue[]): DisplayMaghribProgram | null {
  if (value === null) return null;
  const source = record(value, path, issues);
  exactKeys(source, ["enabled", "lessonTitle", "lessonDurationMinutes", "combinedIshaTime"], path, issues);
  const enabled = booleanValue(source.enabled, `${path}.enabled`, issues);
  const lessonTitle = source.lessonTitle === null ? null : requiredString(source.lessonTitle, `${path}.lessonTitle`, issues);
  let lessonDurationMinutes: number | null = null;
  if (source.lessonDurationMinutes !== null) {
    lessonDurationMinutes = integerRange(source.lessonDurationMinutes, `${path}.lessonDurationMinutes`, issues, 1, 240);
  }
  const combinedIshaTime = source.combinedIshaTime === null ? null : validTime(source.combinedIshaTime, `${path}.combinedIshaTime`, issues);
  return { enabled, lessonTitle, lessonDurationMinutes, combinedIshaTime };
}

function validatePrayerDay(value: unknown, index: number, issues: DisplayFeedValidationIssue[]): DisplayPrayerDay {
  const path = `prayers.schedule[${index}]`;
  const source = record(value, path, issues);
  exactKeys(source, ["date", ...TIME_KEYS, "maghribProgram"], path, issues);
  return {
    date: validDate(source.date, `${path}.date`, issues),
    fajr: validTime(source.fajr, `${path}.fajr`, issues),
    sunrise: validTime(source.sunrise, `${path}.sunrise`, issues),
    dhuhr: validTime(source.dhuhr, `${path}.dhuhr`, issues),
    asr: validTime(source.asr, `${path}.asr`, issues),
    maghrib: validTime(source.maghrib, `${path}.maghrib`, issues),
    isha: validTime(source.isha, `${path}.isha`, issues),
    maghribProgram: validateMaghribProgram(source.maghribProgram, `${path}.maghribProgram`, issues),
  };
}

function validateIqamaDelays(value: unknown, issues: DisplayFeedValidationIssue[]): DisplayIqamaDelays {
  const path = "prayers.iqamaDelays";
  const source = record(value, path, issues);
  exactKeys(source, PRAYER_KEYS, path, issues);
  return {
    fajr: integerRange(source.fajr, `${path}.fajr`, issues, 0, 180),
    dhuhr: integerRange(source.dhuhr, `${path}.dhuhr`, issues, 0, 180),
    asr: integerRange(source.asr, `${path}.asr`, issues, 0, 180),
    maghrib: integerRange(source.maghrib, `${path}.maghrib`, issues, 0, 180),
    isha: integerRange(source.isha, `${path}.isha`, issues, 0, 180),
  };
}

function validatePrayerDurations(value: unknown, issues: DisplayFeedValidationIssue[]): DisplayPrayerDurations {
  const path = "displaySettings.prayerDurations";
  const source = record(value, path, issues);
  exactKeys(source, PRAYER_KEYS, path, issues);
  return {
    fajr: integerRange(source.fajr, `${path}.fajr`, issues, 2, 120),
    dhuhr: integerRange(source.dhuhr, `${path}.dhuhr`, issues, 2, 120),
    asr: integerRange(source.asr, `${path}.asr`, issues, 2, 120),
    maghrib: integerRange(source.maghrib, `${path}.maghrib`, issues, 2, 120),
    isha: integerRange(source.isha, `${path}.isha`, issues, 2, 120),
  };
}

function validateJumuah(value: unknown, index: number, issues: DisplayFeedValidationIssue[]): DisplayJumuahService {
  const path = `prayers.additionalJumuah[${index}]`;
  const source = record(value, path, issues);
  exactKeys(source, ["id", "date", "prayerTime"], path, issues);
  return {
    id: requiredString(source.id, `${path}.id`, issues),
    date: validDate(source.date, `${path}.date`, issues),
    prayerTime: validTime(source.prayerTime, `${path}.prayerTime`, issues),
  };
}

function validateDisplaySettings(value: unknown, issues: DisplayFeedValidationIssue[]): DisplaySettingsDto {
  const path = "displaySettings";
  const source = record(value, path, issues);
  exactKeys(source, ["prayerDurations", "azkarPlaylistIds"], path, issues);
  const playlist = Array.isArray(source.azkarPlaylistIds) ? source.azkarPlaylistIds : [];
  if (!Array.isArray(source.azkarPlaylistIds)) issue(issues, `${path}.azkarPlaylistIds`, "must be an array");
  const ids = playlist.map((entry, index) => requiredString(entry, `${path}.azkarPlaylistIds[${index}]`, issues));
  const seen = new Set<string>();
  ids.forEach((id, index) => {
    if (id && seen.has(id)) issue(issues, `${path}.azkarPlaylistIds[${index}]`, "must be unique");
    seen.add(id);
  });
  return { prayerDurations: validatePrayerDurations(source.prayerDurations, issues), azkarPlaylistIds: ids };
}

function validateAzkar(value: unknown, index: number, issues: DisplayFeedValidationIssue[]) {
  const path = `azkar[${index}]`;
  const source = record(value, path, issues);
  exactKeys(source, ["id", "category", "arabicText", "translationDe", "source", "repeatCount", "sortOrder"], path, issues);
  const category = requiredString(source.category, `${path}.category`, issues);
  if (category && !AZKAR_CATEGORIES.includes(category as DisplayAzkarCategory)) issue(issues, `${path}.category`, "is not a supported Azkar category");
  return {
    id: requiredString(source.id, `${path}.id`, issues),
    category: category as DisplayAzkarCategory,
    arabicText: requiredString(source.arabicText, `${path}.arabicText`, issues),
    translationDe: requiredString(source.translationDe, `${path}.translationDe`, issues),
    source: requiredString(source.source, `${path}.source`, issues),
    repeatCount: integerRange(source.repeatCount, `${path}.repeatCount`, issues, 1, 1000),
    sortOrder: integerRange(source.sortOrder, `${path}.sortOrder`, issues, 0, Number.MAX_SAFE_INTEGER),
  };
}

function validateAnnouncement(value: unknown, index: number, issues: DisplayFeedValidationIssue[]): DisplayAnnouncementDto {
  const path = `announcements[${index}]`;
  const source = record(value, path, issues);
  exactKeys(source, ["id", "titleAr", "titleDe", "messageAr", "messageDe", "isUrgent", "displayStyle", "displayFrom", "displayUntil"], path, issues);
  const displayStyle = source.displayStyle;
  if (displayStyle !== "normal" && displayStyle !== "special") issue(issues, `${path}.displayStyle`, "must be normal or special");
  const displayFrom = nullableTimestamp(source.displayFrom, `${path}.displayFrom`, issues);
  const displayUntil = nullableTimestamp(source.displayUntil, `${path}.displayUntil`, issues);
  if (displayFrom && displayUntil && Date.parse(displayFrom) > Date.parse(displayUntil)) issue(issues, `${path}.displayUntil`, "must be on or after displayFrom");
  return {
    id: requiredString(source.id, `${path}.id`, issues),
    titleAr: requiredString(source.titleAr, `${path}.titleAr`, issues),
    titleDe: requiredString(source.titleDe, `${path}.titleDe`, issues),
    messageAr: requiredString(source.messageAr, `${path}.messageAr`, issues),
    messageDe: requiredString(source.messageDe, `${path}.messageDe`, issues),
    isUrgent: booleanValue(source.isUrgent, `${path}.isUrgent`, issues),
    displayStyle: displayStyle === "special" ? "special" : "normal",
    displayFrom,
    displayUntil,
  };
}

function validateEvent(value: unknown, index: number, issues: DisplayFeedValidationIssue[]): DisplayEventDto {
  const path = `events[${index}]`;
  const source = record(value, path, issues);
  exactKeys(source, ["id", "titleAr", "titleDe", "descriptionAr", "descriptionDe", "locationAr", "locationDe", "date", "startTime", "endTime", "type"], path, issues);
  const endTime = source.endTime === null ? null : validTime(source.endTime, `${path}.endTime`, issues);
  return {
    id: requiredString(source.id, `${path}.id`, issues),
    titleAr: requiredString(source.titleAr, `${path}.titleAr`, issues),
    titleDe: requiredString(source.titleDe, `${path}.titleDe`, issues),
    descriptionAr: requiredString(source.descriptionAr, `${path}.descriptionAr`, issues),
    descriptionDe: requiredString(source.descriptionDe, `${path}.descriptionDe`, issues),
    locationAr: requiredString(source.locationAr, `${path}.locationAr`, issues),
    locationDe: requiredString(source.locationDe, `${path}.locationDe`, issues),
    date: validDate(source.date, `${path}.date`, issues),
    startTime: validTime(source.startTime, `${path}.startTime`, issues),
    endTime,
    type: requiredString(source.type, `${path}.type`, issues),
  };
}

function validateCampaign(value: unknown, index: number, issues: DisplayFeedValidationIssue[]): DisplayCampaignDto {
  const path = `campaigns[${index}]`;
  const source = record(value, path, issues);
  exactKeys(source, ["id", "titleAr", "titleDe", "descriptionAr", "descriptionDe", "targetAmount", "collectedAmount", "startDate", "endDate", "donationUrl", "isFeatured"], path, issues);
  const startDate = validDate(source.startDate, `${path}.startDate`, issues);
  const endDate = source.endDate === null ? null : validDate(source.endDate, `${path}.endDate`, issues);
  if (startDate && endDate && endDate < startDate) issue(issues, `${path}.endDate`, "must be on or after startDate");
  return {
    id: requiredString(source.id, `${path}.id`, issues),
    titleAr: requiredString(source.titleAr, `${path}.titleAr`, issues),
    titleDe: requiredString(source.titleDe, `${path}.titleDe`, issues),
    descriptionAr: requiredString(source.descriptionAr, `${path}.descriptionAr`, issues),
    descriptionDe: requiredString(source.descriptionDe, `${path}.descriptionDe`, issues),
    targetAmount: numberValue(source.targetAmount, `${path}.targetAmount`, issues),
    collectedAmount: numberValue(source.collectedAmount, `${path}.collectedAmount`, issues),
    startDate,
    endDate,
    donationUrl: nullableHttpUrl(source.donationUrl, `${path}.donationUrl`, issues),
    isFeatured: booleanValue(source.isFeatured, `${path}.isFeatured`, issues),
  };
}

export function validateMasjidDisplayFeed(value: unknown): MasjidDisplayFeedV1 {
  const issues: DisplayFeedValidationIssue[] = [];
  const source = record(value, "feed", issues);
  exactKeys(source, ["schemaVersion", "snapshotRevision", "generatedAt", "timezone", "mosque", "prayers", "displaySettings", "azkar", "announcements", "events", "campaigns"], "", issues);

  if (source.schemaVersion !== 1) issue(issues, "schemaVersion", "only schema version 1 is supported");
  const revision = requiredString(source.snapshotRevision, "snapshotRevision", issues);
  if (revision && !HEX_64.test(revision)) issue(issues, "snapshotRevision", "must be a lowercase SHA-256 hex digest");

  const mosqueSource = record(source.mosque, "mosque", issues);
  exactKeys(mosqueSource, ["nameAr", "nameDe", "address", "publicAppUrl"], "mosque", issues);
  const mosque = {
    nameAr: requiredString(mosqueSource.nameAr, "mosque.nameAr", issues),
    nameDe: requiredString(mosqueSource.nameDe, "mosque.nameDe", issues),
    address: requiredString(mosqueSource.address, "mosque.address", issues),
    publicAppUrl: httpsUrl(mosqueSource.publicAppUrl, "mosque.publicAppUrl", issues),
  };

  const prayersSource = record(source.prayers, "prayers", issues);
  exactKeys(prayersSource, ["schedule", "iqamaDelays", "additionalJumuah"], "prayers", issues);
  const scheduleRaw = Array.isArray(prayersSource.schedule) ? prayersSource.schedule : [];
  if (!Array.isArray(prayersSource.schedule)) issue(issues, "prayers.schedule", "must be an array");
  if (scheduleRaw.length === 0) issue(issues, "prayers.schedule", "must contain at least one prayer day");
  const schedule = scheduleRaw.map((entry, index) => validatePrayerDay(entry, index, issues));
  for (let index = 1; index < schedule.length; index += 1) {
    if (schedule[index].date <= schedule[index - 1].date) issue(issues, `prayers.schedule[${index}].date`, "must be unique and strictly ascending");
  }

  const jumuahRaw = Array.isArray(prayersSource.additionalJumuah) ? prayersSource.additionalJumuah : [];
  if (!Array.isArray(prayersSource.additionalJumuah)) issue(issues, "prayers.additionalJumuah", "must be an array");
  const jumuahRecords = jumuahRaw.map((entry) => record(entry, "prayers.additionalJumuah", issues));
  uniqueIds(jumuahRecords, "prayers.additionalJumuah", issues);
  const additionalJumuah = jumuahRaw.map((entry, index) => validateJumuah(entry, index, issues));

  const arrayField = (key: "azkar" | "announcements" | "events" | "campaigns") => {
    if (!Array.isArray(source[key])) {
      issue(issues, key, "must be an array");
      return [] as unknown[];
    }
    return source[key] as unknown[];
  };

  const azkarRaw = arrayField("azkar");
  const announcementRaw = arrayField("announcements");
  const eventRaw = arrayField("events");
  const campaignRaw = arrayField("campaigns");
  uniqueIds(azkarRaw.map((entry) => record(entry, "azkar", issues)), "azkar", issues);
  uniqueIds(announcementRaw.map((entry) => record(entry, "announcements", issues)), "announcements", issues);
  uniqueIds(eventRaw.map((entry) => record(entry, "events", issues)), "events", issues);
  uniqueIds(campaignRaw.map((entry) => record(entry, "campaigns", issues)), "campaigns", issues);

  const result: MasjidDisplayFeedV1 = {
    schemaVersion: 1,
    snapshotRevision: revision,
    generatedAt: validTimestamp(source.generatedAt, "generatedAt", issues),
    timezone: validTimezone(source.timezone, "timezone", issues),
    mosque,
    prayers: {
      schedule,
      iqamaDelays: validateIqamaDelays(prayersSource.iqamaDelays, issues),
      additionalJumuah,
    },
    displaySettings: validateDisplaySettings(source.displaySettings, issues),
    azkar: azkarRaw.map((entry, index) => validateAzkar(entry, index, issues)),
    announcements: announcementRaw.map((entry, index) => validateAnnouncement(entry, index, issues)),
    events: eventRaw.map((entry, index) => validateEvent(entry, index, issues)),
    campaigns: campaignRaw.map((entry, index) => validateCampaign(entry, index, issues)),
  };

  if (issues.length > 0) throw new DisplayFeedValidationError(issues);
  return result;
}
