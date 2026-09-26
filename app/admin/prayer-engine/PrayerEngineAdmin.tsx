"use client";

import { useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { PrayerScheduleDiff, PrayerSchedulePreview } from "@/lib/prayer-engine/generate";
import type { PrayerCalculationSettings, PrayerKey } from "@/lib/prayer-engine/types";
import type { PrayerRuntimeAuthority } from "@/lib/data/prayer-settings";
import { CERTIFIED_PRAYER_TIMEZONES } from "@/lib/prayer-engine/certified-timezones";
import { PRAYER_ENGINE_OPERATIONAL_APPROVAL_POLICY } from "@/lib/prayer-engine/production-approval";
import {
  calibratePrayerEngineAction,
  commitPrayerRecalculationAction,
  commitPrayerScheduleExtensionAction,
  loadPrayerEngineSettingsAction,
  previewPrayerRecalculationAction,
  previewPrayerScheduleExtensionAction,
  savePrayerEngineSettingsAction,
} from "./actions";

const PRAYERS: PrayerKey[] = ["fajr", "sunrise", "dhuhr", "asr", "maghrib", "isha"];
const IQAMA_PRAYERS = ["fajr", "dhuhr", "asr", "maghrib", "isha"] as const;

type NumericForm = Record<string, string>;

type Props = {
  initialSettings: PrayerCalculationSettings | null;
  initialRuntimeAuthority?: PrayerRuntimeAuthority | null;
  token?: string;
};

function inputClass() {
  return "min-h-11 rounded-xl border border-[var(--color-border)] bg-white px-3 py-2 text-base text-[var(--color-text)]";
}

function settingsToForm(
  settings: PrayerCalculationSettings | null,
  runtimeAuthority?: PrayerRuntimeAuthority | null,
): NumericForm {
  const form: NumericForm = {
    latitude: settings ? String(settings.latitude) : "",
    longitude: settings ? String(settings.longitude) : "",
    timezone: settings?.timezone ?? runtimeAuthority?.timezone ?? "Europe/Berlin",
    fajrAngle: settings ? String(settings.fajrAngle) : "",
    ishaRule: settings?.ishaRule ?? "angle",
    ishaAngle: settings?.ishaAngle == null ? "" : String(settings.ishaAngle),
    ishaMinutesAfterMaghrib: settings?.ishaMinutesAfterMaghrib == null ? "" : String(settings.ishaMinutesAfterMaghrib),
    asrShadowFactor: settings ? String(settings.asrShadowFactor) : "",
    highLatitudeRule: settings?.highLatitudeRule ?? "middle_of_night",
  };
  for (const prayer of PRAYERS) form[`offset_${prayer}`] = settings ? String(settings.offsets[prayer]) : "";
  for (const prayer of IQAMA_PRAYERS) {
    form[`iqama_${prayer}`] = settings
      ? String(settings.iqamaDelays[prayer])
      : runtimeAuthority
        ? String(runtimeAuthority.iqamaDelays[prayer])
        : "";
  }
  return form;
}

function toNumber(value: string, field: string): number {
  if (!value.trim()) throw new Error(`${field} is required`);
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new Error(`Invalid ${field}`);
  return parsed;
}

function buildSettings(form: NumericForm, current: PrayerCalculationSettings | null): PrayerCalculationSettings {
  const ishaRule = form.ishaRule === "fixed_minutes" ? "fixed_minutes" : "angle";
  return {
    latitude: toNumber(form.latitude, "latitude"),
    longitude: toNumber(form.longitude, "longitude"),
    timezone: form.timezone.trim(),
    fajrAngle: toNumber(form.fajrAngle, "Fajr angle"),
    ishaRule,
    ishaAngle: ishaRule === "angle" ? toNumber(form.ishaAngle, "Isha angle") : null,
    ishaMinutesAfterMaghrib: ishaRule === "fixed_minutes" ? toNumber(form.ishaMinutesAfterMaghrib, "Isha fixed minutes") : null,
    asrShadowFactor: toNumber(form.asrShadowFactor, "Asr shadow factor") as 1 | 2,
    highLatitudeRule: form.highLatitudeRule as PrayerCalculationSettings["highLatitudeRule"],
    offsets: Object.fromEntries(PRAYERS.map((prayer) => [prayer, toNumber(form[`offset_${prayer}`], `${prayer} offset`)])) as PrayerCalculationSettings["offsets"],
    iqamaDelays: Object.fromEntries(IQAMA_PRAYERS.map((prayer) => [prayer, toNumber(form[`iqama_${prayer}`], `${prayer} Iqama delay`)])) as PrayerCalculationSettings["iqamaDelays"],
    calculationRevision: current?.calculationRevision ?? 1,
    appliedCalculationRevision: current?.appliedCalculationRevision ?? 0,
  };
}

export function PrayerEngineAdmin({
  initialSettings,
  initialRuntimeAuthority = null,
  token = "",
}: Props) {
  const [settings, setSettings] = useState(initialSettings);
  const [form, setForm] = useState<NumericForm>(() =>
    settingsToForm(initialSettings, initialRuntimeAuthority)
  );
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [extensionPreview, setExtensionPreview] = useState<PrayerSchedulePreview | null>(null);
  const [recalcPreview, setRecalcPreview] = useState<PrayerScheduleDiff | null>(null);
  const [calibration, setCalibration] = useState<string>("");
  const [calibrationStart, setCalibrationStart] = useState("");
  const [calibrationEnd, setCalibrationEnd] = useState("");
  const [recalcStart, setRecalcStart] = useState("");
  const [recalcEnd, setRecalcEnd] = useState("");
  const [isPending, startTransition] = useTransition();

  const needsRecalculation = Boolean(settings && settings.calculationRevision !== settings.appliedCalculationRevision);
  const canUseServerActions = Boolean(token);
  const ishaFixed = form.ishaRule === "fixed_minutes";

  function update(name: string, value: string) {
    setForm((current) => ({ ...current, [name]: value }));
    setMessage("");
    setError("");
  }

  function saveSettings() {
    setError("");
    setMessage("");
    let payload: PrayerCalculationSettings;
    try { payload = buildSettings(form, settings); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Invalid settings"); return; }
    if (!canUseServerActions) return;
    startTransition(async () => {
      const result = await savePrayerEngineSettingsAction(token, payload);
      if (!result.success || !result.data) { setError(result.error || "Unable to save settings"); return; }
      setSettings(result.data);
      setForm(settingsToForm(result.data));
      setExtensionPreview(null);
      setRecalcPreview(null);
      setMessage("Settings saved. Live prayer times were not changed.");
    });
  }

  function calibrate() {
    if (!canUseServerActions || !calibrationStart || !calibrationEnd) return;
    setError("");
    startTransition(async () => {
      const result = await calibratePrayerEngineAction(token, calibrationStart, calibrationEnd);
      if (!result.success || !result.data) { setError(result.error || "Calibration failed"); return; }
      setCalibration(`Compared ${result.data.comparedDays} day(s); ${result.data.outOfToleranceCount} prayer value(s) are outside ±1 minute.`);
    });
  }

  function previewExtension() {
    if (!canUseServerActions) return;
    setError("");
    startTransition(async () => {
      const result = await previewPrayerScheduleExtensionAction(token);
      if (!result.success || !result.data) { setError(result.error || "Preview failed"); return; }
      setExtensionPreview(result.data);
      setMessage(`Extension preview: ${result.data.rows.length} row(s), ${result.data.startDate}–${result.data.endDate}.`);
    });
  }

  function commitExtension() {
    if (!canUseServerActions || !extensionPreview) return;
    startTransition(async () => {
      const result = await commitPrayerScheduleExtensionAction(token, extensionPreview);
      if (!result.success) { setError(result.error || "Extension failed"); return; }
      setExtensionPreview(null);
      setMessage(`Extended schedule by ${result.data ?? 0} row(s).`);
    });
  }

  function previewRecalculation() {
    if (!canUseServerActions || !recalcStart || !recalcEnd) return;
    setError("");
    startTransition(async () => {
      const result = await previewPrayerRecalculationAction(token, recalcStart, recalcEnd);
      if (!result.success || !result.data) { setError(result.error || "Preview failed"); return; }
      setRecalcPreview(result.data);
      setMessage(`Recalculation preview: ${result.data.changedRowCount} changed row(s), ${result.data.changedPrayerCount} changed prayer value(s).`);
    });
  }

  function commitRecalculation() {
    if (!canUseServerActions || !recalcPreview) return;
    if (!window.confirm("Apply this future prayer schedule diff?")) return;
    startTransition(async () => {
      const result = await commitPrayerRecalculationAction(token, recalcPreview);
      if (!result.success) { setError(result.error || "Recalculation failed"); return; }
      setRecalcPreview(null);

      const refreshed = await loadPrayerEngineSettingsAction(token);
      if (!refreshed.success || !refreshed.data) {
        setError(refreshed.error || "Recalculation applied, but Prayer Engine settings could not be refreshed.");
        setMessage(`Recalculated ${result.data ?? 0} future row(s). Reload this page before extending the schedule.`);
        return;
      }

      setSettings(refreshed.data);
      setForm(settingsToForm(refreshed.data));
      setMessage(`Recalculated ${result.data ?? 0} future row(s).`);
    });
  }

  const status = useMemo(() => {
    if (!settings) return "No prayer settings configured";
    return needsRecalculation ? "Needs Recalculation" : "Calculation revision applied";
  }, [settings, needsRecalculation]);

  return (
    <div className="grid gap-5">
      <Card className="grid gap-2 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-extrabold">Prayer Engine</h2>
          <span className="rounded-full border px-3 py-1 text-sm font-bold">{status}</span>
        </div>
        <p className="text-sm text-[var(--color-muted)]">{PRAYER_ENGINE_OPERATIONAL_APPROVAL_POLICY}</p>
        {settings ? <p className="text-sm text-[var(--color-muted)]">Calculation revision {settings.calculationRevision}; applied {settings.appliedCalculationRevision}.</p> : null}
      </Card>

      <Card className="grid gap-4 p-5">
        <h3 className="font-extrabold">Calculation and shared Iqama settings</h3>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="grid gap-1 text-sm font-bold">Latitude<input className={inputClass()} value={form.latitude} onChange={(e) => update("latitude", e.target.value)} inputMode="decimal" /></label>
          <label className="grid gap-1 text-sm font-bold">Longitude<input className={inputClass()} value={form.longitude} onChange={(e) => update("longitude", e.target.value)} inputMode="decimal" /></label>
          <label className="grid gap-1 text-sm font-bold">Timezone<select className={inputClass()} value={form.timezone} onChange={(e) => update("timezone", e.target.value)}>{CERTIFIED_PRAYER_TIMEZONES.map((timezone) => <option key={timezone} value={timezone}>{timezone}</option>)}</select></label>
          <label className="grid gap-1 text-sm font-bold">Fajr angle<input className={inputClass()} type="number" step="0.1" value={form.fajrAngle} onChange={(e) => update("fajrAngle", e.target.value)} /></label>
          <label className="grid gap-1 text-sm font-bold">Isha rule<select className={inputClass()} value={form.ishaRule} onChange={(e) => update("ishaRule", e.target.value)}><option value="angle">Angle</option><option value="fixed_minutes">Fixed minutes after Maghrib</option></select></label>
          {ishaFixed ? (
            <label className="grid gap-1 text-sm font-bold">Isha fixed minutes after Maghrib<input className={inputClass()} type="number" min={0} max={240} value={form.ishaMinutesAfterMaghrib} onChange={(e) => update("ishaMinutesAfterMaghrib", e.target.value)} /></label>
          ) : (
            <label className="grid gap-1 text-sm font-bold">Isha angle<input className={inputClass()} type="number" step="0.1" value={form.ishaAngle} onChange={(e) => update("ishaAngle", e.target.value)} /></label>
          )}
          <label className="grid gap-1 text-sm font-bold">Asr setting<select className={inputClass()} value={form.asrShadowFactor} onChange={(e) => update("asrShadowFactor", e.target.value)}><option value="">Select</option><option value="1">Shadow factor 1</option><option value="2">Shadow factor 2</option></select></label>
          <label className="grid gap-1 text-sm font-bold">High-latitude rule<select className={inputClass()} value={form.highLatitudeRule} onChange={(e) => update("highLatitudeRule", e.target.value)}><option value="middle_of_night">Middle of night</option><option value="seventh_of_night">Seventh of night</option><option value="twilight_angle">Twilight angle</option></select></label>
        </div>

        <div className="grid gap-3">
          <h4 className="font-bold">Calculation offsets (minutes)</h4>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{PRAYERS.map((prayer) => <label key={prayer} className="grid gap-1 text-sm font-bold">{prayer[0].toUpperCase() + prayer.slice(1)} offset<input className={inputClass()} type="number" min={-60} max={60} value={form[`offset_${prayer}`]} onChange={(e) => update(`offset_${prayer}`, e.target.value)} /></label>)}</div>
        </div>

        <div className="grid gap-3">
          <h4 className="font-bold">Shared Iqama delays (minutes)</h4>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{IQAMA_PRAYERS.map((prayer) => <label key={prayer} className="grid gap-1 text-sm font-bold">{prayer[0].toUpperCase() + prayer.slice(1)} Iqama delay<input className={inputClass()} type="number" min={0} max={180} value={form[`iqama_${prayer}`]} onChange={(e) => update(`iqama_${prayer}`, e.target.value)} /></label>)}</div>
        </div>
        <Button type="button" onClick={saveSettings} disabled={isPending || !canUseServerActions}>Save settings only</Button>
        <p className="text-xs text-[var(--color-muted)]">Saving settings never changes live prayer_times. Calculation-input changes increment the calculation revision.</p>
      </Card>

      <Card className="grid gap-4 p-5">
        <h3 className="font-extrabold">Calibrate Against Existing Schedule</h3>
        <div className="grid gap-3 sm:grid-cols-2"><label className="grid gap-1 text-sm font-bold">Calibration start<input className={inputClass()} type="date" value={calibrationStart} onChange={(e) => setCalibrationStart(e.target.value)} /></label><label className="grid gap-1 text-sm font-bold">Calibration end<input className={inputClass()} type="date" value={calibrationEnd} onChange={(e) => setCalibrationEnd(e.target.value)} /></label></div>
        <Button type="button" onClick={calibrate} disabled={isPending || !canUseServerActions || !settings || !calibrationStart || !calibrationEnd}>Calibrate Against Existing Schedule</Button>
        {calibration ? <p className="text-sm font-semibold">{calibration}</p> : null}
      </Card>

      <Card className="grid gap-4 p-5">
        <h3 className="font-extrabold">Extend Schedule +1 Year</h3>
        <Button type="button" onClick={previewExtension} disabled={isPending || !canUseServerActions || !settings || needsRecalculation}>Preview Extend Schedule +1 Year</Button>
        <Button type="button" onClick={commitExtension} disabled={isPending || !extensionPreview || needsRecalculation}>Extend Schedule +1 Year</Button>
        {extensionPreview ? <p className="text-sm">Preview ready: {extensionPreview.rows.length} missing date(s), {extensionPreview.startDate}–{extensionPreview.endDate}.</p> : null}
      </Card>

      <Card className="grid gap-4 p-5">
        <h3 className="font-extrabold">Recalculate Future Schedule</h3>
        <div className="grid gap-3 sm:grid-cols-2"><label className="grid gap-1 text-sm font-bold">Recalculation start<input className={inputClass()} type="date" value={recalcStart} onChange={(e) => setRecalcStart(e.target.value)} /></label><label className="grid gap-1 text-sm font-bold">Recalculation end<input className={inputClass()} type="date" value={recalcEnd} onChange={(e) => setRecalcEnd(e.target.value)} /></label></div>
        <Button type="button" onClick={previewRecalculation} disabled={isPending || !canUseServerActions || !settings || !recalcStart || !recalcEnd}>Preview Recalculation</Button>
        <Button type="button" onClick={commitRecalculation} disabled={isPending || !recalcPreview}>Commit Recalculation</Button>
        {recalcPreview ? <p className="text-sm">Diff ready: {recalcPreview.changedRowCount} row(s), {recalcPreview.changedPrayerCount} prayer value(s) change.</p> : null}
      </Card>

      {message ? <Card className="p-4 text-sm font-bold text-[var(--color-success)]">{message}</Card> : null}
      {error ? <Card className="p-4 text-sm font-bold text-[var(--color-danger)]">{error}</Card> : null}
    </div>
  );
}
