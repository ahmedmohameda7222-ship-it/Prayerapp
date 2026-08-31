import { NextRequest, NextResponse } from "next/server";
import { consumeSecurityRateLimit } from "@/lib/security/rate-limit";

const RATE_LIMIT_WINDOW_SECONDS = 10 * 60;
const MAX_REQUESTS_PER_WINDOW = 30;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get("lat");
  const lon = searchParams.get("lon");

  if (!lat || !lon) {
    return NextResponse.json(
      { ok: false, message: "Missing lat or lon parameter" },
      { status: 400 }
    );
  }

  const latNum = parseFloat(lat);
  const lonNum = parseFloat(lon);

  if (
    Number.isNaN(latNum) ||
    Number.isNaN(lonNum) ||
    latNum < -90 ||
    latNum > 90 ||
    lonNum < -180 ||
    lonNum > 180
  ) {
    return NextResponse.json(
      { ok: false, message: "Invalid lat or lon parameter" },
      { status: 400 }
    );
  }

  const apiKey = process.env.GEOAPIFY_API_KEY;
  if (!apiKey) {
    return NextResponse.json({
      ok: false,
      message: "Reverse geocoding is not configured",
    });
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
    const url = `https://api.geoapify.com/v1/geocode/reverse?lat=${roundedLat}&lon=${roundedLon}&format=json&apiKey=${apiKey}`;
    const response = await fetch(url, { next: { revalidate: 24 * 60 * 60 } });

    if (!response.ok) {
      return NextResponse.json({
        ok: false,
        message: "Reverse geocoding service unavailable",
      });
    }

    const data = await response.json();

    if (!data.results || data.results.length === 0) {
      return NextResponse.json({
        ok: false,
        message: "No location label found",
      });
    }

    const result = data.results[0];
    return NextResponse.json(
      {
        ok: true,
        formatted: result.formatted,
        city: result.city || result.town || result.village || result.county || null,
        state: result.state || null,
        country: result.country || null,
      },
      {
        headers: {
          "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
        },
      },
    );
  } catch {
    return NextResponse.json({
      ok: false,
      message: "Reverse geocoding request failed",
    });
  }
}
