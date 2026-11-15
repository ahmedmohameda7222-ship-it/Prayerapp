"use client";

import { useEffect, useState, useTransition } from "react";
import { AdminShell } from "@/components/layout/AdminShell";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useAdminAuth } from "@/lib/auth/use-admin-auth";
import type { TvTestCommand, TvTestPrayer, TvTestScenario } from "@/lib/masjid-display/tv-test-control";
import { getTvTestStatusAction, startTvTestAction, stopTvTestAction } from "./actions";

const PRAYERS: { key: TvTestPrayer; label: string }[] = [
  { key: "fajr", label: "Fajr / الفجر" },
  { key: "dhuhr", label: "Dhuhr / الظهر" },
  { key: "asr", label: "Asr / العصر" },
  { key: "maghrib", label: "Maghrib / المغرب" },
  { key: "isha", label: "Isha / العشاء" },
];

const DAILY: { scenario: TvTestScenario; label: string; description: string }[] = [
  { scenario: "PRAYER_APPROACHING", label: "Adhan Countdown", description: "Last two minutes before the selected prayer" },
  { scenario: "PRAYER_TIME_NOW", label: "Adhan Now", description: "Show the Adhan announcement" },
  { scenario: "WAITING_FOR_IQAMA", label: "Iqama Countdown", description: "Final countdown before Iqama" },
  { scenario: "IQAMA_NOW", label: "Iqama Now", description: "Show the Iqama announcement" },
  { scenario: "PRAYER_IN_PROGRESS", label: "Prayer in Progress", description: "Current live prayer-in-progress layout" },
  { scenario: "POST_PRAYER_AZKAR", label: "After Prayer Azkar", description: "Fixed four-minute Hisn al-Muslim board" },
];

const OTHER: { scenario: TvTestScenario; label: string; description: string }[] = [
  { scenario: "FRIDAY_MODE", label: "Friday Countdown", description: "First upcoming Friday service countdown" },
  { scenario: "JUMUAH_NOW", label: "Friday Now", description: "Current live Jumuah state (sermon integration pending)" },
  { scenario: "NORMAL", label: "Normal Rotation", description: "Real published eligible content, ten-second slides" },
  { scenario: "NEXT_PRAYER", label: "Next Prayer", description: "Show upcoming Adhan and Iqama" },
  { scenario: "AZKAR", label: "Normal Azkar", description: "Published morning/evening Azkar" },
  { scenario: "ANNOUNCEMENT", label: "Announcement", description: "Existing published ordinary announcement" },
  { scenario: "SPECIAL", label: "Special Announcement", description: "Existing published special announcement" },
  { scenario: "EVENT", label: "Event", description: "Existing published event" },
  { scenario: "CAMPAIGN", label: "Donation Campaign", description: "Existing published campaign" },
  { scenario: "MAGHRIB_PROGRAM", label: "Maghrib Program", description: "Program if configured in the Feed" },
];

export default function TvTestAdminPage() {
  const { session, isAdmin, loading: authLoading } = useAdminAuth();
  const token = session?.access_token;
  const [prayer, setPrayer] = useState<TvTestPrayer>("asr");
  const [active, setActive] = useState<TvTestCommand | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [nowMs, setNowMs] = useState(0);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const timer = window.setInterval(() => setNowMs(Date.now()), 1_000);
    setNowMs(Date.now());
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!token || !isAdmin) return;
    let disposed = false;
    const refresh = async () => {
      const result = await getTvTestStatusAction(token);
      if (disposed) return;
      setReady(true);
      if (result.success) {
        setActive(result.command ?? null);
        setError("");
      } else {
        setError(result.error ?? "Unable to read test status");
      }
    };
    void refresh();
    const timer = window.setInterval(() => void refresh(), 3_000);
    return () => { disposed = true; window.clearInterval(timer); };
  }, [token, isAdmin]);

  function start(scenario: TvTestScenario, withPrayer: boolean) {
    if (!token || pending) return;
    setError("");
    setMessage("");
    startTransition(async () => {
      const result = await startTvTestAction(token, { scenario, prayer: withPrayer ? prayer : null });
      if (result.success) {
        setActive(result.command ?? null);
        setMessage("Test command saved. The TV will apply it on its next status refresh.");
      } else {
        setError(result.error ?? "Unable to start TV Test");
      }
    });
  }

  function stop() {
    if (!token || pending) return;
    setError("");
    setMessage("");
    startTransition(async () => {
      const result = await stopTvTestAction(token);
      if (result.success) {
        setActive(null);
        setMessage("Test stopped. The TV returns to its live schedule on the next refresh.");
      } else {
        setError(result.error ?? "Unable to stop TV Test");
      }
    });
  }

  const remaining = active && nowMs < Date.parse(active.expiresAt)
    ? Math.max(0, Math.ceil((Date.parse(active.expiresAt) - nowMs) / 1_000))
    : 0;
  const isRunning = remaining > 0;

  return (
    <AdminShell title="TV Test">
      <div className="grid max-w-6xl gap-5">
        <Card className="p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-2xl">
              <h2 className="text-xl font-extrabold text-[var(--color-emerald)]">Live mosque TV rehearsal</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">
                These buttons temporarily change what the physical TV displays, not prayer schedules,
                Iqama delays or other Admin settings. Use only when demonstrating the screen.
              </p>
            </div>
            <div className="flex flex-col gap-2 text-right">
              <p className="text-sm font-bold" role="status" data-testid="tv-test-status">
                {isRunning ? `TEST MODE: ${active?.scenario} (${remaining}s remaining)`
                  : ready ? "Live mode — no active test" : "Loading test status…"}
              </p>
              <Button type="button" onClick={stop} disabled={!token || !isAdmin || pending}>
                Stop Test — Return to Live
              </Button>
            </div>
          </div>
          <p className="mt-3 text-sm font-semibold text-[var(--color-muted)]">
            Every test automatically stops after 3 minutes. Switching tests replaces the current test.
            If the network fails, the TV will discard the command when it expires.
          </p>
          {error ? <p className="mt-3 text-sm font-bold text-red-700" role="alert">{error}</p> : null}
          {message ? <p className="mt-3 text-sm font-bold text-[var(--color-emerald)]" role="status">{message}</p> : null}
          {!authLoading && (!token || !isAdmin) ? (
            <p className="mt-3 text-sm font-bold text-red-700">Admin login required.</p>
          ) : null}
        </Card>

        <Card className="p-5">
          <h2 className="text-lg font-extrabold text-[var(--color-emerald)]">Daily prayer scenarios</h2>
          <label className="mt-3 grid max-w-sm gap-1 text-sm font-semibold">
            Choose prayer
            <select
              aria-label="Choose prayer for TV test"
              value={prayer}
              onChange={(event) => setPrayer(event.target.value as TvTestPrayer)}
              disabled={pending || !token}
              className="min-h-11 rounded-xl border border-[var(--color-border)] bg-white px-3"
            >
              {PRAYERS.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}
            </select>
          </label>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {DAILY.map((item) => (
              <button
                key={item.scenario}
                type="button"
                disabled={!token || !isAdmin || pending}
                onClick={() => start(item.scenario, true)}
                className="min-h-24 rounded-xl border border-[var(--color-border)] bg-[var(--color-cream)] p-4 text-left transition hover:border-[var(--color-emerald)] disabled:opacity-50"
              >
                <strong className="block text-[var(--color-emerald)]">{item.label}</strong>
                <span className="mt-1 block text-sm text-[var(--color-muted)]">{item.description}</span>
              </button>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="text-lg font-extrabold text-[var(--color-emerald)]">Friday and normal content</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {OTHER.map((item) => (
              <button
                key={item.scenario}
                type="button"
                disabled={!token || !isAdmin || pending}
                onClick={() => start(item.scenario, false)}
                className="min-h-24 rounded-xl border border-[var(--color-border)] bg-[var(--color-cream)] p-4 text-left transition hover:border-[var(--color-emerald)] disabled:opacity-50"
              >
                <strong className="block text-[var(--color-emerald)]">{item.label}</strong>
                <span className="mt-1 block text-sm text-[var(--color-muted)]">{item.description}</span>
              </button>
            ))}
          </div>
          <p className="mt-4 text-sm text-[var(--color-muted)]">
            Only real published Feed content is used. If a content family is empty, no demo item is invented.
            Friday sermons in German and the new prayer blackout are separate features not yet deployed on this branch.
          </p>
        </Card>
      </div>
    </AdminShell>
  );
}
