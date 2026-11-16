import { NextResponse } from "next/server";
import { getPublishedPrayerScheduleSnapshot } from "@/lib/data/prayer-schedule-snapshot";
import { getPrayerRuntimeAuthority } from "@/lib/data/prayer-settings";
import { buildPublicOfflineSchedule, splitOfflinePrayerRange } from "@/lib/offline-prayer-data";
import { APP_TIME_ZONE, todayIso } from "@/lib/date-utils";

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
    const authority = await getPrayerRuntimeAuthority().catch(() => null);
    const timezone = authority?.timezone ?? APP_TIME_ZONE;
    const ranges = splitOfflinePrayerRange(todayIso(now, timezone));
    // The production RPC enforces a strict <=93-day maximum. Read bounded,
    // contiguous public ranges without changing any production schema.
    const snapshots = await Promise.all(ranges.map(({ from, through }) =>
      getPublishedPrayerScheduleSnapshot({ from, through }),
    ));
    if (snapshots.some((snapshot, index) =>
      snapshot.timezone !== timezone
      || snapshot.from !== ranges[index].from
      || snapshot.through !== ranges[index].through)) {
      throw new Error("Prayer timezone changed during offline snapshot retrieval");
    }
    return NextResponse.json(buildPublicOfflineSchedule({
      rows: snapshots.flatMap(snapshot => snapshot.rows),
      timezone,
      iqamaDelays: authority?.timezone === timezone ? authority.iqamaDelays : null,
      fetchedAt: now.toISOString(),
    }), { headers: PUBLIC_CACHE_HEADERS });
  } catch {
    return NextResponse.json({ error: "Public prayer schedule unavailable" }, {
      status: 503,
      headers: ERROR_HEADERS,
    });
  }
}
