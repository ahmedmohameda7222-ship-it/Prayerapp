"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { AdminShell } from "@/components/layout/AdminShell";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useAdminAuth } from "@/lib/auth/use-admin-auth";
import { getAzkarItems } from "@/lib/data/azkar";
import type { AzkarItem, MasjidDisplaySettings } from "@/lib/types";
import { loadMasjidDisplaySettingsAction, saveMasjidDisplaySettingsAction } from "./actions";

const durationFields = [
  ["fajrPrayerDurationMinutes", "Fajr prayer duration"],
  ["dhuhrPrayerDurationMinutes", "Dhuhr prayer duration"],
  ["asrPrayerDurationMinutes", "Asr prayer duration"],
  ["maghribPrayerDurationMinutes", "Maghrib prayer duration"],
  ["ishaPrayerDurationMinutes", "Isha prayer duration"],
] as const;

export default function MasjidDisplayAdminPage() {
  const { session, isAdmin, loading: authLoading } = useAdminAuth();
  const [settings, setSettings] = useState<MasjidDisplaySettings | null>(null);
  const [azkar, setAzkar] = useState<AzkarItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    getAzkarItems(true).then((items) => {
      if (!cancelled) setAzkar(items);
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const token = session?.access_token;
    if (!token || !isAdmin) return;
    let cancelled = false;
    loadMasjidDisplaySettingsAction(token).then((result) => {
      if (cancelled) return;
      if (!result.success || !result.data) setError(result.error || "Unable to load Masjid Display settings");
      else setSettings(result.data);
      setLoaded(true);
    });
    return () => { cancelled = true; };
  }, [session, isAdmin]);

  const selected = useMemo(() => new Set(settings?.azkarPlaylistIds ?? []), [settings]);

  function updateDuration(key: (typeof durationFields)[number][0], value: string) {
    setSettings((current) => current ? { ...current, [key]: Number(value) } : current);
  }

  function toggleAzkar(id: string, checked: boolean) {
    setSettings((current) => {
      if (!current) return current;
      const next = new Set(current.azkarPlaylistIds);
      if (checked) next.add(id); else next.delete(id);
      return { ...current, azkarPlaylistIds: [...next] };
    });
  }

  function handleSave(event: React.FormEvent) {
    event.preventDefault();
    const token = session?.access_token;
    if (!token || !settings) return;
    setError("");
    setSuccess("");
    startTransition(async () => {
      const result = await saveMasjidDisplaySettingsAction(token, settings);
      if (!result.success || !result.data) {
        setError(result.error || "Unable to save Masjid Display settings");
        return;
      }
      setSettings(result.data);
      setSuccess("Masjid Display settings saved.");
    });
  }

  return (
    <AdminShell title="Masjid Display">
      {authLoading || (!loaded && session && isAdmin) ? <Card className="p-5">Loading display settings…</Card> : null}
      {!authLoading && (!session || !isAdmin) ? <Card className="p-5 text-sm font-bold text-[var(--color-danger)]">Admin authentication is required.</Card> : null}
      {error ? <Card className="p-4 text-sm font-bold text-[var(--color-danger)]">{error}</Card> : null}
      {success ? <Card className="p-4 text-sm font-bold text-[var(--color-success)]">{success}</Card> : null}
      {settings && session && isAdmin ? (
        <form onSubmit={handleSave} className="grid gap-5">
          <Card>
            <h2 className="mb-2 text-lg font-extrabold text-[var(--color-emerald)]">Prayer-in-progress durations</h2>
            <p className="mb-4 text-sm text-[var(--color-muted)]">Set how long each congregational prayer remains in progress on the TV display.</p>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {durationFields.map(([key, label]) => (
                <label key={key} className="grid gap-1 text-sm font-bold text-[var(--color-emerald)]">
                  {label}
                  <input
                    aria-label={label}
                    type="number"
                    min={2}
                    max={120}
                    step={1}
                    required
                    value={settings[key]}
                    onChange={(event) => updateDuration(key, event.target.value)}
                    disabled={isPending}
                    className="min-h-11 rounded-2xl border border-[var(--color-border)] bg-[var(--color-cream)] px-3 text-[var(--color-charcoal)]"
                  />
                </label>
              ))}
            </div>
          </Card>

          <Card>
            <h2 className="mb-2 text-lg font-extrabold text-[var(--color-emerald)]">Azkar playlist</h2>
            <p className="mb-4 text-sm text-[var(--color-muted)]">Choose the canonical Azkar items the TV may rotate through.</p>
            <div className="grid gap-2 md:grid-cols-2">
              {azkar.map((item) => (
                <label key={item.id} className="flex items-start gap-3 rounded-2xl border border-[var(--color-border)] p-3 text-sm">
                  <input
                    type="checkbox"
                    name="azkarPlaylistIds"
                    value={item.id}
                    checked={selected.has(item.id)}
                    onChange={(event) => toggleAzkar(item.id, event.target.checked)}
                    disabled={isPending}
                    className="mt-1 h-5 w-5 accent-[var(--color-emerald)]"
                  />
                  <span><strong>{item.category}</strong><br />{item.arabicText}</span>
                </label>
              ))}
            </div>
          </Card>

          <div><Button type="submit" disabled={isPending}>{isPending ? "Saving…" : "Save display settings"}</Button></div>
        </form>
      ) : null}
    </AdminShell>
  );
}
