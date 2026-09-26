"use client";

import { useEffect, useRef, useState } from "react";

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
  | "campaign_without_qr"
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
  publicAppUrl: string | null;
  payload: TestControlPayload;
}

export interface InactiveTestControl {
  active: false;
}

export type TestControlState = ActiveTestControl | InactiveTestControl;

const SCENARIOS = new Set<TestControlScenario>([
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
  "campaign_without_qr",
  "azkar",
  "offline",
  "stale_prayer_data",
  "missing_settings",
  "long_bilingual",
]);

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function isTimestamp(value: unknown): value is string {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}

function parseTestControl(value: unknown): TestControlState | null {
  const record = asRecord(value);
  if (!record || typeof record.active !== "boolean") return null;
  if (record.active === false) return { active: false };

  const payload = asRecord(record.payload);
  if (
    typeof record.scenario !== "string" ||
    !SCENARIOS.has(record.scenario as TestControlScenario) ||
    !isTimestamp(record.startedAt) ||
    !isTimestamp(record.expiresAt) ||
    (record.publicAppUrl !== null && typeof record.publicAppUrl !== "string") ||
    !payload ||
    typeof payload.id !== "string" ||
    typeof payload.scenario !== "string" ||
    payload.scenario !== record.scenario ||
    !SCENARIOS.has(payload.scenario as TestControlScenario)
  ) {
    return null;
  }

  return {
    active: true,
    scenario: record.scenario as TestControlScenario,
    startedAt: record.startedAt,
    expiresAt: record.expiresAt,
    publicAppUrl: record.publicAppUrl as string | null,
    payload: payload as TestControlPayload,
  };
}

export function useTestControl(
  logicalNow: Date,
  observeServerDate?: (
    requestStartedAtMs: number,
    responseReceivedAtMs: number,
    serverDateHeader: string,
  ) => void,
): TestControlState {
  const [remoteState, setRemoteState] = useState<TestControlState>({ active: false });
  const requestGenerationRef = useRef(0);
  const latestAcceptedGenerationRef = useRef(0);

  useEffect(() => {
    let cancelled = false;

    const poll = async () => {
      const generation = ++requestGenerationRef.current;
      const requestStartedAtMs = Date.now();
      try {
        const response = await fetch("/api/test-control", { cache: "no-store" });
        const responseReceivedAtMs = Date.now();
        if (cancelled || !response.ok) return;

        const parsed = parseTestControl(await response.json());
        if (
          cancelled ||
          !parsed ||
          generation < latestAcceptedGenerationRef.current
        ) {
          return;
        }

        latestAcceptedGenerationRef.current = generation;
        const serverDate = response.headers.get("date");
        if (serverDate) {
          observeServerDate?.(
            requestStartedAtMs,
            responseReceivedAtMs,
            serverDate,
          );
        }
        setRemoteState(parsed);
      } catch {
        // A transient Test Control failure does not discard an active override;
        // local expiry below still prevents stale test state from persisting.
      }
    };

    void poll();
    const interval = window.setInterval(() => void poll(), 2_000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [observeServerDate]);

  if (
    remoteState.active &&
    Date.parse(remoteState.expiresAt) <= logicalNow.getTime()
  ) {
    return { active: false };
  }
  return remoteState;
}
