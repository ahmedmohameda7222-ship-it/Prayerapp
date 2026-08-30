"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Compass, ExternalLink, LocateFixed, MapPin, Search } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { QiblaCompass } from "@/components/qibla/QiblaCompass";
import { useTranslation } from "@/lib/i18n/use-translation";
import { useQiblaController } from "@/lib/use-qibla-controller";
import type { CompassSector } from "@/lib/qibla-utils";

const directionKeys: Record<CompassSector, string> = {
  N: "qibla.directionN",
  NE: "qibla.directionNE",
  E: "qibla.directionE",
  SE: "qibla.directionSE",
  S: "qibla.directionS",
  SW: "qibla.directionSW",
  W: "qibla.directionW",
  NW: "qibla.directionNW",
};

export function QiblaExperience() {
  const { t } = useTranslation();
  const controller = useQiblaController();
  const [manualQuery, setManualQuery] = useState("");
  const { state } = controller;

  const bearingText = useMemo(() => {
    if (state.bearing === null || controller.directionSector === null) return null;
    return t("qibla.qiblaSummary", {
      bearing: Math.round(state.bearing),
      direction: t(directionKeys[controller.directionSector]),
    });
  }, [controller.directionSector, state.bearing, t]);

  const announcement = getAnnouncement(state.mode, state.liveBlockReason, t);
  const isLive = state.mode === "live" || state.mode === "aligned";

  return (
    <div className="mx-auto grid w-full max-w-[680px] gap-4 pb-8 pt-4">
      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {announcement}
      </p>

      {state.mode === "idle" ? (
        <Card className="py-10 text-center">
          <div className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-[var(--ui-radius-card)] bg-[var(--ui-brand-soft)] text-[var(--ui-brand)]">
            <MapPin className="h-8 w-8" aria-hidden="true" />
          </div>
          <p className="mx-auto max-w-md text-sm leading-6 text-[var(--ui-text-secondary-color)]">
            {t("qibla.intro")}
          </p>
          <Button type="button" className="mt-6" onClick={controller.findQibla}>
            <LocateFixed className="h-5 w-5" aria-hidden="true" />
            {t("qibla.findQibla")}
          </Button>
          <p className="mx-auto mt-5 max-w-md text-xs leading-5 text-[var(--ui-text-secondary-color)]">
            {t("qibla.preciseLocationPrivacy")}
          </p>
        </Card>
      ) : null}

      {state.mode === "locating" ? (
        <Card className="py-10 text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-[var(--ui-divider)] border-t-[var(--ui-brand)] motion-reduce:animate-none" aria-hidden="true" />
          <p className="font-bold text-[var(--ui-text)]">{t("qibla.locating")}</p>
        </Card>
      ) : null}

      {state.mode === "location-error" ? (
        <Card className="py-8">
          <div className="text-center">
            <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-[var(--ui-surface-subtle)] text-[var(--ui-urgent)]">
              <MapPin className="h-7 w-7" aria-hidden="true" />
            </div>
            <h2 className="text-lg font-bold text-[var(--ui-text)]">{t("qibla.locationProblem")}</h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--ui-text-secondary-color)]">
              {t(locationErrorKey(controller.locationError))}
            </p>
            <Button type="button" variant="ghost" className="mt-5" onClick={controller.findQibla}>
              <LocateFixed className="h-5 w-5" aria-hidden="true" />
              {t("qibla.tryAgain")}
            </Button>
          </div>
          <ManualLocationSearch
            query={manualQuery}
            setQuery={setManualQuery}
            controller={controller}
            t={t}
          />
        </Card>
      ) : null}

      {state.bearing !== null && !["idle", "locating", "location-error"].includes(state.mode) ? (
        <>
          <Card className="py-7 text-center">
            {isLive && state.turnDelta !== null && state.trueHeading !== null ? (
              <>
                <QiblaCompass
                  qiblaBearing={state.bearing}
                  heading={state.trueHeading}
                  north={t("qibla.northShort")}
                  east={t("qibla.eastShort")}
                  south={t("qibla.southShort")}
                  west={t("qibla.westShort")}
                  aligned={state.mode === "aligned"}
                />
                <div className="mt-6">
                  <PrimaryGuidance mode={state.mode} delta={state.turnDelta} t={t} />
                </div>
              </>
            ) : null}

            {bearingText ? (
              <p className={`${isLive ? "mt-2" : ""} text-base font-bold text-[var(--ui-text)]`}>
                {bearingText}
              </p>
            ) : null}

            {state.mode === "bearing-ready" ? (
              <div className="mt-6">
                <Button type="button" onClick={() => void controller.enableLiveCompass()}>
                  <Compass className="h-5 w-5" aria-hidden="true" />
                  {t("qibla.enableLiveCompass")}
                </Button>
              </div>
            ) : null}

            {state.mode === "requesting-compass" ? (
              <p className="mt-5 text-sm text-[var(--ui-text-secondary-color)]">
                {t("qibla.requestingCompass")}
              </p>
            ) : null}

            {state.mode === "bearing-only" ? (
              <BearingOnlyFallback
                bearing={Math.round(state.bearing)}
                reason={state.liveBlockReason}
                onRetry={() => void controller.enableLiveCompass()}
                t={t}
              />
            ) : null}
          </Card>

          <Details controller={controller} bearingText={bearingText} t={t} />
        </>
      ) : null}
    </div>
  );
}

function PrimaryGuidance({ mode, delta, t }: { mode: string; delta: number; t: Translate }) {
  if (mode === "aligned") {
    return <h2 className="text-2xl font-black text-[var(--ui-success)]">{t("qibla.facingQibla")}</h2>;
  }

  const degrees = Math.round(Math.abs(delta));
  const accessibleGuidance = delta > 0
    ? t("qibla.turnRightAccessible", { degrees })
    : t("qibla.turnLeftAccessible", { degrees });

  return (
    <h2
      className="text-2xl font-black text-[var(--ui-brand-strong)]"
      aria-label={accessibleGuidance}
    >
      {delta > 0 ? t("qibla.turnRight", { degrees }) : t("qibla.turnLeft", { degrees })}
    </h2>
  );
}

function BearingOnlyFallback({
  bearing,
  reason,
  onRetry,
  t,
}: {
  bearing: number;
  reason: string | null;
  onRetry: () => void;
  t: Translate;
}) {
  const contextual = blockReasonKey(reason);
  return (
    <div className="mx-auto mt-6 max-w-md rounded-[var(--ui-radius-card)] border border-[var(--ui-divider)] bg-[var(--ui-surface-subtle)] p-4 text-start">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[var(--ui-urgent)]" aria-hidden="true" />
        <div>
          <p className="font-bold text-[var(--ui-text)]">{t("qibla.liveCompassUnavailable")}</p>
          <p className="mt-1 text-sm leading-6 text-[var(--ui-text-secondary-color)]">
            {t("qibla.trustedCompassInstruction", { bearing })}
          </p>
          {contextual ? (
            <p className="mt-2 text-sm font-semibold text-[var(--ui-text)]">{t(contextual)}</p>
          ) : null}
        </div>
      </div>
      {reason !== "tilted" && reason !== "landscape" ? (
        <Button type="button" variant="ghost" className="mt-4 w-full" onClick={onRetry}>
          {t("qibla.tryCompassAgain")}
        </Button>
      ) : null}
    </div>
  );
}

function ManualLocationSearch({
  query,
  setQuery,
  controller,
  t,
}: {
  query: string;
  setQuery: (value: string) => void;
  controller: ReturnType<typeof useQiblaController>;
  t: Translate;
}) {
  return (
    <div className="mx-auto mt-7 max-w-md border-t border-[var(--ui-divider)] pt-6">
      <h3 className="font-bold text-[var(--ui-text)]">{t("qibla.searchCityAddress")}</h3>
      <form
        className="mt-3 flex flex-col gap-2 sm:flex-row"
        onSubmit={(event) => {
          event.preventDefault();
          void controller.searchManualLocation(query);
        }}
      >
        <input
          value={query}
          maxLength={160}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t("qibla.searchPlaceholder")}
          aria-label={t("qibla.searchCityAddress")}
          className="min-h-11 flex-1 rounded-[var(--ui-radius-control)] border border-[var(--ui-divider)] bg-[var(--ui-surface)] px-3 text-sm text-[var(--ui-text)] outline-none focus:border-[var(--ui-brand)]"
        />
        <Button type="submit" variant="ghost" disabled={controller.isSearchingLocation}>
          <Search className="h-4 w-4" aria-hidden="true" />
          {controller.isSearchingLocation ? t("qibla.searching") : t("qibla.search")}
        </Button>
      </form>

      {controller.manualSearchError ? (
        <p className="mt-3 text-sm text-[var(--ui-urgent)]">{t("qibla.searchUnavailable")}</p>
      ) : null}

      {controller.manualSearchResults.length > 0 ? (
        <ul className="mt-3 grid gap-2">
          {controller.manualSearchResults.map((result) => (
            <li key={`${result.latitude}:${result.longitude}:${result.label}`}>
              <button
                type="button"
                className="min-h-11 w-full rounded-[var(--ui-radius-control)] border border-[var(--ui-divider)] bg-[var(--ui-surface)] px-3 py-2 text-start text-sm font-semibold text-[var(--ui-text)]"
                onClick={() => controller.selectManualLocation(result)}
              >
                {result.label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function Details({
  controller,
  bearingText,
  t,
}: {
  controller: ReturnType<typeof useQiblaController>;
  bearingText: string | null;
  t: Translate;
}) {
  const { state, coordinates } = controller;
  if (!coordinates || state.bearing === null) return null;
  const mapsUrl =
    coordinates.source === "gps"
      ? `https://www.google.com/maps/search/?api=1&query=${coordinates.latitude},${coordinates.longitude}`
      : null;

  return (
    <details className="rounded-[var(--ui-radius-card)] border border-[var(--ui-divider)] bg-[var(--ui-surface)] p-4 text-sm">
      <summary className="cursor-pointer font-bold text-[var(--ui-text)]">{t("qibla.details")}</summary>
      <dl className="mt-4 grid gap-3">
        <Readout label={t("qibla.qiblaBearing")} value={bearingText ?? `${state.bearing.toFixed(1)}°`} />
        <Readout
          label={t("qibla.truePhoneHeading")}
          value={state.trueHeading === null ? "—" : `${state.trueHeading.toFixed(1)}°`}
        />
        <Readout label={t("qibla.headingSource")} value={headingSourceLabel(controller.headingSource, t)} />
        <Readout
          label={t("qibla.headingAccuracy")}
          value={controller.headingAccuracyDegrees === null ? "—" : `±${Math.round(controller.headingAccuracyDegrees)}°`}
        />
        <Readout
          label={t("qibla.locationAccuracy")}
          value={coordinates.accuracyMeters === null ? "—" : `±${Math.round(coordinates.accuracyMeters)} m`}
        />
        <Readout
          label={coordinates.source === "manual" ? t("qibla.selectedLocation") : t("qibla.currentLocation")}
          value={controller.locationLabel ?? "—"}
        />
        <Readout
          label={t("qibla.coordinates")}
          value={`${coordinates.latitude.toFixed(4)}, ${coordinates.longitude.toFixed(4)}`}
        />
      </dl>
      <p className="mt-4 text-xs leading-5 text-[var(--ui-text-secondary-color)]">
        {t("qibla.preciseLocationPrivacy")} {t("qibla.compassLocalPrivacy")}
      </p>
      {mapsUrl ? (
        <a
          href={mapsUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-4 inline-flex min-h-11 items-center gap-2 font-bold text-[var(--ui-brand)]"
        >
          {t("qibla.viewCurrentLocation")}
          <ExternalLink className="h-4 w-4" aria-hidden="true" />
        </a>
      ) : null}
    </details>
  );
}

function Readout({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-[var(--ui-divider)] pb-2 last:border-0 last:pb-0">
      <dt className="text-[var(--ui-text-secondary-color)]">{label}</dt>
      <dd className="text-end font-semibold text-[var(--ui-text)]">{value}</dd>
    </div>
  );
}

function headingSourceLabel(source: string | null, t: Translate) {
  if (source === "standard-absolute") return t("qibla.sourceStandardAbsolute");
  if (source === "webkit-magnetic") return t("qibla.sourceWebkitMagnetic");
  return "—";
}

function locationErrorKey(error: string | null) {
  if (error === "denied") return "qibla.locationDenied";
  if (error === "unavailable") return "qibla.locationUnavailable";
  if (error === "timeout") return "qibla.locationTimeout";
  if (error === "unsupported") return "qibla.locationUnsupported";
  return "qibla.locationError";
}

function blockReasonKey(reason: string | null) {
  if (reason === "tilted") return "qibla.holdPhoneFlat";
  if (reason === "landscape") return "qibla.rotatePortrait";
  if (reason === "calibration-required") return "qibla.calibrationRequired";
  if (reason === "permission-denied") return "qibla.compassPermissionDenied";
  if (reason === "sensor-timeout") return "qibla.sensorTimeout";
  if (reason === "relative-heading") return "qibla.relativeHeading";
  if (reason === "invalid-heading") return "qibla.invalidHeading";
  if (reason === "magnetic-correction-unavailable") return "qibla.magneticCorrectionUnavailable";
  if (reason === "unsupported") return "qibla.compassUnsupported";
  return null;
}

function getAnnouncement(mode: string, reason: string | null, t: Translate) {
  if (mode === "bearing-ready") return t("qibla.bearingReadyAnnouncement");
  if (mode === "live") return t("qibla.liveReadyAnnouncement");
  if (mode === "aligned") return t("qibla.facingQibla");
  if (mode === "bearing-only") {
    const key = blockReasonKey(reason);
    return key ? t(key) : t("qibla.unavailableAnnouncement");
  }
  if (mode === "location-error") return t("qibla.locationProblem");
  return "";
}

type Translate = (key: string, values?: Record<string, string | number>) => string;
