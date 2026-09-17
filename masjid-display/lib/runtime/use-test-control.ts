"use client";

export type TestControlScenario =
  | "normal"
  | "prayer_approaching"
  | "prayer_time_now"
  | "waiting_for_iqama"
  | "iqama_now"
  | "prayer_in_progress"
  | "friday_first_countdown"
  | "friday_next_countdown"
  | "jumuah_now"
  | "urgent"
  | "special_display"
  | "event"
  | "campaign"
  | "azkar"
  | "offline"
  | "stale_prayer_data"
  | "missing_settings"
  | "long_bilingual";

export interface TestControlPayload {
  scenario: TestControlScenario;
  id: string;
  prayer?: "fajr" | "dhuhr" | "asr" | "maghrib" | "isha";
  targetAt?: string;
  [key: string]: unknown;
}

export interface ActiveTestControl {
  active: true;
  scenario: TestControlScenario;
  startedAt: string;
  expiresAt: string;
  publicAppUrl: string;
  payload: TestControlPayload;
}

export interface InactiveTestControl {
  active: false;
}

export type TestControlState = ActiveTestControl | InactiveTestControl;

export function useTestControl(
  _logicalNow: Date,
  _observeServerDate?: (deviceNowMs: number, serverDateHeader: string) => void,
): TestControlState {
  return { active: false };
}
