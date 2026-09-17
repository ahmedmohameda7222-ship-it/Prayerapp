import "server-only";

import { createServerClient } from "@/lib/supabase/server";

export async function getMasjidDisplayFeedRevision(): Promise<string> {
  const client = createServerClient();
  if (!client) throw new Error("Supabase is not configured");

  const { data, error } = await client
    .from("masjid_display_feed_revision")
    .select("updated_at")
    .eq("id", "1")
    .single();

  if (error || !data?.updated_at) {
    throw new Error("Unable to load Masjid Display feed revision");
  }

  const parsed = Date.parse(String(data.updated_at));
  if (!Number.isFinite(parsed)) {
    throw new Error("Invalid Masjid Display feed revision");
  }

  return new Date(parsed).toISOString();
}
