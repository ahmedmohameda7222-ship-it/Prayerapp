import { NextRequest, NextResponse } from "next/server";
import { fetchBoundedJson } from "@/lib/security/http-boundaries";
import { consumeSecurityRateLimit } from "@/lib/security/rate-limit";

const RATE_LIMIT_WINDOW_SECONDS = 10 * 60;
const MAX_REQUESTS_PER_WINDOW = 30;
const UPSTREAM_TIMEOUT_MS = 5_000;
const MAX_UPSTREAM_BYTES = 64 * 1024;

type GeoapifyReverseResult = {
  formatted?: unknown;
  city?: unknown;
  town?: unknown;
  village?: unknown;
  county?: unknown;
  state?: unknown;
  country?: unknown;
};

function boundedProviderString(value: unknown, maxLength: number) {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  if (!normalized || normalized.length > maxLength) return null;
  return normalized;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get("lat");
  const lon = searchParams.get("lon");

  if (!lat || !lon) {
    return NextResponse.json(
      { ok: false, message: "Missing lat or lon parameter" },
      { status: 400 },
    );
  }

  const latNum = Number(lat);
  const lonNum = Number(lon);

  if (
    !Number.isFinite(latNum) ||
    !Number.isFinite(lonNum) ||
    latNum < -90 ||
    latNum > 90 ||
    lonNum < -180 ||
    lonNum > 180
  ) {
    return NextResponse.json(
      { ok: false, message: "Invalid lat or lon parameter" },
      { status: 400 },
    );
  }

  const apiKey = process.env.GEOAPIFY_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { ok: false, message: "Reverse geocoding is not configured" },
      { status: 503 },
    );
  }

  try {
    const quota = await consumeSecurityRateLimit(request, {
      scope: "geocode-reverse",
      limit: MAX_REQUESTS_PER_WINDOW,
      windowSeconds: RATE_LIMIT_WINDOW_SECONDS,
    });
    if (!quota.allowed) {
      return NextResponse.json(
        { ok: false, message: "Too many reverse geocoding requests" },
        {
          status: 429,
          headers: { "Retry-After": String(Math.max(1, quota.retryAfterSeconds)) },
        },
      );
    }
  } catch {
    return NextResponse.json(
      { ok: false, message: "Reverse geocoding rate limit unavailable" },
      { status: 503, headers: { "Retry-After": "60" } },
    );
  }

  try {
    // Roughly 100 m precision is enough for the human-readable city/location
    // label and greatly improves cache reuse without affecting Qibla math,
    // which continues to use the device's unrounded coordinates locally.
    const roundedLat = latNum.toFixed(3);
    const roundedLon = lonNum.toFixed(3);
    const url = new URL("https://api.geoapify.com/v1/geocode/reverse");
    url.searchParams.set("lat", roundedLat);
    url.searchParams.set("lon", roundedLon);
    url.searchParams.set("format", "json");
    url.searchParams.set("apiKey", apiKey);

    const data = await fetchBoundedJson<{ results?: unknown }>(url, {
      cache: "no-store",
      timeoutMs: UPSTREAM_TIMEOUT_MS,
      maxBytes: MAX_UPSTREAM_BYTES,
    });
    if (!Array.isArray(data.results) || data.results.length === 0) {
      return NextResponse.json({ ok: false, message: "No location label found" }, { status: 404 });
    }

    const result = data.results[0] as GeoapifyReverseResult;
    const formatted = boundedProviderString(result?.formatted, 512);
    if (!formatted) {
      return NextResponse.json({ ok: false, message: "Invalid location response" }, { status: 502 });
    }
    const city = boundedProviderString(result.city, 128)
      || boundedProviderString(result.town, 128)
      || boundedProviderString(result.village, 128)
      || boundedProviderString(result.county, 128);

    return NextResponse.json(
      {
        ok: true,
        formatted,
        city,
        state: boundedProviderString(result.state, 128),
        country: boundedProviderString(result.country, 128),
      },
      {
        headers: {
          "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
        },
      },
    );
  } catch {
    return NextResponse.json(
      { ok: false, message: "Reverse geocoding service unavailable" },
      { status: 502 },
    );
  }
}
