import "server-only";
import { createServerClient } from "@/lib/supabase/server";
import type { MasjidDisplayTestPayload, MasjidDisplayTestScenario, MasjidDisplayTestState } from "@/lib/types";

interface MasjidDisplayTestStateRow {
  enabled: boolean;
  scenario: MasjidDisplayTestScenario | null;
  payload: MasjidDisplayTestPayload | null;
  started_at: string | null;
  expires_at: string | null;
  updated_at: string;
}

export function mapMasjidDisplayTestStateRow(row: MasjidDisplayTestStateRow): MasjidDisplayTestState {
  return {
    enabled: Boolean(row.enabled),
    scenario: row.scenario,
    payload: row.payload,
    startedAt: row.started_at,
    expiresAt: row.expires_at,
    updatedAt: row.updated_at,
  };
}

export async function getMasjidDisplayTestState(): Promise<MasjidDisplayTestState | null> {
  const client = createServerClient();
  if (!client) throw new Error("Supabase is not configured");
  const { data, error } = await client.from("masjid_display_test_state").select("*").eq("id", "1").maybeSingle();
  if (error) throw new Error("Unable to load Masjid Display test state");
  return data ? mapMasjidDisplayTestStateRow(data as unknown as MasjidDisplayTestStateRow) : null;
}
