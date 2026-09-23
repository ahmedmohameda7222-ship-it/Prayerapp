import { NextResponse } from "next/server";
import { parseScheduleRequest } from "@/lib/android/contracts";
import { getPublishedPrayerScheduleSnapshot } from "@/lib/data/prayer-schedule-snapshot";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const range = parseScheduleRequest(new URL(request.url));
  if (!range) return NextResponse.json({ error: "Invalid schedule range" }, { status: 400 });

  try {
    const snapshot = await getPublishedPrayerScheduleSnapshot({
      from: range.from,
      through: range.through,
    });
    return NextResponse.json({
      schemaVersion: 1,
      timeZone: snapshot.timezone,
      from: snapshot.from,
      through: snapshot.through,
      generatedAt: new Date().toISOString(),
      rows: snapshot.rows.map((row) => ({
        id: row.id,
        date: row.date,
        fajr: row.fajr,
        sunrise: row.sunrise,
        dhuhr: row.dhuhr,
        asr: row.asr,
        maghrib: row.maghrib,
        isha: row.isha,
        updated_at: row.updatedAt,
      })),
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[android schedule] snapshot query failed", error instanceof Error ? error.message : "unknown");
    return NextResponse.json({ error: "Prayer schedule is unavailable" }, { status: 503 });
  }
}
