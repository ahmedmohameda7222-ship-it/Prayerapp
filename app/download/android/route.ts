import { NextResponse } from "next/server";
import { getLatestAndroidRelease } from "@/lib/android-release-server";

export const runtime = "nodejs";

export async function GET() {
  try {
    const selected = await getLatestAndroidRelease();
    if (!selected) {
      return new NextResponse("The Android application is not available for public download yet.", {
        status: 503,
        headers: { "Cache-Control": "public, max-age=60, s-maxage=300" },
      });
    }
    return NextResponse.redirect(selected.downloadUrl, 307);
  } catch (error) {
    console.error("[android download] release lookup failed", error);
    return new NextResponse("The Android application download is temporarily unavailable.", {
      status: 503,
      headers: { "Cache-Control": "no-store" },
    });
  }
}
