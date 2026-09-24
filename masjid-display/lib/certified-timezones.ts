export const CERTIFIED_PRAYER_TIMEZONE_RULES = {
  "America/New_York": [
    ["2026-03-08T06:30:00.000Z", "2026-03-08T01:30"],
    ["2026-03-08T07:30:00.000Z", "2026-03-08T03:30"],
    ["2026-11-01T05:30:00.000Z", "2026-11-01T01:30"],
    ["2026-11-01T06:30:00.000Z", "2026-11-01T01:30"],
    ["2027-03-14T06:30:00.000Z", "2027-03-14T01:30"],
    ["2027-03-14T07:30:00.000Z", "2027-03-14T03:30"],
  ],
  "Asia/Riyadh": [
    ["2026-01-15T09:00:00.000Z", "2026-01-15T12:00"],
    ["2027-07-15T09:00:00.000Z", "2027-07-15T12:00"],
  ],
  "Asia/Tokyo": [
    ["2026-01-15T03:00:00.000Z", "2026-01-15T12:00"],
    ["2027-07-15T03:00:00.000Z", "2027-07-15T12:00"],
  ],
  "Europe/Berlin": [
    ["2026-03-29T00:30:00.000Z", "2026-03-29T01:30"],
    ["2026-03-29T01:30:00.000Z", "2026-03-29T03:30"],
    ["2026-10-25T00:30:00.000Z", "2026-10-25T02:30"],
    ["2026-10-25T01:30:00.000Z", "2026-10-25T02:30"],
    ["2027-03-28T00:30:00.000Z", "2027-03-28T01:30"],
    ["2027-03-28T01:30:00.000Z", "2027-03-28T03:30"],
  ],
  UTC: [
    ["2026-01-15T12:00:00.000Z", "2026-01-15T12:00"],
    ["2027-07-15T12:00:00.000Z", "2027-07-15T12:00"],
  ],
} as const;

export const CERTIFIED_PRAYER_TIMEZONES = Object.freeze(
  Object.keys(CERTIFIED_PRAYER_TIMEZONE_RULES),
);

type CertifiedPrayerTimezone = keyof typeof CERTIFIED_PRAYER_TIMEZONE_RULES;

function formatProbe(instant: string, timezone: string): string {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(new Date(instant))
      .map((part) => [part.type, part.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

export function isCertifiedPrayerTimezone(value: string): value is CertifiedPrayerTimezone {
  return Object.prototype.hasOwnProperty.call(CERTIFIED_PRAYER_TIMEZONE_RULES, value);
}

export function hasCertifiedPrayerTimezoneRules(value: string): boolean {
  if (!isCertifiedPrayerTimezone(value)) return false;
  try {
    return CERTIFIED_PRAYER_TIMEZONE_RULES[value].every(
      ([instant, expected]) => formatProbe(instant, value) === expected,
    );
  } catch {
    return false;
  }
}
