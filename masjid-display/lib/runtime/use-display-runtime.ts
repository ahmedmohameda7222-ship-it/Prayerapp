"use client";

import { useMemo } from "react";
import type { ActiveContent } from "../content-eligibility";
import type { MasjidDisplayFeedV1 } from "../feed-types";
import type { NormalSlide } from "../scheduler";
import type { DisplayStateResolution } from "../state/resolve-display-state";
import type { TestControlPayload } from "./use-test-control";

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

export function useDisplayRuntime(): DisplayRuntimeViewModel {
  return useMemo(
    () => ({
      feed: null,
      logicalNow: new Date(),
      state: null,
      content: null,
      normalSlide: null,
      urgent: [],
      networkAvailable: false,
      usingLkg: false,
      prayerScheduleStale: true,
      testMode: false,
      testPayload: null,
      publicAppUrl: null,
    }),
    [],
  );
}
