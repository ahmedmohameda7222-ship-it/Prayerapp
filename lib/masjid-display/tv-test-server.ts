import "server-only";

import { createServerClient } from "@/lib/supabase/server";
import { activeTvTestFromRow, type TvTestCommand } from "./tv-test-control";

export async function readTvTestCommand(now = new Date()): Promise<TvTestCommand | null> {
  const client = createServerClient();
  if (!client) throw new Error("TV test database is not configured");
  const { data, error } = await client
    .from("masjid_display_tv_test")
    .select("scenario,prayer,started_at,expires_at")
    .eq("id", 1)
    .maybeSingle();
  if (error) throw new Error("TV test status unavailable");
  return activeTvTestFromRow(data, now);
}
