"use client";

import { useEffect, useState, useTransition } from "react";
import { AdminShell } from "@/components/layout/AdminShell";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useAdminAuth } from "@/lib/auth/use-admin-auth";
import { MASJID_DISPLAY_TEST_SCENARIOS, type MasjidDisplayTestScenario, type MasjidDisplayTestState } from "@/lib/types";
import { extendTestScenario, loadTestControlStateAction, startTestScenario, stopTestScenario } from "./actions";

function label(scenario: MasjidDisplayTestScenario) {
  return scenario.split("_").map((part) => part[0]?.toUpperCase() + part.slice(1)).join(" ");
}

export default function MasjidDisplayTestControlPage() {
  const { session, isAdmin, loading: authLoading } = useAdminAuth();
  const [state, setState] = useState<MasjidDisplayTestState | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const token = session?.access_token;
    if (!token || !isAdmin) return;
    let cancelled = false;
    loadTestControlStateAction(token).then((result) => {
      if (cancelled) return;
      if (!result.success) setError(result.error || "Unable to load Test Control");
      else setState(result.data ?? null);
      setLoaded(true);
    });
    return () => { cancelled = true; };
  }, [session, isAdmin]);

  useEffect(() => {
    if (!state?.enabled || !state.expiresAt) return;
    const delay = Math.max(0, new Date(state.expiresAt).getTime() - Date.now());
    const timer = window.setTimeout(() => {
      setState((current) => current ? { ...current, enabled: false } : current);
    }, delay);
    return () => window.clearTimeout(timer);
  }, [state?.enabled, state?.expiresAt]);

  function run(scenario: MasjidDisplayTestScenario) {
    const token = session?.access_token;
    if (!token) return;
    setError("");
    setSuccess("");
    startTransition(async () => {
      const result = await startTestScenario(token, scenario);
      if (!result.success || !result.data) return setError(result.error || "Unable to start Test Mode");
      setState(result.data);
      setSuccess(`${label(scenario)} is active on the real TV for 15 minutes.`);
    });
  }

  function extend() {
    const token = session?.access_token;
    if (!token) return;
    setError("");
    setSuccess("");
    startTransition(async () => {
      const result = await extendTestScenario(token);
      if (!result.success || !result.data) return setError(result.error || "Unable to extend Test Mode");
      setState(result.data);
      setSuccess("Test Mode extended by 15 minutes.");
    });
  }

  function stop() {
    const token = session?.access_token;
    if (!token) return;
    setError("");
    setSuccess("");
    startTransition(async () => {
      const result = await stopTestScenario(token);
      if (!result.success || !result.data) return setError(result.error || "Unable to stop Test Mode");
      setState(result.data);
      setSuccess("Test Mode stopped.");
    });
  }

  const active = Boolean(state?.enabled);

  return (
    <AdminShell title="Masjid Display Test Control">
      {authLoading || (!loaded && session && isAdmin) ? <Card className="p-5">Loading Test Control…</Card> : null}
      {!authLoading && (!session || !isAdmin) ? <Card className="p-5 text-sm font-bold text-[var(--color-danger)]">Admin authentication is required.</Card> : null}
      {error ? <Card className="p-4 text-sm font-bold text-[var(--color-danger)]">{error}</Card> : null}
      {success ? <Card className="p-4 text-sm font-bold text-[var(--color-success)]">{success}</Card> : null}

      {session && isAdmin ? <div className="grid gap-5">
        <Card>
          <h2 className="text-lg font-extrabold text-[var(--color-emerald)]">Real TV remote control</h2>
          <p className="mt-2 text-sm text-[var(--color-muted)]">Each scenario is synthetic-only and runs for exactly 15 minutes unless extended or stopped. It does not create prayer, announcement, event, or donation rows.</p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {MASJID_DISPLAY_TEST_SCENARIOS.map((scenario) => (
              <Button key={scenario} type="button" variant={state?.scenario === scenario && active ? "primary" : "ghost"} disabled={isPending} onClick={() => run(scenario)}>
                {label(scenario)}
              </Button>
            ))}
          </div>
        </Card>

        <Card>
          <h2 className="text-lg font-extrabold text-[var(--color-emerald)]">Current state</h2>
          <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
            <div><dt className="font-bold">Status</dt><dd>{active ? "Active" : "Inactive"}</dd></div>
            <div><dt className="font-bold">Scenario</dt><dd>{state?.scenario ? label(state.scenario) : "—"}</dd></div>
            <div><dt className="font-bold">Started</dt><dd>{state?.startedAt || "—"}</dd></div>
            <div><dt className="font-bold">Expires</dt><dd>{state?.expiresAt || "—"}</dd></div>
          </dl>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button type="button" onClick={extend} disabled={isPending || !active}>+15 minutes</Button>
            <Button type="button" variant="ghost" onClick={stop} disabled={isPending || !state?.enabled}>Stop Test Mode</Button>
          </div>
        </Card>
      </div> : null}
    </AdminShell>
  );
}
