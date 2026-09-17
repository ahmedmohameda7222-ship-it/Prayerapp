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

export interface FeedValidationIssue {
  path: string;
  reason: string;
}

export class FeedValidationError extends Error {
  readonly issues: FeedValidationIssue[];

  constructor(issues: FeedValidationIssue[]) {
    const details = issues.slice(0, 4).map(({ path, reason }) => `${path}: ${reason}`).join("; ");
    super(`Invalid Feed v1 (${issues.length} issue${issues.length === 1 ? "" : "s"}): ${details}`);
    this.name = "FeedValidationError";
    this.issues = issues;
  }
}

const PRAYER_KEYS = ["fajr", "dhuhr", "asr", "maghrib", "isha"] as const;
const TIME_KEYS = ["fajr", "sunrise", "dhuhr", "asr", "maghrib", "isha"] as const;
const AZKAR_CATEGORIES: DisplayAzkarCategory[] = [
  "Morning",
  "Evening",
  "After Prayer",
  "Sleep",
  "Travel",
  "Friday",
];
const HH_MM = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const HEX_64 = /^[a-f0-9]{64}$/;

type RecordValue = Record<string, unknown>;

function addIssue(issues: FeedValidationIssue[], path: string, reason: string) {
  issues.push({ path, reason });
}

function asRecord(value: unknown, path: string, issues: FeedValidationIssue[]): RecordValue {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    addIssue(issues, path, "must be an object");
    return {};
  }
  return value as RecordValue;
}

function exactKeys(
  value: RecordValue,
  allowed: readonly string[],
  path: string,
  issues: FeedValidationIssue[],
) {
  const allowedSet = new Set(allowed);
  for (const key of Object.keys(value)) {
    if (!allowedSet.has(key)) {
      addIssue(issues, path ? `${path}.${key}` : key, "field is not allowed");
    }
  }
}

function requiredString(value: unknown, path: string, issues: FeedValidationIssue[]): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    addIssue(issues, path, "must be a non-empty string");
    return "";
  }
  return value;
}

function booleanValue(value: unknown, path: string, issues: FeedValidationIssue[]): boolean {
  if (typeof value !== "boolean") {
    addIssue(issues, path, "must be a boolean");
    return false;
  }
  return value;
}

function finiteNumber(value: unknown, path: string, issues: FeedValidationIssue[], min = 0): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < min) {
    addIssue(issues, path, `must be a finite number >= ${min}`);
    return min;
  }
  return value;
}

function integerRange(
  value: unknown,
  path: string,
  issues: FeedValidationIssue[],
  min: number,
  max: number,
): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < min || value > max) {
    addIssue(issues, path, `must be an integer between ${min} and ${max}`);
    return min;
  }
  return value;
}

function validDate(value: unknown, path: string, issues: FeedValidationIssue[]): string {
  const text = requiredString(value, path, issues);
  if (!text) return text;
  if (!ISO_DATE.test(text)) {
    addIssue(issues, path, "must be YYYY-MM-DD");
    return text;
  }

  const [year, month, day] = text.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    addIssue(issues, path, "must be a real calendar date");
  }
  return text;
}

function validTime(value: unknown, path: string, issues: FeedValidationIssue[]): string {
  const text = requiredString(value, path, issues);
  if (text && !HH_MM.test(text)) {
    addIssue(issues, path, "must be HH:MM in 24-hour time");
  }
  return text;
}

function validTimestamp(value: unknown, path: string, issues: FeedValidationIssue[]): string {
  const text = requiredString(value, path, issues);
  if (text && (!/^\d{4}-\d{2}-\d{2}T/.test(text) || !Number.isFinite(Date.parse(text)))) {
    addIssue(issues, path, "must be a valid ISO timestamp");
  }
  return text;
}

function nullableTimestamp(
  value: unknown,
  path: string,
  issues: FeedValidationIssue[],
): string | null {
  if (value === null) return null;
  return validTimestamp(value, path, issues);
}

function validTimezone(value: unknown, path: string, issues: FeedValidationIssue[]): string {
  const timezone = requiredString(value, path, issues);
  if (!timezone) return timezone;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone }).format(new Date(0));
  } catch {
    addIssue(issues, path, "must be a valid IANA timezone");
  }
  return timezone;
}

function httpsUrl(value: unknown, path: string, issues: FeedValidationIssue[]): string {
  const text = requiredString(value, path, issues);
  if (!text) return text;
  try {
    const url = new URL(text);
    if (url.protocol !== "https:") addIssue(issues, path, "must be a valid HTTPS URL");
  } catch {
    addIssue(issues, path, "must be a valid HTTPS URL");
  }
  return text;
}

function nullableHttpUrl(
  value: unknown,
  path: string,
  issues: FeedValidationIssue[],
): string | null {
  if (value === null) return null;
  const text = requiredString(value, path, issues);
  if (!text) return text;
  try {
    const url = new URL(text);
    if (url.protocol !== "https:" && url.protocol !== "http:") {
      addIssue(issues, path, "must be a valid HTTP or HTTPS URL");
    }
  } catch {
    addIssue(issues, path, "must be a valid HTTP or HTTPS URL");
  }
  return text;
}

function uniqueIds(items: RecordValue[], path: string, issues: FeedValidationIssue[]) {
  const seen = new Set<string>();
  items.forEach((item, index) => {
    const id = item.id;
    if (typeof id !== "string" || !id.trim()) return;
    if (seen.has(id)) addIssue(issues, `${path}[${index}].id`, "must be unique");
    seen.add(id);
  });
}

function validateMaghribProgram(
  value: unknown,
  path: string,
  issues: FeedValidationIssue[],
): DisplayMaghribProgram | null {
  if (value === null) return null;
  const source = asRecord(value, path, issues);
  exactKeys(source, ["enabled", "lessonTitle", "lessonDurationMinutes", "combinedIshaTime"], path, issues);

  return {
    enabled: booleanValue(source.enabled, `${path}.enabled`, issues),
    lessonTitle:
      source.lessonTitle === null ? null : requiredString(source.lessonTitle, `${path}.lessonTitle`, issues),
    lessonDurationMinutes:
      source.lessonDurationMinutes === null
        ? null
        : integerRange(source.lessonDurationMinutes, `${path}.lessonDurationMinutes`, issues, 1, 240),
    combinedIshaTime:
      source.combinedIshaTime === null
        ? null
        : validTime(source.combinedIshaTime, `${path}.combinedIshaTime`, issues),
  };
}

function validatePrayerDay(
  value: unknown,
  index: number,
  issues: FeedValidationIssue[],
): DisplayPrayerDay {
  const path = `prayers.schedule[${index}]`;
  const source = asRecord(value, path, issues);
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

function validateIqamaDelays(value: unknown, issues: FeedValidationIssue[]): DisplayIqamaDelays {
  const path = "prayers.iqamaDelays";
  const source = asRecord(value, path, issues);
  exactKeys(source, PRAYER_KEYS, path, issues);

  return {
    fajr: integerRange(source.fajr, `${path}.fajr`, issues, 0, 180),
    dhuhr: integerRange(source.dhuhr, `${path}.dhuhr`, issues, 0, 180),
    asr: integerRange(source.asr, `${path}.asr`, issues, 0, 180),
    maghrib: integerRange(source.maghrib, `${path}.maghrib`, issues, 0, 180),
    isha: integerRange(source.isha, `${path}.isha`, issues, 0, 180),
  };
}

function validatePrayerDurations(value: unknown, issues: FeedValidationIssue[]): DisplayPrayerDurations {
  const path = "displaySettings.prayerDurations";
  const source = asRecord(value, path, issues);
  exactKeys(source, PRAYER_KEYS, path, issues);

  return {
    fajr: integerRange(source.fajr, `${path}.fajr`, issues, 2, 120),
    dhuhr: integerRange(source.dhuhr, `${path}.dhuhr`, issues, 2, 120),
    asr: integerRange(source.asr, `${path}.asr`, issues, 2, 120),
    maghrib: integerRange(source.maghrib, `${path}.maghrib`, issues, 2, 120),
    isha: integerRange(source.isha, `${path}.isha`, issues, 2, 120),
  };
}

function validateJumuah(
  value: unknown,
  index: number,
  issues: FeedValidationIssue[],
): DisplayJumuahService {
  const path = `prayers.additionalJumuah[${index}]`;
  const source = asRecord(value, path, issues);
  exactKeys(source, ["id", "date", "prayerTime"], path, issues);

  return {
    id: requiredString(source.id, `${path}.id`, issues),
    date: validDate(source.date, `${path}.date`, issues),
    prayerTime: validTime(source.prayerTime, `${path}.prayerTime`, issues),
  };
}

function validateDisplaySettings(value: unknown, issues: FeedValidationIssue[]): DisplaySettingsDto {
  const path = "displaySettings";
  const source = asRecord(value, path, issues);
  exactKeys(source, ["prayerDurations", "azkarPlaylistIds"], path, issues);

  const rawIds = Array.isArray(source.azkarPlaylistIds) ? source.azkarPlaylistIds : [];
  if (!Array.isArray(source.azkarPlaylistIds)) {
    addIssue(issues, `${path}.azkarPlaylistIds`, "must be an array");
  }
  const azkarPlaylistIds = rawIds.map((id, index) =>
    requiredString(id, `${path}.azkarPlaylistIds[${index}]`, issues),
  );
  const seen = new Set<string>();
  azkarPlaylistIds.forEach((id, index) => {
    if (id && seen.has(id)) addIssue(issues, `${path}.azkarPlaylistIds[${index}]`, "must be unique");
    seen.add(id);
  });

  return {
    prayerDurations: validatePrayerDurations(source.prayerDurations, issues),
    azkarPlaylistIds,
  };
}

function validateAzkar(value: unknown, index: number, issues: FeedValidationIssue[]) {
  const path = `azkar[${index}]`;
  const source = asRecord(value, path, issues);
  exactKeys(source, ["id", "category", "arabicText", "translationDe", "source", "repeatCount", "sortOrder"], path, issues);
  const category = requiredString(source.category, `${path}.category`, issues);
  if (category && !AZKAR_CATEGORIES.includes(category as DisplayAzkarCategory)) {
    addIssue(issues, `${path}.category`, "is not a supported Azkar category");
  }

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

function validateAnnouncement(
  value: unknown,
  index: number,
  issues: FeedValidationIssue[],
): DisplayAnnouncementDto {
  const path = `announcements[${index}]`;
  const source = asRecord(value, path, issues);
  exactKeys(source, ["id", "titleAr", "titleDe", "messageAr", "messageDe", "isUrgent", "displayStyle", "displayFrom", "displayUntil"], path, issues);

  if (source.displayStyle !== "normal" && source.displayStyle !== "special") {
    addIssue(issues, `${path}.displayStyle`, "must be normal or special");
  }
  const displayFrom = nullableTimestamp(source.displayFrom, `${path}.displayFrom`, issues);
  const displayUntil = nullableTimestamp(source.displayUntil, `${path}.displayUntil`, issues);
  if (displayFrom && displayUntil && Date.parse(displayFrom) > Date.parse(displayUntil)) {
    addIssue(issues, `${path}.displayUntil`, "must be on or after displayFrom");
  }

  return {
    id: requiredString(source.id, `${path}.id`, issues),
    titleAr: requiredString(source.titleAr, `${path}.titleAr`, issues),
    titleDe: requiredString(source.titleDe, `${path}.titleDe`, issues),
    messageAr: requiredString(source.messageAr, `${path}.messageAr`, issues),
    messageDe: requiredString(source.messageDe, `${path}.messageDe`, issues),
    isUrgent: booleanValue(source.isUrgent, `${path}.isUrgent`, issues),
    displayStyle: source.displayStyle === "special" ? "special" : "normal",
    displayFrom,
    displayUntil,
  };
}

function validateEvent(value: unknown, index: number, issues: FeedValidationIssue[]): DisplayEventDto {
  const path = `events[${index}]`;
  const source = asRecord(value, path, issues);
  exactKeys(source, ["id", "titleAr", "titleDe", "descriptionAr", "descriptionDe", "locationAr", "locationDe", "date", "startTime", "endTime", "type"], path, issues);

  const startTime = validTime(source.startTime, `${path}.startTime`, issues);
  const endTime = source.endTime === null ? null : validTime(source.endTime, `${path}.endTime`, issues);
  if (startTime && endTime && endTime < startTime) {
    addIssue(issues, `${path}.endTime`, "must be on or after startTime");
  }

  return {
    id: requiredString(source.id, `${path}.id`, issues),
    titleAr: requiredString(source.titleAr, `${path}.titleAr`, issues),
    titleDe: requiredString(source.titleDe, `${path}.titleDe`, issues),
    descriptionAr: requiredString(source.descriptionAr, `${path}.descriptionAr`, issues),
    descriptionDe: requiredString(source.descriptionDe, `${path}.descriptionDe`, issues),
    locationAr: requiredString(source.locationAr, `${path}.locationAr`, issues),
    locationDe: requiredString(source.locationDe, `${path}.locationDe`, issues),
    date: validDate(source.date, `${path}.date`, issues),
    startTime,
    endTime,
    type: requiredString(source.type, `${path}.type`, issues),
  };
}

function validateCampaign(
  value: unknown,
  index: number,
  issues: FeedValidationIssue[],
): DisplayCampaignDto {
  const path = `campaigns[${index}]`;
  const source = asRecord(value, path, issues);
  exactKeys(source, ["id", "titleAr", "titleDe", "descriptionAr", "descriptionDe", "targetAmount", "collectedAmount", "startDate", "endDate", "donationUrl", "isFeatured"], path, issues);

  const startDate = validDate(source.startDate, `${path}.startDate`, issues);
  const endDate = source.endDate === null ? null : validDate(source.endDate, `${path}.endDate`, issues);
  if (startDate && endDate && endDate < startDate) {
    addIssue(issues, `${path}.endDate`, "must be on or after startDate");
  }

  return {
    id: requiredString(source.id, `${path}.id`, issues),
    titleAr: requiredString(source.titleAr, `${path}.titleAr`, issues),
    titleDe: requiredString(source.titleDe, `${path}.titleDe`, issues),
    descriptionAr: requiredString(source.descriptionAr, `${path}.descriptionAr`, issues),
    descriptionDe: requiredString(source.descriptionDe, `${path}.descriptionDe`, issues),
    targetAmount: finiteNumber(source.targetAmount, `${path}.targetAmount`, issues),
    collectedAmount: finiteNumber(source.collectedAmount, `${path}.collectedAmount`, issues),
    startDate,
    endDate,
    donationUrl: nullableHttpUrl(source.donationUrl, `${path}.donationUrl`, issues),
    isFeatured: booleanValue(source.isFeatured, `${path}.isFeatured`, issues),
  };
}

export function validateFeedV1(value: unknown): MasjidDisplayFeedV1 {
  const issues: FeedValidationIssue[] = [];
  const source = asRecord(value, "feed", issues);
  exactKeys(
    source,
    ["schemaVersion", "snapshotRevision", "generatedAt", "timezone", "mosque", "prayers", "displaySettings", "azkar", "announcements", "events", "campaigns"],
    "",
    issues,
  );

  if (source.schemaVersion !== 1) {
    addIssue(issues, "schemaVersion", "only schema version 1 is supported");
  }

  const snapshotRevision = requiredString(source.snapshotRevision, "snapshotRevision", issues);
  if (snapshotRevision && !HEX_64.test(snapshotRevision)) {
    addIssue(issues, "snapshotRevision", "must be a lowercase SHA-256 hex digest");
  }

  const mosqueSource = asRecord(source.mosque, "mosque", issues);
  exactKeys(mosqueSource, ["nameAr", "nameDe", "address", "publicAppUrl"], "mosque", issues);
  const mosque = {
    nameAr: requiredString(mosqueSource.nameAr, "mosque.nameAr", issues),
    nameDe: requiredString(mosqueSource.nameDe, "mosque.nameDe", issues),
    address: requiredString(mosqueSource.address, "mosque.address", issues),
    publicAppUrl: httpsUrl(mosqueSource.publicAppUrl, "mosque.publicAppUrl", issues),
  };

  const prayersSource = asRecord(source.prayers, "prayers", issues);
  exactKeys(prayersSource, ["schedule", "iqamaDelays", "additionalJumuah"], "prayers", issues);

  const scheduleRaw = Array.isArray(prayersSource.schedule) ? prayersSource.schedule : [];
  if (!Array.isArray(prayersSource.schedule)) addIssue(issues, "prayers.schedule", "must be an array");
  if (scheduleRaw.length === 0) addIssue(issues, "prayers.schedule", "must contain at least one prayer day");
  const schedule = scheduleRaw.map((entry, index) => validatePrayerDay(entry, index, issues));
  for (let index = 1; index < schedule.length; index += 1) {
    if (schedule[index].date <= schedule[index - 1].date) {
      addIssue(issues, `prayers.schedule[${index}].date`, "must be unique and strictly ascending");
    }
  }

  const jumuahRaw = Array.isArray(prayersSource.additionalJumuah) ? prayersSource.additionalJumuah : [];
  if (!Array.isArray(prayersSource.additionalJumuah)) {
    addIssue(issues, "prayers.additionalJumuah", "must be an array");
  }
  uniqueIds(
    jumuahRaw.map((entry) => asRecord(entry, "prayers.additionalJumuah", issues)),
    "prayers.additionalJumuah",
    issues,
  );
  const additionalJumuah = jumuahRaw.map((entry, index) => validateJumuah(entry, index, issues));

  const arrayField = (key: "azkar" | "announcements" | "events" | "campaigns") => {
    if (!Array.isArray(source[key])) {
      addIssue(issues, key, "must be an array");
      return [] as unknown[];
    }
    return source[key] as unknown[];
  };

  const azkarRaw = arrayField("azkar");
  const announcementRaw = arrayField("announcements");
  const eventRaw = arrayField("events");
  const campaignRaw = arrayField("campaigns");

  uniqueIds(azkarRaw.map((entry) => asRecord(entry, "azkar", issues)), "azkar", issues);
  uniqueIds(
    announcementRaw.map((entry) => asRecord(entry, "announcements", issues)),
    "announcements",
    issues,
  );
  uniqueIds(eventRaw.map((entry) => asRecord(entry, "events", issues)), "events", issues);
  uniqueIds(campaignRaw.map((entry) => asRecord(entry, "campaigns", issues)), "campaigns", issues);

  const result: MasjidDisplayFeedV1 = {
    schemaVersion: 1,
    snapshotRevision,
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

  if (issues.length > 0) throw new FeedValidationError(issues);
  return result;
}
