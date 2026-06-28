"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Compass,
  ExternalLink,
  LocateFixed,
  MapPin,
  Navigation,
  RotateCw,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useTranslation } from "@/lib/i18n/use-translation";
import {
  calculateNeedleRotation,
  calculateQiblaBearing,
  headingFromAlpha,
  normalizeDegrees,
  smoothCompassHeading,
} from "@/lib/qibla-utils";

type LocationStatus =
  | "idle"
  | "locating"
  | "ready"
  | "denied"
  | "unavailable"
  | "timeout"
  | "unsupported"
  | "error";

type CompassStatus = "idle" | "requesting" | "waiting" | "active" | "denied" | "unsupported";
type HeadingQuality = "good" | "calibration" | "relative";

interface Coords {
  lat: number;
  lon: number;
  accuracy: number;
}

interface CompassOrientationEvent extends DeviceOrientationEvent {
  webkitCompassHeading?: number;
  webkitCompassAccuracy?: number;
}

type OrientationEventConstructor = typeof DeviceOrientationEvent & {
  requestPermission?: () => Promise<"granted" | "denied">;
};

const SENSOR_TIMEOUT_MS = 5000;

export default function QiblaPage() {
  const { t } = useTranslation();
  const [started, setStarted] = useState(false);
  const [locationStatus, setLocationStatus] = useState<LocationStatus>("idle");
  const [compassStatus, setCompassStatus] = useState<CompassStatus>("idle");
  const [headingQuality, setHeadingQuality] = useState<HeadingQuality>("good");
  const [bearing, setBearing] = useState<number | null>(null);
  const [phoneHeading, setPhoneHeading] = useState<number | null>(null);
  const [coords, setCoords] = useState<Coords | null>(null);
  const [locationLabel, setLocationLabel] = useState<string | null>(null);

  const mountedRef = useRef(true);
  const locationRequestRef = useRef(0);
  const cleanupCompassRef = useRef<(() => void) | null>(null);

  const stopCompassListeners = useCallback(() => {
    cleanupCompassRef.current?.();
    cleanupCompassRef.current = null;
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      stopCompassListeners();
    };
  }, [stopCompassListeners]);

  useEffect(() => {
    if (["denied", "unavailable", "timeout", "unsupported", "error"].includes(locationStatus)) {
      stopCompassListeners();
    }
  }, [locationStatus, stopCompassListeners]);

  const fetchReverseGeocode = useCallback(async (lat: number, lon: number, requestId: number) => {
    const cacheKey = `reverse-geocode:${lat.toFixed(3)}:${lon.toFixed(3)}`;

    try {
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (mountedRef.current && requestId === locationRequestRef.current) {
          if (parsed.ok && parsed.city && parsed.country) {
            setLocationLabel(`${parsed.city}, ${parsed.country}`);
          } else if (parsed.ok && parsed.formatted) {
            setLocationLabel(parsed.formatted);
          }
        }
        return;
      }
    } catch {
      // A location label is optional; continue without the session cache.
    }

    try {
      const response = await fetch(`/api/reverse-geocode?lat=${lat}&lon=${lon}`);
      const data = await response.json();

      try {
        sessionStorage.setItem(cacheKey, JSON.stringify(data));
      } catch {
        // A location label is optional; ignore cache write failures.
      }

      if (!mountedRef.current || requestId !== locationRequestRef.current) return;

      if (data.ok && data.city && data.country) {
        setLocationLabel(`${data.city}, ${data.country}`);
      } else if (data.ok && data.formatted) {
        setLocationLabel(data.formatted);
      }
    } catch {
      // Reverse geocoding must never block the compass.
    }
  }, []);

  const locate = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setLocationStatus("unsupported");
      return;
    }

    const requestId = ++locationRequestRef.current;
    setLocationStatus("locating");
    setLocationLabel(null);

    navigator.geolocation.getCurrentPosition(
      ({ coords: positionCoords }) => {
        if (!mountedRef.current || requestId !== locationRequestRef.current) return;

        const { latitude, longitude, accuracy } = positionCoords;
        setCoords({ lat: latitude, lon: longitude, accuracy });
        setBearing(calculateQiblaBearing(latitude, longitude));
        setLocationStatus("ready");
        void fetchReverseGeocode(latitude, longitude, requestId);
      },
      (error) => {
        if (!mountedRef.current || requestId !== locationRequestRef.current) return;

        switch (error.code) {
          case error.PERMISSION_DENIED:
            setLocationStatus("denied");
            break;
          case error.POSITION_UNAVAILABLE:
            setLocationStatus("unavailable");
            break;
          case error.TIMEOUT:
            setLocationStatus("timeout");
            break;
          default:
            setLocationStatus("error");
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  }, [fetchReverseGeocode]);

  const startCompassListeners = useCallback(() => {
    stopCompassListeners();
    setCompassStatus("waiting");
    setHeadingQuality("good");
    setPhoneHeading(null);

    let active = true;
    let hasAbsoluteHeading = false;
    let frameId: number | null = null;
    let pendingHeading: number | null = null;

    const sensorTimeout = window.setTimeout(() => {
      if (active && mountedRef.current) {
        setCompassStatus("unsupported");
        stopCompassListeners();
      }
    }, SENSOR_TIMEOUT_MS);

    const publishHeading = (nextHeading: number) => {
      pendingHeading = nextHeading;
      if (frameId !== null) return;

      frameId = window.requestAnimationFrame(() => {
        frameId = null;
        if (!active || pendingHeading === null || !mountedRef.current) return;
        const heading = pendingHeading;
        pendingHeading = null;
        setPhoneHeading((previous) => smoothCompassHeading(previous, heading));
      });
    };

    const handleOrientation = (rawEvent: Event) => {
      const event = rawEvent as CompassOrientationEvent;
      const webkitHeading = event.webkitCompassHeading;
      const hasWebkitHeading = Number.isFinite(webkitHeading);
      const isAbsoluteEvent = rawEvent.type === "deviceorientationabsolute" || event.absolute === true;

      if (!hasWebkitHeading && !Number.isFinite(event.alpha)) return;
      if (!hasWebkitHeading && !isAbsoluteEvent && hasAbsoluteHeading) return;

      const nextHeading = hasWebkitHeading
        ? normalizeDegrees(webkitHeading as number)
        : headingFromAlpha(event.alpha as number);

      if (hasWebkitHeading || isAbsoluteEvent) hasAbsoluteHeading = true;

      window.clearTimeout(sensorTimeout);
      setCompassStatus("active");

      if (hasWebkitHeading) {
        const compassAccuracy = event.webkitCompassAccuracy;
        setHeadingQuality(
          Number.isFinite(compassAccuracy) && (compassAccuracy as number) >= 0 && (compassAccuracy as number) > 25
            ? "calibration"
            : "good"
        );
      } else {
        setHeadingQuality(isAbsoluteEvent ? "good" : "relative");
      }

      publishHeading(nextHeading);
    };

    const handleCalibration = () => setHeadingQuality("calibration");

    window.addEventListener("deviceorientationabsolute", handleOrientation);
    window.addEventListener("deviceorientation", handleOrientation);
    window.addEventListener("compassneedscalibration", handleCalibration);

    cleanupCompassRef.current = () => {
      active = false;
      window.clearTimeout(sensorTimeout);
      if (frameId !== null) window.cancelAnimationFrame(frameId);
      window.removeEventListener("deviceorientationabsolute", handleOrientation);
      window.removeEventListener("deviceorientation", handleOrientation);
      window.removeEventListener("compassneedscalibration", handleCalibration);
    };
  }, [stopCompassListeners]);

  const requestCompassAccess = useCallback(async () => {
    if (!("DeviceOrientationEvent" in window)) {
      setCompassStatus("unsupported");
      return;
    }

    const OrientationEvent = window.DeviceOrientationEvent as OrientationEventConstructor;

    if (typeof OrientationEvent.requestPermission === "function") {
      setCompassStatus("requesting");
      try {
        // iOS requires this call to happen directly inside the user's click handler.
        const permission = await OrientationEvent.requestPermission();
        if (!mountedRef.current) return;
        if (permission !== "granted") {
          setCompassStatus("denied");
          return;
        }
      } catch {
        if (mountedRef.current) setCompassStatus("denied");
        return;
      }
    }

    if (mountedRef.current) startCompassListeners();
  }, [startCompassListeners]);

  const handleStart = useCallback(() => {
    setStarted(true);
    locate();
    // Keep this invocation in the click call stack for iPhone/Safari permission rules.
    void requestCompassAccess();
  }, [locate, requestCompassAccess]);

  const locationErrorKey = getLocationErrorKey(locationStatus);
  const hasLocationError = locationErrorKey !== null;
  const needleRotation =
    bearing !== null && phoneHeading !== null
      ? calculateNeedleRotation(bearing, phoneHeading)
      : null;
  const mapsUrl = coords
    ? `https://www.google.com/maps/search/?api=1&query=${coords.lat},${coords.lon}`
    : null;

  return (
    <AppShell>
      <PageHeader titleKey="qibla.title" />

      {!started && (
        <Card className="py-12 text-center">
          <div className="mx-auto mb-6 grid h-20 w-20 place-items-center rounded-2xl bg-[var(--color-emerald-soft)]">
            <KaabaIcon className="h-10 w-10 text-[var(--color-emerald)]" />
          </div>
          <h2 className="font-brand text-xl font-semibold text-[var(--color-emerald)]">
            {t("qibla.title")}
          </h2>
          <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-[var(--color-muted)]">
            {t("qibla.intro")}
          </p>
          <p className="mx-auto mt-2 max-w-sm text-xs leading-5 text-[var(--color-muted)]/80">
            {t("qibla.locationPermissionRequired")}
          </p>
          <Button type="button" className="mt-6" onClick={handleStart}>
            <Compass className="h-5 w-5" />
            {t("qibla.startCompass")}
          </Button>
        </Card>
      )}

      {started && locationStatus === "locating" && (
        <Card className="py-10 text-center" aria-live="polite">
          <div className="mx-auto mb-4 grid h-12 w-12 place-items-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--color-emerald-soft)] border-t-[var(--color-emerald)]" />
          </div>
          <p className="text-sm font-bold text-[var(--color-muted)]">{t("qibla.locating")}</p>
          {compassStatus === "requesting" && (
            <p className="mt-3 text-xs text-[var(--color-muted)]">
              {t("qibla.requestingCompassPermission")}
            </p>
          )}
        </Card>
      )}

      {started && hasLocationError && (
        <Card className="py-12 text-center" aria-live="polite">
          <div className="mx-auto mb-4 grid h-20 w-20 place-items-center rounded-2xl bg-[var(--color-danger)]/10">
            <MapPin className="h-10 w-10 text-[var(--color-danger)]" />
          </div>
          <h2 className="font-brand text-xl font-semibold text-[var(--color-danger)]">
            {t("qibla.locationProblem")}
          </h2>
          <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-[var(--color-muted)]">
            {t(locationErrorKey)}
          </p>
          <Button type="button" variant="ghost" className="mt-6" onClick={handleStart}>
            <LocateFixed className="h-5 w-5" />
            {t("qibla.tryAgain")}
          </Button>
        </Card>
      )}

      {locationStatus === "ready" && bearing !== null && coords !== null && (
        <div className="grid gap-4">
          <Card className="py-7 text-center">
            <CompassFace
              rotation={compassStatus === "active" && needleRotation !== null ? needleRotation : bearing}
              isLive={compassStatus === "active" && needleRotation !== null}
              north={t("qibla.northShort")}
              east={t("qibla.eastShort")}
              south={t("qibla.southShort")}
              west={t("qibla.westShort")}
              label={t("qibla.qiblaDirection")}
            />

            <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-gold)]">
              {t("qibla.qiblaDirection")}
            </p>
            <h2 className="font-brand text-5xl font-semibold text-[var(--color-emerald)]">
              {Math.round(bearing)}°
            </h2>
            <p className="text-sm font-bold text-[var(--color-muted)]">{t("qibla.fromNorth")}</p>

            <CompassState status={compassStatus} quality={headingQuality} t={t} />

            <div className="mx-auto mt-5 max-w-md rounded-2xl border border-[var(--color-border)] bg-[var(--color-cream)] p-4 text-start">
              <Readout label={t("qibla.qiblaBearing")} value={`${bearing.toFixed(1)}°`} />
              <Readout
                label={t("qibla.phoneHeading")}
                value={phoneHeading === null ? "—" : `${phoneHeading.toFixed(1)}°`}
              />
              <Readout
                label={t("qibla.needleRotation")}
                value={needleRotation === null ? "—" : `${needleRotation.toFixed(1)}°`}
              />
              <Readout label={t("qibla.accuracy")} value={`±${Math.round(coords.accuracy)} m`} />
              <Readout
                label={t("qibla.locationLabel")}
                value={locationLabel ?? t("qibla.reverseGeocodeUnavailable")}
              />
              <Readout
                label={t("qibla.coordinates")}
                value={`${coords.lat.toFixed(5)}, ${coords.lon.toFixed(5)}`}
                isLast
              />
            </div>

            <div className="mx-auto mt-5 flex max-w-md items-start gap-3 rounded-2xl bg-[var(--color-gold-soft)]/55 p-4 text-start">
              <RotateCw className="mt-0.5 h-5 w-5 shrink-0 text-[var(--color-gold-dark)]" />
              <p className="text-xs leading-5 text-[var(--color-emerald-dark)]">
                <span className="font-bold">{t("qibla.calibrationHint")}</span>{" "}
                {t("qibla.magneticInterference")}
              </p>
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
              <Button type="button" variant="ghost" onClick={locate}>
                <LocateFixed className="h-5 w-5" />
                {t("qibla.updateLocation")}
              </Button>
              {(compassStatus === "denied" || compassStatus === "unsupported") && (
                <Button type="button" variant="soft" onClick={handleStart}>
                  <Compass className="h-5 w-5" />
                  {t("qibla.tryCompassAgain")}
                </Button>
              )}
            </div>

            {mapsUrl && (
              <a
                href={mapsUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-5 inline-flex items-center gap-1 text-xs font-bold text-[var(--color-emerald)] underline underline-offset-2"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                {t("qibla.openInMaps")}
              </a>
            )}
          </Card>
        </div>
      )}
    </AppShell>
  );
}

function CompassFace({
  rotation,
  isLive,
  north,
  east,
  south,
  west,
  label,
}: {
  rotation: number;
  isLive: boolean;
  north: string;
  east: string;
  south: string;
  west: string;
  label: string;
}) {
  return (
    <div className="relative mx-auto mb-6 h-60 w-60 rounded-full border-8 border-[var(--color-emerald-soft)] bg-[var(--color-cream)] shadow-inner">
      <div className="absolute inset-3 rounded-full border border-[var(--color-gold)]/35" />
      <span className="absolute start-1/2 top-3 -translate-x-1/2 text-xs font-extrabold text-[var(--color-emerald)]">
        {north}
      </span>
      <span className="absolute end-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-[var(--color-muted)]">
        {east}
      </span>
      <span className="absolute bottom-3 start-1/2 -translate-x-1/2 text-[10px] font-bold text-[var(--color-muted)]">
        {south}
      </span>
      <span className="absolute start-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-[var(--color-muted)]">
        {west}
      </span>
      <div className="absolute inset-0 grid place-items-center">
        <div
          className={isLive ? "transition-transform duration-100 ease-linear motion-reduce:transition-none" : ""}
          style={{ transform: `rotate(${rotation}deg)` }}
          aria-label={label}
        >
          <Navigation className="h-24 w-24 fill-[var(--color-gold)] text-[var(--color-emerald)] drop-shadow-sm" />
        </div>
      </div>
      <div className="absolute start-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[var(--color-card)] bg-[var(--color-emerald)] shadow" />
    </div>
  );
}

function CompassState({
  status,
  quality,
  t,
}: {
  status: CompassStatus;
  quality: HeadingQuality;
  t: (key: string) => string;
}) {
  const isWarning = status === "denied" || status === "unsupported" || quality !== "good";
  const messageKey =
    status === "requesting"
      ? "qibla.requestingCompassPermission"
      : status === "waiting"
        ? "qibla.waitingForCompass"
        : status === "denied"
          ? "qibla.compassPermissionDenied"
          : status === "unsupported"
            ? "qibla.compassUnsupported"
            : quality !== "good"
              ? "qibla.unstableHeading"
              : "qibla.liveCompassActive";

  return (
    <div
      className={`mx-auto mt-5 flex max-w-md items-start gap-2 rounded-2xl px-4 py-3 text-start text-xs leading-5 ${
        isWarning
          ? "bg-[var(--color-warning)]/10 text-[var(--color-warning)]"
          : "bg-[var(--color-emerald-soft)] text-[var(--color-emerald)]"
      }`}
      aria-live="polite"
    >
      {isWarning ? (
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      ) : (
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
      )}
      <span className="font-bold">{t(messageKey)}</span>
    </div>
  );
}

function Readout({ label, value, isLast = false }: { label: string; value: string; isLast?: boolean }) {
  return (
    <div
      className={`flex items-start justify-between gap-4 py-2 text-xs ${
        isLast ? "" : "border-b border-[var(--color-border)]/70"
      }`}
    >
      <span className="text-[var(--color-muted)]">{label}</span>
      <span className="max-w-[60%] text-end font-bold text-[var(--color-emerald)]">{value}</span>
    </div>
  );
}

function getLocationErrorKey(status: LocationStatus): string | null {
  switch (status) {
    case "denied":
      return "qibla.locationDenied";
    case "unavailable":
      return "qibla.locationUnavailable";
    case "timeout":
      return "qibla.locationTimeout";
    case "unsupported":
      return "qibla.locationUnsupported";
    case "error":
      return "qibla.locationError";
    default:
      return null;
  }
}

function KaabaIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="4" y="6" width="16" height="12" rx="1" />
      <path d="M4 6l8-3 8 3" />
      <line x1="12" y1="3" x2="12" y2="18" />
      <line x1="8" y1="6" x2="8" y2="18" />
      <line x1="16" y1="6" x2="16" y2="18" />
    </svg>
  );
}
