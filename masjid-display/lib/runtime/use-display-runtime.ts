"use client";

import { resolveDisplayState, type DisplayStateResolution } from "../state/resolve-display-state";
import { validateFeedV1 } from "../validate-feed";

export interface DisplayRuntimeDiagnostics {
  lastAttemptAt: string | null;
  lastSyncAt: string | null;
  clockOffsetMs: number;
  validationError: string | null;
}

export function nextClockTickDelay(deviceNowMs: number): number {
  const remainder = ((deviceNowMs % 1_000) + 1_000) % 1_000;
  return remainder === 0 ? 1_000 : 1_000 - remainder;
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
  publicAppUrl: string | null;
  diagnostics?: DisplayRuntimeDiagnostics;
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

    // Date-to-day transitions are resolved locally; the server snapshot needs only
  // periodic synchronization, plus immediate wake/reconnect refresh.
  const poll = window.setInterval(() => void refreshProduction(), 120_000);
    let tickTimer: number | null = null;
    const scheduleTick = () => {
      tickTimer = window.setTimeout(() => {
        setLogicalNow(clock.now(Date.now()));
        scheduleTick();
      }, nextClockTickDelay(Date.now()));
    };
    scheduleTick();

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
      if (tickTimer !== null) window.clearTimeout(tickTimer);
      window.removeEventListener("online", wake);
      document.removeEventListener("visibilitychange", visible);
    };
  }, [clock, refreshProduction]);


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
    publicAppUrl: feed?.mosque.publicAppUrl ?? null,
    diagnostics,
  };
}
