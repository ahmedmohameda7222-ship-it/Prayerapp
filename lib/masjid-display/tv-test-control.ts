export const TV_TEST_MAX_DURATION_MS = 180_000;

export const TV_TEST_DAILY_SCENARIOS = [
  "PRAYER_APPROACHING",
  "PRAYER_TIME_NOW",
  "WAITING_FOR_IQAMA",
  "IQAMA_NOW",
  "PRAYER_IN_PROGRESS",
  "POST_PRAYER_AZKAR",
] as const;

export const TV_TEST_OTHER_SCENARIOS = [
  "FRIDAY_MODE",
  "JUMUAH_NOW",
  "NORMAL",
  "NEXT_PRAYER",
  "AZKAR",
  "ANNOUNCEMENT",
  "SPECIAL",
  "EVENT",
  "CAMPAIGN",
  "MAGHRIB_PROGRAM",
] as const;

export const TV_TEST_SCENARIOS = [
  ...TV_TEST_DAILY_SCENARIOS,
  ...TV_TEST_OTHER_SCENARIOS,
] as const;

export const TV_TEST_PRAYERS = ["fajr", "dhuhr", "asr", "maghrib", "isha"] as const;

export type TvTestScenario = typeof TV_TEST_SCENARIOS[number];
export type TvTestPrayer = typeof TV_TEST_PRAYERS[number];
export interface TvTestRequest {
  scenario: TvTestScenario;
  prayer: TvTestPrayer | null;
}
export interface TvTestCommand extends TvTestRequest {
  startedAt: string;
  expiresAt: string;
}

export function parseTvTestRequest(input: unknown): TvTestRequest {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("Invalid TV Test command");
  }
  const record = input as Record<string, unknown>;
  if (Object.keys(record).some((key) => key !== "scenario" && key !== "prayer")) {
    throw new Error("Unexpected TV Test field");
  }
  const scenario = record.scenario;
  if (typeof scenario !== "string" ||
      !TV_TEST_SCENARIOS.some((allowed) => allowed === scenario)) {
    throw new Error("Unknown TV Test scenario");
  }
  const prayer = record.prayer;
  const isDaily = TV_TEST_DAILY_SCENARIOS.some((allowed) => allowed === scenario);
  if (isDaily && (typeof prayer !== "string" ||
      !TV_TEST_PRAYERS.some((allowed) => allowed === prayer))) {
    throw new Error("This scenario requires a daily prayer");
  }
  if (!isDaily && prayer !== null) {
    throw new Error("This scenario does not accept a prayer");
  }
  return { scenario: scenario as TvTestScenario, prayer: isDaily ? prayer as TvTestPrayer : null };
}

/** Sanitized read-only public command, with strict 3-minute hard lifetime. */
export function activeTvTestFromRow(row: unknown, now = new Date()): TvTestCommand | null {
  if (!row || typeof row !== "object" || Array.isArray(row)) return null;
  const raw = row as Record<string, unknown>;
  try {
    const input = parseTvTestRequest({ scenario: raw.scenario, prayer: raw.prayer });
    if (typeof raw.started_at !== "string" || typeof raw.expires_at !== "string") return null;
    const started = Date.parse(raw.started_at);
    const expires = Date.parse(raw.expires_at);
    const time = now.getTime();
    if (![started, expires, time].every(Number.isFinite)) return null;
    if (expires <= started || expires - started > TV_TEST_MAX_DURATION_MS) return null;
    if (time < started || time >= expires) return null;
    return {
      ...input,
      startedAt: raw.started_at,
      expiresAt: raw.expires_at,
    };
  } catch {
    return null;
  }
}
