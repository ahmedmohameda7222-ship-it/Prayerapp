"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { activeDisplayContent, type ActiveContent } from "../content-eligibility";
import type {
  DisplayAnnouncementDto,
  DisplayAzkarDto,
  DisplayCampaignDto,
  DisplayEventDto,
  MasjidDisplayFeedV1,
} from "../feed-types";
import { loadLkg, replaceLkg } from "../lkg";
import { createLogicalClock } from "../logical-clock";
import { resolveNormalSlide, type NormalSlide } from "../scheduler";
import {
  resolveDisplayState,
  type DisplayStateKind,
  type DisplayStateResolution,
} from "../state/resolve-display-state";
import { validateFeedV1 } from "../validate-feed";
import { useTestControl, type TestControlPayload, type TestControlScenario } from "./use-test-control";

export interface DisplayRuntimeDiagnostics {
  lastAttemptAt: string | null;
  lastSyncAt: string | null;
  clockOffsetMs: number;
  validationError: string | null;
}

export interface DisplayRuntimeViewModel {
  feed: MasjidDisplayFeedV1 | null;
  logicalNow: Date;
  state: DisplayStateResolution | null;
  content: ActiveContent | null;
  normalSlide: NormalSlide | null;
  urgent: MasjidDisplayFeedV1["announcements"];
  networkAvailable: boolean;
  usingLkg: boolean;
  prayerScheduleStale: boolean;
  testMode: boolean;
  testPayload: TestControlPayload | null;
  publicAppUrl: string | null;
  diagnostics?: DisplayRuntimeDiagnostics;
}

function testStateKind(scenario: TestControlScenario): DisplayStateKind {
  switch (scenario) {
    case "prayer_approaching":
      return "PRAYER_APPROACHING";
    case "prayer_time_now":
      return "PRAYER_TIME_NOW";
    case "waiting_for_iqama":
      return "WAITING_FOR_IQAMA";
    case "iqama_now":
      return "IQAMA_NOW";
    case "prayer_in_progress":
      return "PRAYER_IN_PROGRESS";
    case "friday_first_countdown":
    case "friday_next_countdown":
      return "FRIDAY_MODE";
    case "jumuah_now":
      return "JUMUAH_NOW";
    default:
      return "NORMAL";
  }
}

function syntheticJumuahServiceIndex(payload: TestControlPayload): number | undefined {
  const explicit = payload.serviceIndex;
  if (typeof explicit === "number" && Number.isInteger(explicit) && explicit >= 0) {
    return explicit;
  }
  if (payload.scenario === "friday_first_countdown") return 0;
  if (payload.scenario === "friday_next_countdown") return 1;
  if (payload.scenario === "jumuah_now") return 0;
  return undefined;
}

function syntheticState(payload: TestControlPayload): DisplayStateResolution {
  const kind = testStateKind(payload.scenario);
  const stale = payload.scenario === "stale_prayer_data";
  const missing = payload.scenario === "missing_settings";
  const serviceIndex = syntheticJumuahServiceIndex(payload);
  return {
    kind,
    prayer: payload.prayer ?? null,
    degraded: stale || missing,
    degradedReason: stale
      ? "SCHEDULE_COVERAGE_MISSING"
      : missing
        ? "MISSING_IQAMA_DELAY"
        : null,
    ...(serviceIndex === undefined
      ? {}
      : {
          serviceIndex,
          serviceId: `synthetic:jumuah:${serviceIndex}`,
        }),
  };
}

function payloadText(payload: TestControlPayload, key: string, fallback: string) {
  const value = payload[key];
  return typeof value === "string" && value.trim() ? value : fallback;
}

function syntheticAnnouncement(
  payload: TestControlPayload,
  options: { urgent?: boolean; style?: "normal" | "special" } = {},
): DisplayAnnouncementDto {
  return {
    id: payload.id,
    titleAr: payloadText(payload, "titleAr", "اختبار شاشة المسجد"),
    titleDe: payloadText(payload, "titleDe", "Moschee-Display-Test"),
    messageAr: payloadText(payload, "messageAr", "محتوى تجريبي فقط"),
    messageDe: payloadText(payload, "messageDe", "Nur synthetischer Testinhalt"),
    isUrgent: Boolean(options.urgent),
    displayStyle: options.style ?? "normal",
    displayFrom: null,
    displayUntil: null,
  };
}

function emptySyntheticContent(prayerScheduleStale = false): ActiveContent {
  return {
    prayerDay: null,
    prayerScheduleStale,
    azkar: [],
    announcements: [],
    specialAnnouncements: [],
    urgentAnnouncements: [],
    events: [],
    campaigns: [],
    maghribPrograms: [],
  };
}

type SyntheticTestView = {
  content: ActiveContent | null;
  normalSlide: NormalSlide | null;
  urgent: MasjidDisplayFeedV1["announcements"];
  networkAvailable?: boolean;
  usingLkg?: boolean;
};

function syntheticTestView(
  payload: TestControlPayload,
  logicalNow: Date,
): SyntheticTestView {
  const content = emptySyntheticContent(payload.scenario === "stale_prayer_data");

  switch (payload.scenario) {
    case "normal":
    case "long_bilingual":
    case "stale_prayer_data":
    case "missing_settings": {
      const item = syntheticAnnouncement(payload);
      content.announcements = [item];
      return {
        content,
        normalSlide: { kind: "ANNOUNCEMENT", itemId: item.id },
        urgent: [],
      };
    }
    case "offline": {
      const item = syntheticAnnouncement(payload);
      content.announcements = [item];
      return {
        content,
        normalSlide: { kind: "ANNOUNCEMENT", itemId: item.id },
        urgent: [],
        networkAvailable: false,
        usingLkg: true,
      };
    }
    case "urgent": {
      const item = syntheticAnnouncement(payload, { urgent: true });
      content.announcements = [item];
      content.urgentAnnouncements = [item];
      return {
        content,
        normalSlide: { kind: "ANNOUNCEMENT", itemId: item.id },
        urgent: [item],
      };
    }
    case "special_display": {
      const item = syntheticAnnouncement(payload, { style: "special" });
      content.specialAnnouncements = [item];
      return {
        content,
        normalSlide: { kind: "SPECIAL", itemId: item.id },
        urgent: [],
      };
    }
    case "event": {
      const startsAtValue = payloadText(payload, "startsAt", logicalNow.toISOString());
      const startsAt = new Date(startsAtValue);
      const safeStartsAt = Number.isFinite(startsAt.getTime()) ? startsAt : logicalNow;
      const item: DisplayEventDto = {
        id: payload.id,
        titleAr: payloadText(payload, "titleAr", "فعالية تجريبية"),
        titleDe: payloadText(payload, "titleDe", "Testveranstaltung"),
        descriptionAr: payloadText(payload, "descriptionAr", "محتوى تجريبي فقط"),
        descriptionDe: payloadText(payload, "descriptionDe", "Nur synthetischer Testinhalt"),
        locationAr: payloadText(payload, "locationAr", "قاعة الاختبار"),
        locationDe: payloadText(payload, "locationDe", "Testraum"),
        date: safeStartsAt.toISOString().slice(0, 10),
        startTime: safeStartsAt.toISOString().slice(11, 16),
        endTime: null,
        type: "test",
      };
      content.events = [item];
      return {
        content,
        normalSlide: { kind: "EVENT", itemId: item.id },
        urgent: [],
      };
    }
    case "campaign":
    case "campaign_without_qr": {
      const item: DisplayCampaignDto = {
        id: payload.id,
        titleAr: payloadText(payload, "titleAr", "حملة تجريبية"),
        titleDe: payloadText(payload, "titleDe", "Testkampagne"),
        descriptionAr: payloadText(payload, "descriptionAr", "محتوى تجريبي فقط"),
        descriptionDe: payloadText(payload, "descriptionDe", "Nur synthetischer Testinhalt"),
        targetAmount: 100,
        collectedAmount: 25,
        startDate: logicalNow.toISOString().slice(0, 10),
        endDate: null,
        donationUrl:
          typeof payload.donationUrl === "string" && payload.donationUrl.trim()
            ? payload.donationUrl
            : null,
        isFeatured: true,
      };
      content.campaigns = [item];
      return {
        content,
        normalSlide: { kind: "CAMPAIGN", itemId: item.id },
        urgent: [],
      };
    }
    case "azkar": {
      const item: DisplayAzkarDto = {
        id: payloadText(payload, "azkarId", payload.id),
        category: "Morning",
        arabicText: payloadText(payload, "arabicText", "سُبْحَانَ اللَّهِ"),
        translationDe: payloadText(payload, "germanText", "Gepriesen sei Allah"),
        source: "Test Mode",
        repeatCount: 1,
        sortOrder: 0,
      };
      content.azkar = [item];
      return {
        content,
        normalSlide: { kind: "AZKAR", itemId: item.id },
        urgent: [],
      };
    }
    default:
      return {
        content: null,
        normalSlide: null,
        urgent: [],
      };
  }
}

export function useDisplayRuntime(): DisplayRuntimeViewModel {
  const clock = useMemo(() => createLogicalClock(), []);
  const etagRef = useRef<string | null>(null);
  const feedRef = useRef<MasjidDisplayFeedV1 | null>(null);
  const refreshGenerationRef = useRef(0);

  const [feed, setFeed] = useState<MasjidDisplayFeedV1 | null>(null);
  const [logicalNow, setLogicalNow] = useState(() => clock.now(Date.now()));
  const [networkAvailable, setNetworkAvailable] = useState(false);
  const [usingLkg, setUsingLkg] = useState(false);
  const [diagnostics, setDiagnostics] = useState<DisplayRuntimeDiagnostics>({
    lastAttemptAt: null,
    lastSyncAt: null,
    clockOffsetMs: 0,
    validationError: null,
  });

  const observeServerDate = useCallback(
    (
      requestStartedAtMs: number,
      responseReceivedAtMs: number,
      serverDateHeader: string,
    ) => {
      const observation = clock.observeServerDate(
        requestStartedAtMs,
        responseReceivedAtMs,
        serverDateHeader,
      );
      setLogicalNow(clock.now(responseReceivedAtMs));
      setDiagnostics((current) => ({
        ...current,
        clockOffsetMs: observation.offsetMs,
      }));
      return observation;
    },
    [clock],
  );

  const refreshProduction = useCallback(async () => {
    const generation = ++refreshGenerationRef.current;
    const requestStartedAtMs = Date.now();
    setDiagnostics((current) => ({
      ...current,
      lastAttemptAt: new Date(requestStartedAtMs).toISOString(),
    }));
    const headers = new Headers();
    if (etagRef.current) headers.set("if-none-match", etagRef.current);

    try {
      const response = await fetch("/api/display-feed", { headers, cache: "no-store" });
      const responseReceivedAtMs = Date.now();
      if (generation !== refreshGenerationRef.current) return;

      const serverDate = response.headers.get("date");
      if (serverDate && (response.ok || response.status === 304)) {
        observeServerDate(
          requestStartedAtMs,
          responseReceivedAtMs,
          serverDate,
        );
      }

      if (response.status === 304) {
        const syncedAt = clock.now(responseReceivedAtMs).toISOString();
        setNetworkAvailable(true);
        setUsingLkg(false);
        setDiagnostics((current) => ({
          ...current,
          lastSyncAt: syncedAt,
          validationError: null,
        }));
        return;
      }
      if (!response.ok) {
        setNetworkAvailable(false);
        if (feedRef.current) setUsingLkg(true);
        return;
      }

      setNetworkAvailable(true);
      let nextFeed: MasjidDisplayFeedV1;
      try {
        nextFeed = validateFeedV1(await response.json());
        if (generation !== refreshGenerationRef.current) return;
      } catch {
        if (feedRef.current) setUsingLkg(true);
        setDiagnostics((current) => ({
          ...current,
          validationError: "Feed validation failed",
        }));
        return;
      }

      const nextEtag = response.headers.get("etag");
      const receivedAt = clock.now(responseReceivedAtMs).toISOString();
      replaceLkg(nextFeed, nextEtag, receivedAt);
      etagRef.current = nextEtag;
      feedRef.current = nextFeed;
      setFeed(nextFeed);
      setUsingLkg(false);
      setDiagnostics((current) => ({
        ...current,
        lastSyncAt: receivedAt,
        validationError: null,
      }));
    } catch {
      if (generation !== refreshGenerationRef.current) return;
      setNetworkAvailable(false);
      if (feedRef.current) setUsingLkg(true);
    }
  }, [clock, observeServerDate]);

  useEffect(() => {
    let disposed = false;
    queueMicrotask(() => {
      if (disposed) return;

      const cached = loadLkg();
      if (cached) {
        etagRef.current = cached.etag;
        feedRef.current = cached.snapshot;
        setFeed(cached.snapshot);
        setUsingLkg(true);
        setDiagnostics((current) => ({
          ...current,
          lastSyncAt: cached.receivedAt,
        }));
      }

      void refreshProduction();
    });

    const poll = window.setInterval(() => void refreshProduction(), 60_000);
    const tick = window.setInterval(() => {
      setLogicalNow(clock.now(Date.now()));
    }, 1_000);

    const wake = () => {
      setLogicalNow(clock.now(Date.now()));
      void refreshProduction();
    };
    const visible = () => {
      if (document.visibilityState === "visible") wake();
    };

    window.addEventListener("online", wake);
    document.addEventListener("visibilitychange", visible);
    return () => {
      disposed = true;
      window.clearInterval(poll);
      window.clearInterval(tick);
      window.removeEventListener("online", wake);
      document.removeEventListener("visibilitychange", visible);
    };
  }, [clock, refreshProduction]);

  const testControl = useTestControl(logicalNow, observeServerDate);

  const productionContent = useMemo(
    () => (feed ? activeDisplayContent(feed, logicalNow) : null),
    [feed, logicalNow],
  );
  const productionState = useMemo(
    () => (feed ? resolveDisplayState(feed, logicalNow) : null),
    [feed, logicalNow],
  );
  const productionSlide = useMemo(() => {
    if (!feed || !productionContent || productionState?.kind !== "NORMAL") return null;
    return resolveNormalSlide(productionContent, logicalNow, {
      epochMs: Date.parse(feed.generatedAt),
      revision: feed.snapshotRevision,
    });
  }, [feed, logicalNow, productionContent, productionState?.kind]);

  if (testControl.active) {
    const synthetic = syntheticTestView(testControl.payload, logicalNow);
    return {
      feed,
      logicalNow,
      state: syntheticState(testControl.payload),
      content: synthetic.content,
      normalSlide: synthetic.normalSlide,
      urgent: synthetic.urgent,
      networkAvailable: synthetic.networkAvailable ?? networkAvailable,
      usingLkg: synthetic.usingLkg ?? usingLkg,
      prayerScheduleStale: testControl.payload.scenario === "stale_prayer_data",
      testMode: true,
      testPayload: testControl.payload,
      publicAppUrl: testControl.publicAppUrl,
      diagnostics,
    };
  }

  return {
    feed,
    logicalNow,
    state: productionState,
    content: productionContent,
    normalSlide: productionSlide,
    urgent: productionContent?.urgentAnnouncements ?? [],
    networkAvailable,
    usingLkg,
    prayerScheduleStale: productionContent?.prayerScheduleStale ?? true,
    testMode: false,
    testPayload: null,
    publicAppUrl: feed?.mosque.publicAppUrl ?? null,
    diagnostics,
  };
}
