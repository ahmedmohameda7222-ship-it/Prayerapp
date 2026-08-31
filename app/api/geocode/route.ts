import { NextRequest, NextResponse } from "next/server";
import { consumeSecurityRateLimit } from "@/lib/security/rate-limit";

const RATE_LIMIT_WINDOW_SECONDS = 10 * 60;
const MAX_REQUESTS_PER_WINDOW = 30;
const MAX_QUERY_LENGTH = 160;
const MAX_RESULTS = 5;

interface GeoapifyResult {
  formatted?: unknown;
  lat?: unknown;
  lon?: unknown;
}

export function normalizeGeoapifyResults(value: unknown) {
  if (!Array.isArray(value)) return [];

  return value
    .slice(0, MAX_RESULTS)
    .flatMap((entry): Array<{ label: string; latitude: number; longitude: number }> => {
      if (!entry || typeof entry !== "object") return [];
      const result = entry as GeoapifyResult;
      if (
        typeof result.formatted !== "string" ||
        !result.formatted.trim() ||
        typeof result.lat !== "number" ||
        !Number.isFinite(result.lat) ||
        result.lat < -90 ||
        result.lat > 90 ||
        typeof result.lon !== "number" ||
        !Number.isFinite(result.lon) ||
        result.lon < -180 ||
        result.lon > 180
      ) {
        return [];
      }

      return [{
        label: result.formatted.trim(),
        latitude: result.lat,
        longitude: result.lon,
      }];
    });
}

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (!query || query.length > MAX_QUERY_LENGTH) {
    return NextResponse.json(
      { ok: false, message: "Invalid location query" },
      { status: 400 },
    );
  }

  const apiKey = process.env.GEOAPIFY_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { ok: false, message: "Geocoding is not configured" },
      { status: 503 },
    );
  }

  try {
    const quota = await consumeSecurityRateLimit(request, {
      scope: "geocode-forward",
      limit: MAX_REQUESTS_PER_WINDOW,
      windowSeconds: RATE_LIMIT_WINDOW_SECONDS,
    });
    if (!quota.allowed) {
      return NextResponse.json(
        { ok: false, message: "Too many geocoding requests" },
        {
          status: 429,
          headers: { "Retry-After": String(Math.max(1, quota.retryAfterSeconds)) },
        },
      );
    }
  } catch {
    return NextResponse.json(
      { ok: false, message: "Geocoding rate limit unavailable" },
      { status: 503, headers: { "Retry-After": "60" } },
    );
  }

  try {
    const url = new URL("https://api.geoapify.com/v1/geocode/search");
    url.searchParams.set("text", query);
    url.searchParams.set("format", "json");
    url.searchParams.set("limit", String(MAX_RESULTS));
    url.searchParams.set("apiKey", apiKey);

    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) {
      return NextResponse.json(
        { ok: false, message: "Geocoding service unavailable" },
        { status: 502 },
      );
    }

    const data = (await response.json()) as { results?: unknown };
    return NextResponse.json({
      ok: true,
      results: normalizeGeoapifyResults(data.results),
    });
  } catch {
    return NextResponse.json(
      { ok: false, message: "Geocoding request failed" },
      { status: 502 },
    );
  }
}
