"use client";

import { useCallback, useEffect, useState } from "react";
import { usePublicAuth } from "@/components/providers/AuthProvider";
import { createClient } from "@/lib/supabase/client";

const LEGACY_FAVORITES_KEY = "azkar_favorites_v1";

export function useSavedAzkar(validIds: Set<string>) {
  const { user } = usePublicAuth();
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(() => new Set());
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoaded(false);
      setError(false);
      if (!user) {
        setFavoriteIds(new Set());
        setLoaded(true);
        return;
      }

      const client = createClient();
      if (!client) {
        setError(true);
        setLoaded(true);
        return;
      }

      try {
        let legacyIds: string[] = [];
        try {
          const parsed = JSON.parse(window.localStorage.getItem(LEGACY_FAVORITES_KEY) || "[]") as unknown;
          if (Array.isArray(parsed)) {
            legacyIds = parsed.filter((id): id is string => typeof id === "string" && validIds.has(id));
          }
        } catch {
          legacyIds = [];
        }

        if (legacyIds.length) {
          const { error: importError } = await client.from("user_saved_azkar").upsert(
            legacyIds.map((azkarId) => ({ user_id: user.id, azkar_id: azkarId })),
            { onConflict: "user_id,azkar_id", ignoreDuplicates: true },
          );
          if (importError) throw importError;
          window.localStorage.removeItem(LEGACY_FAVORITES_KEY);
        }

        const { data, error: queryError } = await client
          .from("user_saved_azkar")
          .select("azkar_id")
          .eq("user_id", user.id);
        if (queryError) throw queryError;
        if (!active) return;
        setFavoriteIds(new Set((data || []).map((row) => row.azkar_id).filter((id) => validIds.has(id))));
      } catch {
        if (active) setError(true);
      } finally {
        if (active) setLoaded(true);
      }
    };
    void load();
    return () => { active = false; };
  }, [user, validIds]);

  const setSaved = useCallback(async (azkarId: string, saved: boolean) => {
    if (!user || !validIds.has(azkarId)) return "auth-required" as const;
    const client = createClient();
    if (!client) return "error" as const;

    if (saved) {
      const { error: saveError } = await client
        .from("user_saved_azkar")
        .upsert({ user_id: user.id, azkar_id: azkarId }, { onConflict: "user_id,azkar_id" });
      if (saveError) return "error" as const;
    } else {
      const { error: deleteError } = await client
        .from("user_saved_azkar")
        .delete()
        .eq("user_id", user.id)
        .eq("azkar_id", azkarId);
      if (deleteError) return "error" as const;
    }

    setFavoriteIds((current) => {
      const next = new Set(current);
      if (saved) next.add(azkarId);
      else next.delete(azkarId);
      return next;
    });
    setError(false);
    return saved ? "saved" as const : "removed" as const;
  }, [user, validIds]);

  return { user, favoriteIds, loaded, error, setSaved };
}
