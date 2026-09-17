"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { activeDisplayContent, type ActiveContent } from "../content-eligibility";
import type { MasjidDisplayFeedV1 } from "../feed-types";
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

function syntheticState(payload: TestControlPayload): DisplayStateResolution {
  const stale = payload.scenario === "stale_prayer_data";
  const missing = payload.scenario === "missing_settings";
  return {
    kind: testStateKind(payload.scenario),
    prayer: payload.prayer ?? null,
    degraded: stale || missing,
    degradedReason: stale
      ? "SCHEDULE_COVERAGE_MISSING"
      : missing
        ? "MISSING_IQAMA_DELAY"
        : null,
  };
}

export function useDisplayRuntime(): DisplayRuntimeViewModel {
  const initialLkg = useMemo(() => loadLkg(), []);
  const clock = useMemo(() => createLogicalClock(), []);
  const etagRef = useRef<string | null>(initialLkg?.etag ?? null);
  const feedRef = useRef<MasjidDisplayFeedV1 | null>(initialLkg?.snapshot ?? null);

  const [feed, setFeed] = useState<MasjidDisplayFeedV1 | null>(initialLkg?.snapshot ?? null);
  const [logicalNow, setLogicalNow] = useState(() => clock.now(Date.now()));
  const [networkAvailable, setNetworkAvailable] = useState(false);
  const [usingLkg, setUsingLkg] = useState(Boolean(initialLkg));

  const observeServerDate = useCallback(
    (deviceNowMs: number, serverDateHeader: string) => {
      clock.observeServerDate(deviceNowMs, serverDateHeader);
      setLogicalNow(clock.now(deviceNowMs));
    },
    [clock],
  );

  const refreshProduction = useCallback(async () => {
    const deviceNowMs = Date.now();
    const headers = new Headers();
    if (etagRef.current) headers.set("if-none-match", etagRef.current);

    try {
      const response = await fetch("/api/display-feed", { headers, cache: "no-store" });
      const serverDate = response.headers.get("date");
      if (serverDate && (response.ok || response.status === 304)) {
        observeServerDate(deviceNowMs, serverDate);
      }

      if (response.status === 304) {
        setNetworkAvailable(true);
        setUsingLkg(false);
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
      } catch {
        return;
      }

      const nextEtag = response.headers.get("etag");
      const receivedAt = clock.now(deviceNowMs).toISOString();
      replaceLkg(nextFeed, nextEtag, receivedAt);
      etagRef.current = nextEtag;
      feedRef.current = nextFeed;
      setFeed(nextFeed);
      setUsingLkg(false);
    } catch {
      setNetworkAvailable(false);
      if (feedRef.current) setUsingLkg(true);
    }
  }, [clock, observeServerDate]);

  useEffect(() => {
    let disposed = false;
    queueMicrotask(() => {
      if (!disposed) void refreshProduction();
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
    return {
      feed,
      logicalNow,
      state: syntheticState(testControl.payload),
      content: null,
      normalSlide: null,
      urgent: [],
      networkAvailable,
      usingLkg,
      prayerScheduleStale: testControl.payload.scenario === "stale_prayer_data",
      testMode: true,
      testPayload: testControl.payload,
      publicAppUrl: testControl.publicAppUrl,
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
  };
}
