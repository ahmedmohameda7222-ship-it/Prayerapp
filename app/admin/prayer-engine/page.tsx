"use client";

import { useEffect, useState } from "react";
import { AdminShell } from "@/components/layout/AdminShell";
import { Card } from "@/components/ui/Card";
import { useAdminAuth } from "@/lib/auth/use-admin-auth";
import type { PrayerCalculationSettings } from "@/lib/prayer-engine/types";
import type { PrayerRuntimeAuthority } from "@/lib/data/prayer-settings";
import { PrayerEngineAdmin } from "./PrayerEngineAdmin";
import {
  loadPrayerEngineRuntimeAuthorityAction,
  loadPrayerEngineSettingsAction,
} from "./actions";

export default function PrayerEnginePage() {
  const { session, isAdmin, loading } = useAdminAuth();
  const [settings, setSettings] = useState<PrayerCalculationSettings | null>(null);
  const [runtimeAuthority, setRuntimeAuthority] = useState<PrayerRuntimeAuthority | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = session?.access_token;
    if (!token || !isAdmin) return;
    let cancelled = false;
    Promise.all([
      loadPrayerEngineSettingsAction(token),
      loadPrayerEngineRuntimeAuthorityAction(token),
    ]).then(([settingsResult, authorityResult]) => {
      if (cancelled) return;
      if (!settingsResult.success) {
        setError(settingsResult.error || "Unable to load Prayer Engine settings");
      } else {
        setSettings(settingsResult.data ?? null);
      }
      if (!authorityResult.success) {
        setError(authorityResult.error || "Unable to load Prayer runtime authority");
      } else {
        setRuntimeAuthority(authorityResult.data ?? null);
      }
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
          initialRuntimeAuthority={runtimeAuthority}
          token={session.access_token}
        />
      ) : null}
    </AdminShell>
  );
}
