"use client";

import { useState, useCallback } from "react";
import { MapPin, LocateFixed, Navigation, ExternalLink } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useTranslation } from "@/lib/i18n/use-translation";
import { calculateQiblaBearing } from "@/lib/qibla-utils";

type Status = "idle" | "locating" | "success" | "error";

interface Coords {
  lat: number;
  lon: number;
  accuracy: number;
}

export default function QiblaPage() {
  const { t } = useTranslation();
  const [status, setStatus] = useState<Status>("idle");
  const [errorKey, setErrorKey] = useState<string>("qibla.locationError");
  const [bearing, setBearing] = useState<number | null>(null);
  const [coords, setCoords] = useState<Coords | null>(null);
  const [locationLabel, setLocationLabel] = useState<string | null>(null);

  const fetchReverseGeocode = useCallback(async (lat: number, lon: number) => {
    const cacheKey = `reverse-geocode:${lat.toFixed(3)}:${lon.toFixed(3)}`;

    try {
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.ok && parsed.city && parsed.country) {
          setLocationLabel(`${parsed.city}, ${parsed.country}`);
        } else if (parsed.ok && parsed.formatted) {
          setLocationLabel(parsed.formatted);
        }
        return;
      }
    } catch {
      // ignore cache read errors
    }

    try {
      const response = await fetch(`/api/reverse-geocode?lat=${lat}&lon=${lon}`);
      const data = await response.json();

      try {
        sessionStorage.setItem(cacheKey, JSON.stringify(data));
      } catch {
        // ignore cache write errors
      }

      if (data.ok && data.city && data.country) {
        setLocationLabel(`${data.city}, ${data.country}`);
      } else if (data.ok && data.formatted) {
        setLocationLabel(data.formatted);
      }
    } catch {
      // silently fail; location label stays null
    }
  }, []);

  const handleLocate = useCallback(() => {
    if (!navigator.geolocation) {
      setErrorKey("qibla.locationUnsupported");
      setStatus("error");
      return;
    }

    setStatus("locating");
    setLocationLabel(null);

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const { latitude, longitude, accuracy } = coords;
        const computedBearing = calculateQiblaBearing(latitude, longitude);

        setCoords({ lat: latitude, lon: longitude, accuracy });
        setBearing(computedBearing);
        setStatus("success");

        // Start reverse geocoding in background
        fetchReverseGeocode(latitude, longitude);
      },
      (error) => {
        let key = "qibla.locationError";
        switch (error.code) {
          case error.PERMISSION_DENIED:
            key = "qibla.locationDenied";
            break;
          case error.POSITION_UNAVAILABLE:
            key = "qibla.locationUnavailable";
            break;
          case error.TIMEOUT:
            key = "qibla.locationTimeout";
            break;
        }
        setErrorKey(key);
        setStatus("error");
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  }, [fetchReverseGeocode]);

  const mapsUrl = coords
    ? `https://www.google.com/maps/search/?api=1&query=${coords.lat},${coords.lon}`
    : null;

  return (
    <AppShell>
      <PageHeader titleKey="qibla.title" />

      {status === "idle" && (
        <Card className="py-12 text-center">
          <div className="mx-auto mb-6 grid h-20 w-20 place-items-center rounded-2xl bg-[var(--color-emerald-soft)]">
            <KaabaIcon className="h-10 w-10 text-[var(--color-emerald)]" />
          </div>
          <h2 className="font-brand text-xl font-semibold text-[var(--color-emerald)]">
            {t("qibla.title")}
          </h2>
          <p className="mx-auto mt-3 max-w-xs text-sm leading-6 text-[var(--color-muted)]">
            {t("qibla.intro")}
          </p>
          <Button type="button" className="mt-6" onClick={handleLocate}>
            <LocateFixed className="h-5 w-5" />
            {t("qibla.useMyLocation")}
          </Button>
        </Card>
      )}

      {status === "locating" && (
        <Card className="py-12 text-center">
          <div className="mx-auto mb-4 grid h-12 w-12 place-items-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--color-emerald-soft)] border-t-[var(--color-emerald)]" />
          </div>
          <p className="text-sm font-bold text-[var(--color-muted)]">
            {t("qibla.locating")}
          </p>
        </Card>
      )}

      {status === "error" && (
        <Card className="py-12 text-center">
          <div className="mx-auto mb-4 grid h-20 w-20 place-items-center rounded-2xl bg-[var(--color-danger)]/10">
            <MapPin className="h-10 w-10 text-[var(--color-danger)]" />
          </div>
          <h2 className="font-brand text-xl font-semibold text-[var(--color-danger)]">
            {t("qibla.title")}
          </h2>
          <p className="mx-auto mt-3 max-w-xs text-sm leading-6 text-[var(--color-muted)]">
            {t(errorKey)}
          </p>
          <Button type="button" variant="ghost" className="mt-6" onClick={handleLocate}>
            <LocateFixed className="h-5 w-5" />
            {t("qibla.useMyLocation")}
          </Button>
        </Card>
      )}

      {status === "success" && bearing !== null && coords !== null && (
        <div className="grid gap-4">
          <Card className="py-8 text-center">
            {/* Decorative compass circle */}
            <div className="relative mx-auto mb-6 grid h-48 w-48 place-items-center rounded-full border-8 border-[var(--color-emerald-soft)] bg-[var(--color-cream)] shadow-inner">
              <span className="absolute top-2 text-[10px] font-extrabold text-[var(--color-muted)]">
                N
              </span>
              <div style={{ transform: `rotate(${bearing}deg)` }}>
                <Navigation className="h-20 w-20 fill-[var(--color-gold)] text-[var(--color-emerald)]" />
              </div>
            </div>

            <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-gold)]">
              {t("qibla.qiblaDirection")}
            </p>
            <h2 className="font-brand text-5xl font-semibold text-[var(--color-emerald)]">
              {Math.round(bearing)}°
            </h2>
            <p className="text-sm font-bold text-[var(--color-muted)]">
              {t("qibla.fromNorth")}
            </p>

            {locationLabel && (
              <p className="mt-4 text-sm font-bold text-[var(--color-emerald)]">
                {locationLabel}
              </p>
            )}

            <div className="mt-4 text-xs text-[var(--color-muted)]">
              <p>
                {t("qibla.coordinates")}: {coords.lat.toFixed(5)}, {coords.lon.toFixed(5)}
              </p>
              <p>
                {t("qibla.accuracy")}: ±{Math.round(coords.accuracy)} m
              </p>
            </div>

            <p className="mx-auto mt-5 max-w-xs text-xs leading-5 text-[var(--color-muted)]">
              {t("qibla.useCompassInstruction")}
            </p>

            {mapsUrl && (
              <a
                href={mapsUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-[var(--color-emerald)] underline underline-offset-2"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                {t("qibla.openInMaps")}
              </a>
            )}

            <p className="mt-4 text-[10px] text-[var(--color-muted)]/60">
              {t("qibla.noLiveCompassNote")}
            </p>

            <Button type="button" variant="ghost" className="mt-5" onClick={handleLocate}>
              <LocateFixed className="h-5 w-5" />
              {t("qibla.useMyLocation")}
            </Button>
          </Card>
        </div>
      )}
    </AppShell>
  );
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
    >
      <rect x="4" y="6" width="16" height="12" rx="1" />
      <path d="M4 6l8-3 8 3" />
      <line x1="12" y1="3" x2="12" y2="18" />
      <line x1="8" y1="6" x2="8" y2="18" />
      <line x1="16" y1="6" x2="16" y2="18" />
    </svg>
  );
}
