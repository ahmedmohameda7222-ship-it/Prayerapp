import { NextResponse } from "next/server";
import { getPublishedPrayerScheduleSnapshot } from "@/lib/data/prayer-schedule-snapshot";
import { getPrayerRuntimeAuthority } from "@/lib/data/prayer-settings";
import { buildPublicOfflineSchedule } from "@/lib/offline-prayer-data";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// A cacheable, account-independent read-only resource. The Service Worker
// validates it before storing a local copy. No auth, account or admin data.
const PUBLIC_CACHE_HEADERS = {
  "Cache-Control": "public, max-age=0, must-revalidate",
  "X-Content-Type-Options": "nosniff",
};
const ERROR_HEADERS = { "Cache-Control": "no-store" };

export async function GET() {
  try {
    const now = new Date();
    const [snapshot, authority] = await Promise.all([
      getPublishedPrayerScheduleSnapshot({ now, daysBefore: 1, daysAfter: 365 }),
      getPrayerRuntimeAuthority().catch(() => null),
    ]);
    return NextResponse.json(buildPublicOfflineSchedule({
      rows: snapshot.rows,
      timezone: snapshot.timezone,
      iqamaDelays: authority?.timezone === snapshot.timezone ? authority.iqamaDelays : null,
      fetchedAt: now.toISOString(),
    }), { headers: PUBLIC_CACHE_HEADERS });
  } catch {
    return NextResponse.json({ error: "Public prayer schedule unavailable" }, {
      status: 503,
      headers: ERROR_HEADERS,
    });
  }
}
