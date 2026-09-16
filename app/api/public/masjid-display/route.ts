import { buildMasjidDisplayFeed } from "@/lib/masjid-display/build-feed";
import { canonicalJson, etagForFeed, finalizeFeed } from "@/lib/masjid-display/feed-etag";

const CACHE_CONTROL = "public, max-age=0, must-revalidate";

function baseHeaders(etag: string) {
  return {
    "cache-control": CACHE_CONTROL,
    date: new Date().toUTCString(),
    etag,
  };
}

function stripWeakPrefix(value: string) {
  return value.startsWith("W/") ? value.slice(2) : value;
}

function matchesIfNoneMatch(header: string | null, etag: string) {
  if (!header) return false;
  return header
    .split(",")
    .map((value) => value.trim())
    .some((value) => value === "*" || stripWeakPrefix(value) === etag);
}

export async function GET(request: Request) {
  try {
    const body = await buildMasjidDisplayFeed();
    const feed = finalizeFeed(body);
    const etag = etagForFeed(feed);
    const headers = baseHeaders(etag);

    if (matchesIfNoneMatch(request.headers.get("if-none-match"), etag)) {
      return new Response(null, { status: 304, headers });
    }

    return new Response(canonicalJson(feed), {
      status: 200,
      headers: {
        ...headers,
        "content-type": "application/json; charset=utf-8",
      },
    });
  } catch (error) {
    console.error("Masjid Display feed build failed", error);
    return new Response(JSON.stringify({ error: "masjid_display_feed_unavailable" }), {
      status: 503,
      headers: {
        "cache-control": "no-store",
        "content-type": "application/json; charset=utf-8",
        date: new Date().toUTCString(),
      },
    });
  }
}
