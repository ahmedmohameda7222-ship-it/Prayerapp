"use client";

import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import {
  classifyWebkitCompassAccuracy,
  isValidWebkitCompassHeading,
  isWithinLiveTilt,
  magneticToTrueHeading,
  standardAbsoluteHeadingFromAlpha,
  type HeadingSource,
} from "@/lib/qibla-heading";
import { getMagneticDeclination } from "@/lib/qibla-magnetic";
import {
  initialQiblaState,
  qiblaReducer,
  type LiveCompassBlockReason,
  type LocationSource,
  type QiblaState,
} from "@/lib/qibla-state";
import {
  calculateQiblaBearing,
  getCompassSector,
  smoothHeadingByTime,
  type CompassSector,
} from "@/lib/qibla-utils";

const SENSOR_TIMEOUT_MS = 5000;
const SEMANTIC_UPDATE_INTERVAL_MS = 100;

export interface QiblaCoordinates {
  latitude: number;
  longitude: number;
  accuracyMeters: number | null;
  source: LocationSource;
}

export interface ManualLocationResult {
  label: string;
  latitude: number;
  longitude: number;
}

export type QiblaLocationError = "denied" | "unavailable" | "timeout" | "unsupported" | "error";

interface WebkitOrientationEvent extends DeviceOrientationEvent {
  webkitCompassHeading?: number;
  webkitCompassAccuracy?: number;
}

type OrientationEventConstructor = typeof DeviceOrientationEvent & {
  requestPermission?: (absolute?: boolean) => Promise<"granted" | "denied">;
};

export interface QiblaController {
  state: QiblaState;
  coordinates: QiblaCoordinates | null;
  locationLabel: string | null;
  locationError: QiblaLocationError | null;
  headingSource: HeadingSource | null;
  headingAccuracyDegrees: number | null;
  directionSector: CompassSector | null;
  isSearchingLocation: boolean;
  manualSearchResults: ManualLocationResult[];
  manualSearchError: boolean;
  findQibla: () => void;
  enableLiveCompass: () => Promise<void>;
  searchManualLocation: (query: string) => Promise<void>;
  selectManualLocation: (result: ManualLocationResult) => void;
}

export function roundQiblaCoordinates(latitude: number, longitude: number) {
  return {
    latitude: Number(latitude.toFixed(3)),
    longitude: Number(longitude.toFixed(3)),
  };
}

export function isPortraitViewport(): boolean {
  if (typeof window === "undefined") return true;
  if (typeof window.matchMedia === "function") return window.matchMedia("(orientation: portrait)").matches;
  return window.innerHeight >= window.innerWidth;
}

export function useQiblaController(): QiblaController {
  const [state, dispatch] = useReducer(qiblaReducer, initialQiblaState);
  const [coordinates, setCoordinates] = useState<QiblaCoordinates | null>(null);
  const [locationLabel, setLocationLabel] = useState<string | null>(null);
  const [locationError, setLocationError] = useState<QiblaLocationError | null>(null);
  const [headingSource, setHeadingSource] = useState<HeadingSource | null>(null);
  const [headingAccuracyDegrees, setHeadingAccuracyDegrees] = useState<number | null>(null);
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);
  const [manualSearchResults, setManualSearchResults] = useState<ManualLocationResult[]>([]);
  const [manualSearchError, setManualSearchError] = useState(false);

  const mountedRef = useRef(false);
  const locationRequestRef = useRef(0);
  const coordinatesRef = useRef<QiblaCoordinates | null>(null);
  const declinationRef = useRef<number | null>(null);
  const declinationStatusRef = useRef<"idle" | "pending" | "ready" | "unavailable">("idle");
  const compassEnabledRef = useRef(false);
  const permissionGrantedRef = useRef(false);
  const permissionAttemptRef = useRef(0);
  const listenerCleanupRef = useRef<(() => void) | null>(null);
  const smoothedHeadingRef = useRef<number | null>(null);
  const lastHeadingAtRef = useRef<number | null>(null);
  const lastSemanticAtRef = useRef(0);
  const sensorTimeoutRef = useRef<number | null>(null);

  const clearSensorTimeout = useCallback(() => {
    if (sensorTimeoutRef.current !== null) {
      window.clearTimeout(sensorTimeoutRef.current);
      sensorTimeoutRef.current = null;
    }
  }, []);

  const detachSensors = useCallback(() => {
    clearSensorTimeout();
    listenerCleanupRef.current?.();
    listenerCleanupRef.current = null;
    smoothedHeadingRef.current = null;
    lastHeadingAtRef.current = null;
    lastSemanticAtRef.current = 0;
  }, [clearSensorTimeout]);

  const loadDeclination = useCallback(async (nextCoordinates: QiblaCoordinates, requestId: number) => {
    declinationStatusRef.current = "pending";
    declinationRef.current = null;
    const declination = await getMagneticDeclination(
      nextCoordinates.latitude,
      nextCoordinates.longitude,
      new Date(),
    );
    if (!mountedRef.current || requestId !== locationRequestRef.current) return;
    if (declination === null) {
      declinationStatusRef.current = "unavailable";
      return;
    }
    declinationRef.current = declination;
    declinationStatusRef.current = "ready";
  }, []);

  const fetchLocationLabel = useCallback(async (nextCoordinates: QiblaCoordinates, requestId: number) => {
    const coarse = roundQiblaCoordinates(nextCoordinates.latitude, nextCoordinates.longitude);
    const cacheKey = `qibla-location:${coarse.latitude}:${coarse.longitude}`;

    try {
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached) as { ok?: boolean; city?: string; country?: string; formatted?: string };
        if (mountedRef.current && requestId === locationRequestRef.current) {
          if (parsed.ok && parsed.city && parsed.country) setLocationLabel(`${parsed.city}, ${parsed.country}`);
          else if (parsed.ok && parsed.formatted) setLocationLabel(parsed.formatted);
        }
        return;
      }
    } catch {
      // Optional human-readable location labels never block Qibla.
    }

    try {
      const params = new URLSearchParams({ lat: String(coarse.latitude), lon: String(coarse.longitude) });
      const response = await fetch(`/api/reverse-geocode?${params.toString()}`);
      const data = (await response.json()) as { ok?: boolean; city?: string; country?: string; formatted?: string };
      try {
        sessionStorage.setItem(cacheKey, JSON.stringify(data));
      } catch {
        // Ignore optional cache failures.
      }
      if (!mountedRef.current || requestId !== locationRequestRef.current) return;
      if (data.ok && data.city && data.country) setLocationLabel(`${data.city}, ${data.country}`);
      else if (data.ok && data.formatted) setLocationLabel(data.formatted);
    } catch {
      // Reverse geocoding is never a prerequisite for bearing or live guidance.
    }
  }, []);

  const applyLocation = useCallback((nextCoordinates: QiblaCoordinates) => {
    const requestId = ++locationRequestRef.current;
    detachSensors();
    coordinatesRef.current = nextCoordinates;
    setCoordinates(nextCoordinates);
    setLocationLabel(null);
    setLocationError(null);
    setHeadingSource(null);
    setHeadingAccuracyDegrees(null);
    dispatch({
      type: "LOCATION_READY",
      bearing: calculateQiblaBearing(nextCoordinates.latitude, nextCoordinates.longitude),
      source: nextCoordinates.source,
    });
    void loadDeclination(nextCoordinates, requestId);
    void fetchLocationLabel(nextCoordinates, requestId);
  }, [detachSensors, fetchLocationLabel, loadDeclination]);

  const failLocation = useCallback((error: QiblaLocationError) => {
    ++locationRequestRef.current;
    compassEnabledRef.current = false;
    permissionGrantedRef.current = false;
    detachSensors();
    coordinatesRef.current = null;
    setCoordinates(null);
    setLocationLabel(null);
    setLocationError(error);
    setHeadingSource(null);
    setHeadingAccuracyDegrees(null);
    dispatch({ type: "LOCATION_ERROR" });
  }, [detachSensors]);

  const findQibla = useCallback(() => {
    if (!("geolocation" in navigator)) {
      failLocation("unsupported");
      return;
    }

    const requestId = ++locationRequestRef.current;
    detachSensors();
    compassEnabledRef.current = false;
    permissionGrantedRef.current = false;
    setLocationError(null);
    setLocationLabel(null);
    dispatch({ type: "LOCATE" });

    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (!mountedRef.current || requestId !== locationRequestRef.current) return;
        applyLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracyMeters: Number.isFinite(position.coords.accuracy) ? position.coords.accuracy : null,
          source: "gps",
        });
      },
      (error) => {
        if (!mountedRef.current || requestId !== locationRequestRef.current) return;
        if (error.code === error.PERMISSION_DENIED) failLocation("denied");
        else if (error.code === error.POSITION_UNAVAILABLE) failLocation("unavailable");
        else if (error.code === error.TIMEOUT) failLocation("timeout");
        else failLocation("error");
      },
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 0 },
    );
  }, [applyLocation, detachSensors, failLocation]);

  const publishTrustedHeading = useCallback((heading: number, source: HeadingSource, accuracy: number | null) => {
    const now = performance.now();
    const last = lastHeadingAtRef.current;
    const smoothed = smoothHeadingByTime(smoothedHeadingRef.current, heading, last === null ? 0 : now - last);
    lastHeadingAtRef.current = now;
    smoothedHeadingRef.current = smoothed;
    if (lastSemanticAtRef.current !== 0 && now - lastSemanticAtRef.current < SEMANTIC_UPDATE_INTERVAL_MS) return;
    lastSemanticAtRef.current = now || Number.EPSILON;
    clearSensorTimeout();
    setHeadingSource(source);
    setHeadingAccuracyDegrees(accuracy);
    dispatch({ type: "TRUSTED_HEADING", heading: smoothed });
  }, [clearSensorTimeout]);

  const blockCompass = useCallback((reason: LiveCompassBlockReason) => {
    if (!mountedRef.current) return;
    clearSensorTimeout();
    setHeadingSource(null);
    setHeadingAccuracyDegrees(null);
    dispatch({ type: "COMPASS_BLOCKED", reason });
  }, [clearSensorTimeout]);

  const attachSensors = useCallback(() => {
    if (!mountedRef.current || listenerCleanupRef.current || !coordinatesRef.current) return;

    const handleOrientation = (rawEvent: Event) => {
      if (!mountedRef.current || document.visibilityState === "hidden") return;
      if (!isPortraitViewport()) {
        blockCompass("landscape");
        return;
      }

      const event = rawEvent as WebkitOrientationEvent;
      const webkitValue = event.webkitCompassHeading;
      if (typeof webkitValue !== "undefined") {
        if (!isValidWebkitCompassHeading(webkitValue)) {
          blockCompass("invalid-heading");
          return;
        }
        const accuracy = classifyWebkitCompassAccuracy(event.webkitCompassAccuracy);
        if (accuracy === "calibration-required") {
          blockCompass("calibration-required");
          return;
        }
        if (accuracy !== "usable") {
          blockCompass("invalid-heading");
          return;
        }
        if (!isWithinLiveTilt(event.beta, event.gamma)) {
          blockCompass("tilted");
          return;
        }
        if (declinationStatusRef.current === "pending" || declinationStatusRef.current === "idle") return;
        if (declinationStatusRef.current !== "ready" || declinationRef.current === null) {
          blockCompass("magnetic-correction-unavailable");
          return;
        }
        publishTrustedHeading(
          magneticToTrueHeading(webkitValue, declinationRef.current),
          "webkit-magnetic",
          event.webkitCompassAccuracy as number,
        );
        return;
      }

      const isAbsolute = rawEvent.type === "deviceorientationabsolute" || event.absolute === true;
      if (isAbsolute) {
        const absoluteHeading = standardAbsoluteHeadingFromAlpha(event.alpha);
        if (absoluteHeading === null || !Number.isFinite(event.beta) || !Number.isFinite(event.gamma)) {
          blockCompass("invalid-heading");
          return;
        }
        if (!isWithinLiveTilt(event.beta, event.gamma)) {
          blockCompass("tilted");
          return;
        }
        publishTrustedHeading(absoluteHeading, "standard-absolute", null);
        return;
      }

      if (Number.isFinite(event.alpha)) blockCompass("relative-heading");
    };

    const handleCalibration = () => {
      blockCompass("calibration-required");
    };
    const handleOrientationChange = () => {
      if (!isPortraitViewport()) blockCompass("landscape");
    };

    window.addEventListener("deviceorientationabsolute", handleOrientation as EventListener);
    window.addEventListener("deviceorientation", handleOrientation as EventListener);
    window.addEventListener("compassneedscalibration", handleCalibration as EventListener);
    window.addEventListener("orientationchange", handleOrientationChange);
    sensorTimeoutRef.current = window.setTimeout(() => blockCompass("sensor-timeout"), SENSOR_TIMEOUT_MS);

    listenerCleanupRef.current = () => {
      window.removeEventListener("deviceorientationabsolute", handleOrientation as EventListener);
      window.removeEventListener("deviceorientation", handleOrientation as EventListener);
      window.removeEventListener("compassneedscalibration", handleCalibration as EventListener);
      window.removeEventListener("orientationchange", handleOrientationChange);
    };
  }, [blockCompass, clearSensorTimeout, publishTrustedHeading]);

  const enableLiveCompass = useCallback(async () => {
    if (!coordinatesRef.current) return;
    dispatch({ type: "REQUEST_COMPASS" });
    if (!("DeviceOrientationEvent" in window)) {
      blockCompass("unsupported");
      return;
    }

    const attempt = ++permissionAttemptRef.current;
    const OrientationEvent = window.DeviceOrientationEvent as OrientationEventConstructor;
    if (typeof OrientationEvent.requestPermission === "function") {
      try {
        const permissionPromise = OrientationEvent.requestPermission(true);
        const permission = await permissionPromise;
        if (!mountedRef.current || attempt !== permissionAttemptRef.current) return;
        if (permission !== "granted") {
          blockCompass("permission-denied");
          return;
        }
      } catch {
        if (mountedRef.current && attempt === permissionAttemptRef.current) blockCompass("permission-denied");
        return;
      }
    }

    if (!mountedRef.current || attempt !== permissionAttemptRef.current) return;
    compassEnabledRef.current = true;
    permissionGrantedRef.current = true;
    detachSensors();
    attachSensors();
  }, [attachSensors, blockCompass, detachSensors]);

  const searchManualLocation = useCallback(async (rawQuery: string) => {
    const query = rawQuery.trim();
    setManualSearchResults([]);
    setManualSearchError(false);
    if (!query || query.length > 160) {
      setManualSearchError(true);
      return;
    }
    setIsSearchingLocation(true);
    try {
      const response = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`);
      const data = (await response.json()) as { ok?: boolean; results?: ManualLocationResult[] };
      if (!mountedRef.current) return;
      if (!response.ok || !data.ok || !Array.isArray(data.results)) {
        setManualSearchError(true);
        return;
      }
      setManualSearchResults(data.results.filter((result) =>
        typeof result.label === "string" && Number.isFinite(result.latitude) && Number.isFinite(result.longitude),
      ).slice(0, 5));
    } catch {
      if (mountedRef.current) setManualSearchError(true);
    } finally {
      if (mountedRef.current) setIsSearchingLocation(false);
    }
  }, []);

  const selectManualLocation = useCallback((result: ManualLocationResult) => {
    setManualSearchResults([]);
    applyLocation({
      latitude: result.latitude,
      longitude: result.longitude,
      accuracyMeters: null,
      source: "manual",
    });
    setLocationLabel(result.label);
  }, [applyLocation]);

  useEffect(() => {
    mountedRef.current = true;
    const pause = () => {
      if (document.visibilityState === "hidden") detachSensors();
    };
    const handlePageHide = () => {
      detachSensors();
    };
    const resume = () => {
      if (
        document.visibilityState !== "hidden" &&
        compassEnabledRef.current &&
        permissionGrantedRef.current &&
        coordinatesRef.current
      ) {
        detachSensors();
        blockCompass("sensor-timeout");
        attachSensors();
      }
    };
    const handleVisibility = () => {
      if (document.visibilityState === "hidden") pause();
      else resume();
    };

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("pagehide", handlePageHide);
    window.addEventListener("pageshow", resume);

    return () => {
      mountedRef.current = false;
      ++permissionAttemptRef.current;
      ++locationRequestRef.current;
      detachSensors();
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("pagehide", handlePageHide);
      window.removeEventListener("pageshow", resume);
    };
  }, [attachSensors, blockCompass, detachSensors]);

  return {
    state,
    coordinates,
    locationLabel,
    locationError,
    headingSource,
    headingAccuracyDegrees,
    directionSector: state.bearing === null ? null : getCompassSector(state.bearing),
    isSearchingLocation,
    manualSearchResults,
    manualSearchError,
    findQibla,
    enableLiveCompass,
    searchManualLocation,
    selectManualLocation,
  };
}
