import { fetchPrayerappUpstream } from "../../../lib/upstream";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const upstream = await fetchPrayerappUpstream(
      "/api/public/masjid-tv-test",
      request,
      5_000,
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
    return Response.json(
      { error: "tv_test_upstream_unavailable" },
      { status: 503, headers: { "cache-control": "no-store" } },
    );
  }
}
