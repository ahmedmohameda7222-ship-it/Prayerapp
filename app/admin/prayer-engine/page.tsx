"use client";

import { useEffect, useState } from "react";
import { AdminShell } from "@/components/layout/AdminShell";
import { Card } from "@/components/ui/Card";
import { useAdminAuth } from "@/lib/auth/use-admin-auth";
import type { PrayerCalculationSettings } from "@/lib/prayer-engine/types";
import { PrayerEngineAdmin } from "./PrayerEngineAdmin";
import { loadPrayerEngineSettingsAction } from "./actions";

export default function PrayerEnginePage() {
  const { session, isAdmin, loading } = useAdminAuth();
  const [settings, setSettings] = useState<PrayerCalculationSettings | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = session?.access_token;
    if (!token || !isAdmin) return;
    let cancelled = false;
    loadPrayerEngineSettingsAction(token).then((result) => {
      if (cancelled) return;
      if (!result.success) setError(result.error || "Unable to load Prayer Engine settings");
      else setSettings(result.data ?? null);
      setLoaded(true);
    });
    return () => { cancelled = true; };
  }, [session, isAdmin]);

  return (
    <AdminShell title="Prayer Engine">
      {loading || (!loaded && session && isAdmin) ? <Card className="p-5">Loading Prayer Engine settings…</Card> : null}
      {error ? <Card className="p-5 text-sm font-bold text-[var(--color-danger)]">{error}</Card> : null}
      {!loading && (!session || !isAdmin) ? <Card className="p-5 text-sm font-bold text-[var(--color-danger)]">Admin authentication is required.</Card> : null}
      {loaded && session && isAdmin ? (
        <PrayerEngineAdmin
          initialSettings={settings}
          token={session.access_token}
        />
      ) : null}
    </AdminShell>
  );
}
