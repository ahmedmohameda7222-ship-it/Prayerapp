import { fetchPrayerappUpstream } from "../../../lib/upstream";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const date = new URL(request.url).searchParams.get("date") ?? "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return Response.json({ error: "invalid_friday_date" }, {
      status: 400, headers: { "cache-control": "no-store" },
    });
  }
  try {
    const upstream = await fetchPrayerappUpstream(
      "/api/public/masjid-tv-khutbah",
      request,
      5_000,
      date,
    );
    const body = await upstream.text();
    return new Response(body, {
      status: upstream.status,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "no-store",
        date: upstream.headers.get("date") ?? new Date().toUTCString(),
      },
    });
  } catch {
    return Response.json({ error: "khutbah_upstream_unavailable" }, {
      status: 503, headers: { "cache-control": "no-store" },
    });
  }
}
