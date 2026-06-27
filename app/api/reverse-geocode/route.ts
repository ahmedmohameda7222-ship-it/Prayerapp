import { NextRequest, NextResponse } from "next/server";

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
    const url = `https://api.geoapify.com/v1/geocode/reverse?lat=${latNum}&lon=${lonNum}&format=json&apiKey=${apiKey}`;
    const response = await fetch(url, { next: { revalidate: 0 } });

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
    return NextResponse.json({
      ok: true,
      formatted: result.formatted,
      city: result.city || result.town || result.village || result.county || null,
      state: result.state || null,
      country: result.country || null,
    });
  } catch {
    return NextResponse.json({
      ok: false,
      message: "Reverse geocoding request failed",
    });
  }
}
