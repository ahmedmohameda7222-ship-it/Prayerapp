import { NextResponse } from "next/server";
import { parseScheduleRequest } from "@/lib/android/contracts";
import { getRuntimePrayerSettings } from "@/lib/data/prayer-settings";
import { createServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const range = parseScheduleRequest(new URL(request.url));
  if (!range) return NextResponse.json({ error: "Invalid schedule range" }, { status: 400 });
  const client = createServerClient();
  if (!client) return NextResponse.json({ error: "Prayer schedule is unavailable" }, { status: 503 });
  const prayerSettings = await getRuntimePrayerSettings().catch(() => null);
  if (!prayerSettings) {
    return NextResponse.json({ error: "Prayer schedule is unavailable" }, { status: 503 });
  }
  const { data, error } = await client
    .from("prayer_times")
    .select("id, date, fajr, sunrise, dhuhr, asr, maghrib, isha, updated_at")
    .eq("published", true)
    .gte("date", range.from)
    .lte("date", range.through)
    .order("date", { ascending: true });
  if (error) {
    console.error("[android schedule] query failed", error.message);
    return NextResponse.json({ error: "Could not load published prayer schedule" }, { status: 500 });
  }
  return NextResponse.json({
    schemaVersion: 1,
    timeZone: prayerSettings.timezone,
    from: range.from,
    through: range.through,
    generatedAt: new Date().toISOString(),
    rows: data || [],
  }, { headers: { "Cache-Control": "no-store" } });
}
