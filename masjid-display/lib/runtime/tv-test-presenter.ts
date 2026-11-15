import type { DisplayPrayerName, MasjidDisplayFeedV1 } from "../feed-types";
import { activeDisplayContent, type ActiveContent } from "../content-eligibility";
import { resolveNormalSlide, type NormalSlide, type NormalSlideKind } from "../scheduler";
import { resolveDisplayState } from "../state/resolve-display-state";
import { IQAMA_ANNOUNCEMENT_MS, prayerBlackoutEndMs } from "../state/prayer-lifecycle";
import { isFridayIso, localDateIso, zonedDateTime } from "../time";
import type { DisplayRuntimeViewModel } from "./use-display-runtime";

export const TV_TEST_MAX_MS = 180_000;

const DAILY = [
  "PRAYER_APPROACHING", "PRAYER_TIME_NOW", "WAITING_FOR_IQAMA",
  "IQAMA_NOW", "PRAYER_IN_PROGRESS", "POST_PRAYER_AZKAR",
] as const;
const OTHER = [
  "FRIDAY_MODE", "JUMUAH_NOW", "NORMAL", "NEXT_PRAYER",
  "AZKAR", "ANNOUNCEMENT", "SPECIAL", "EVENT", "CAMPAIGN",
  "MAGHRIB_PROGRAM",
] as const;
const PRAYERS = ["fajr", "dhuhr", "asr", "maghrib", "isha"] as const;
type Scenario = typeof DAILY[number] | typeof OTHER[number];
type Prayer = typeof PRAYERS[number];

export interface TvTestCommand {
  scenario: Scenario;
  prayer: Prayer | null;
  startedAt: string;
  expiresAt: string;
}

export function parseTvTestStatus(payload: unknown, now: Date): TvTestCommand | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
  const response = payload as Record<string, unknown>;
  if (response.active !== true || !response.command || typeof response.command !== "object" ||
      Array.isArray(response.command)) return null;
  const raw = response.command as Record<string, unknown>;
  const scenario = raw.scenario;
  if (typeof scenario !== "string" ||
      ![...DAILY, ...OTHER].some((kind) => kind === scenario)) return null;
  const requiresPrayer = DAILY.some((kind) => kind === scenario);
  const prayer = raw.prayer;
  if (requiresPrayer && (typeof prayer !== "string" || !PRAYERS.some((name) => name === prayer))) return null;
  if (!requiresPrayer && prayer !== null) return null;
  if (typeof raw.startedAt !== "string" || typeof raw.expiresAt !== "string") return null;
  const started = Date.parse(raw.startedAt);
  const expires = Date.parse(raw.expiresAt);
  const nowMs = now.getTime();
  if (![started, expires, nowMs].every(Number.isFinite)) return null;
  if (expires <= started || expires - started > TV_TEST_MAX_MS ||
      nowMs < started || nowMs >= expires) return null;
  return {
    scenario: scenario as Scenario,
    prayer: requiresPrayer ? prayer as Prayer : null,
    startedAt: raw.startedAt,
    expiresAt: raw.expiresAt,
  };
}

function nearestNonFridayDay(feed: MasjidDisplayFeedV1, now: Date, prayer: DisplayPrayerName) {
  const today = localDateIso(now, feed.timezone);
  return feed.prayers.schedule
    .find((day) => day.date >= today && !(prayer === "dhuhr" && isFridayIso(day.date))) ?? null;
}

function nearestFridayDay(feed: MasjidDisplayFeedV1, now: Date) {
  const today = localDateIso(now, feed.timezone);
  return feed.prayers.schedule.find((day) => day.date >= today && isFridayIso(day.date)) ?? null;
}

function stageInstant(
  scenario: Scenario,
  prayer: Prayer | null,
  feed: MasjidDisplayFeedV1,
  now: Date,
): number | null {
  const MINUTE = 60_000;
  if (scenario === "FRIDAY_MODE" || scenario === "JUMUAH_NOW") {
    const friday = nearestFridayDay(feed, now);
    if (!friday) return null;
    const service = zonedDateTime(friday.date, friday.dhuhr, feed.timezone).getTime();
    return service + (scenario === "FRIDAY_MODE" ? -2 * MINUTE : 1_000);
  }

  if (!prayer) return null;
  const day = nearestNonFridayDay(feed, now, prayer);
  if (!day) return null;

  const adhan = zonedDateTime(day.date, day[prayer], feed.timezone).getTime();
  const delay = feed.prayers.iqamaDelays[prayer];
  const duration = feed.displaySettings.prayerDurations[prayer];
  if (!Number.isFinite(delay) || !Number.isFinite(duration)) return null;
  const iqama = adhan + delay * MINUTE;

  switch (scenario) {
    case "PRAYER_APPROACHING": return adhan - 2 * MINUTE;
    case "PRAYER_TIME_NOW": return adhan + 1_000;
    case "WAITING_FOR_IQAMA": return iqama - 90_000;
    case "IQAMA_NOW": return iqama + 1_000;
    case "PRAYER_IN_PROGRESS": return iqama + IQAMA_ANNOUNCEMENT_MS + 1_000;
    case "POST_PRAYER_AZKAR": return prayerBlackoutEndMs(prayer, iqama) + 15_000;
    default: return null;
  }
}

/**
 * Rehearsal buttons should show real published Feed content even if that item
 * is scheduled for another hour. This is a presentation-only selection:
 * production content eligibility and the Feed are never modified.
 */
function previewFamilyContent(
  feed: MasjidDisplayFeedV1,
  content: ActiveContent,
  scenario: Scenario,
): ActiveContent {
  switch (scenario) {
    case "AZKAR": {
      const selected = new Set(feed.displaySettings.azkarPlaylistIds);
      return {
        ...content,
        azkar: feed.azkar
          .filter((item) => selected.has(item.id) &&
            ["Morning", "Evening", "Friday"].includes(item.category))
          .sort((a, b) => a.sortOrder - b.sortOrder),
      };
    }
    case "ANNOUNCEMENT":
      return { ...content, announcements: feed.announcements.filter((item) =>
        !item.isUrgent && item.displayStyle === "normal") };
    case "SPECIAL":
      return { ...content, specialAnnouncements: feed.announcements.filter((item) =>
        !item.isUrgent && item.displayStyle === "special") };
    case "EVENT":
      return { ...content, events: feed.events };
    case "CAMPAIGN":
      return { ...content, campaigns: feed.campaigns };
    case "MAGHRIB_PROGRAM":
      return { ...content, maghribPrograms: feed.prayers.schedule.filter((day) =>
        day.maghribProgram?.enabled) };
    default:
      return content;
  }
}

function selectedNormalContent(kind: Scenario, vm: DisplayRuntimeViewModel): NormalSlide | null {
  const active = vm.content;
  if (!active) return null;
  const first = (items: { id: string }[]) => items[0]?.id ?? null;
  switch (kind) {
    case "NEXT_PRAYER": return { kind: "NEXT_PRAYER", itemId: null };
    case "AZKAR": return active.azkar[0] ? { kind: "AZKAR", itemId: active.azkar[0].id } : null;
    case "ANNOUNCEMENT": return { kind: "ANNOUNCEMENT", itemId: first(active.announcements) };
    case "SPECIAL": return { kind: "SPECIAL", itemId: first(active.specialAnnouncements) };
    case "EVENT": return { kind: "EVENT", itemId: first(active.events) };
    case "CAMPAIGN": return { kind: "CAMPAIGN", itemId: first(active.campaigns) };
    case "MAGHRIB_PROGRAM": return { kind: "MAGHRIB_PROGRAM", itemId: active.maghribPrograms[0] ? `maghrib-program:${active.maghribPrograms[0].date}` : null };
    default: return null;
  }
}

export function applyTvTestCommand(
  vm: DisplayRuntimeViewModel,
  command: TvTestCommand | null,
): DisplayRuntimeViewModel {
  if (!vm.feed || !command) return vm;

  // Independently enforce the absolute deadline, even if status polling fails.
  const fresh = parseTvTestStatus({ active: true, command }, vm.logicalNow);
  if (!fresh) return vm;
  const now = vm.logicalNow;
  const feed = vm.feed;
  const dailyOrFriday = DAILY.some((kind) => kind === command.scenario) ||
    command.scenario === "FRIDAY_MODE" || command.scenario === "JUMUAH_NOW";

  if (dailyOrFriday) {
    const anchor = stageInstant(command.scenario, command.prayer, feed, now);
    if (anchor === null) return vm;
    // Only the starting phase must match the requested case; after that,
    // allow the real state machine to progress naturally (countdown -> Adhan).
    const initial = resolveDisplayState(feed, new Date(anchor));
    if (initial.kind !== command.scenario) {
      return {
        ...vm,
        tvTestUnavailableReason: `Cannot simulate ${command.scenario} for ${command.prayer ?? "Friday"} from this Feed.`,
      };
    }
    const elapsed = Math.max(0, now.getTime() - Date.parse(command.startedAt));
    const simulatedNow = new Date(anchor + elapsed);
    const state = resolveDisplayState(feed, simulatedNow);
    const content = activeDisplayContent(feed, simulatedNow);
    return {
      ...vm,
      logicalNow: simulatedNow,
      state,
      content,
      urgent: content.urgentAnnouncements,
      prayerScheduleStale: content.prayerScheduleStale,
      normalSlide: null,
    };
  }

  const content = activeDisplayContent(feed, now);
  const normalState = { kind: "NORMAL" as const, prayer: null, degraded: false, degradedReason: null };
  const testVm: DisplayRuntimeViewModel = { ...vm, state: normalState, content, urgent: [], prayerScheduleStale: content.prayerScheduleStale };

  if (command.scenario === "NORMAL") {
    return {
      ...testVm,
      normalSlide: resolveNormalSlide(content, now, {
        epochMs: Date.parse(feed.generatedAt), revision: feed.snapshotRevision,
      }, true),
    };
  }
  const previewContent = previewFamilyContent(feed, content, command.scenario);
  const previewVm = { ...testVm, content: previewContent };
  const slide = selectedNormalContent(command.scenario, previewVm);
  const kind = command.scenario as NormalSlideKind;
  if (!slide || (slide.itemId === null && kind !== "NEXT_PRAYER")) {
    return {
      ...previewVm,
      normalSlide: null,
      tvTestUnavailableReason: "No eligible published content for " + command.scenario,
    };
  }
  return { ...previewVm, normalSlide: slide };
}
