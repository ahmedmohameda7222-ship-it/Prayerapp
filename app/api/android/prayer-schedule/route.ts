import { NextResponse } from "next/server";
import { parseScheduleRequest } from "@/lib/android/contracts";
import { getPublishedPrayerScheduleSnapshot } from "@/lib/data/prayer-schedule-snapshot";
import { addDaysIso, zonedDateTime } from "@/lib/date-utils";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const range = parseScheduleRequest(new URL(request.url));
  if (!range) return NextResponse.json({ error: "Invalid schedule range" }, { status: 400 });

  try {
    const snapshot = await getPublishedPrayerScheduleSnapshot({
      from: range.from,
      through: range.through,
    });
    const scheduleValidUntil = zonedDateTime(
      addDaysIso(snapshot.through, 1),
      "00:00",
      snapshot.timezone,
    ).toISOString();

    return NextResponse.json({
      schemaVersion: 1,
      timeZone: snapshot.timezone,
      from: snapshot.from,
      through: snapshot.through,
      scheduleValidUntil,
      generatedAt: new Date().toISOString(),
      rows: snapshot.rows.map((row) => ({
        id: row.id,
        date: row.date,
        fajr: row.fajr,
        fajrAt: zonedDateTime(row.date, row.fajr, snapshot.timezone).toISOString(),
        sunrise: row.sunrise,
        sunriseAt: zonedDateTime(row.date, row.sunrise, snapshot.timezone).toISOString(),
        dhuhr: row.dhuhr,
        dhuhrAt: zonedDateTime(row.date, row.dhuhr, snapshot.timezone).toISOString(),
        asr: row.asr,
        asrAt: zonedDateTime(row.date, row.asr, snapshot.timezone).toISOString(),
        maghrib: row.maghrib,
        maghribAt: zonedDateTime(row.date, row.maghrib, snapshot.timezone).toISOString(),
        isha: row.isha,
        ishaAt: zonedDateTime(row.date, row.isha, snapshot.timezone).toISOString(),
        updated_at: row.updatedAt,
      })),
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[android schedule] snapshot query failed", error instanceof Error ? error.message : "unknown");
    return NextResponse.json({ error: "Prayer schedule is unavailable" }, { status: 503 });
  }
}
