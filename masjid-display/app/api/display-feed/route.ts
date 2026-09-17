import { fetchPrayerappUpstream } from "../../../lib/upstream";

const FEED_PATH = "/api/public/masjid-display" as const;
const FEED_TIMEOUT_MS = 8_000;
const FORWARDED_HEADERS = ["cache-control", "content-type", "date", "etag"] as const;

function headersFromUpstream(upstream: Response) {
  const headers = new Headers();
  for (const name of FORWARDED_HEADERS) {
    const value = upstream.headers.get(name);
    if (value) headers.set(name, value);
  }
  if (upstream.status >= 500 && !headers.has("cache-control")) {
    headers.set("cache-control", "no-store");
  }
  return headers;
}

function statusAllowsBody(status: number) {
  return status !== 204 && status !== 205 && status !== 304;
}

export async function GET(request: Request) {
  try {
    const upstream = await fetchPrayerappUpstream(FEED_PATH, request, FEED_TIMEOUT_MS);
    const body = statusAllowsBody(upstream.status) ? await upstream.arrayBuffer() : null;
    return new Response(body, {
      status: upstream.status,
      headers: headersFromUpstream(upstream),
    });
  } catch {
    return Response.json(
      { error: "masjid_display_upstream_unavailable" },
      {
        status: 503,
        headers: {
          "cache-control": "no-store",
          date: new Date().toUTCString(),
        },
      },
    );
  }
}
