import { NextResponse } from "next/server";
import { getLatestAndroidRelease } from "@/lib/android-release-server";

export const runtime = "nodejs";

export async function GET() {
  try {
    const release = await getLatestAndroidRelease();
    if (!release) {
      return NextResponse.json({ error: "No validated Android release is available" }, {
        status: 503,
        headers: { "Cache-Control": "public, max-age=60, s-maxage=300" },
      });
    }
    return NextResponse.json({
      packageId: release.packageId,
      versionCode: release.versionCode,
      versionName: release.versionName,
      minimumSupportedVersionCode: release.minimumSupportedVersionCode,
      publishedAt: release.publishedAt,
      downloadUrl: "/download/android",
    }, {
      headers: { "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=600" },
    });
  } catch (error) {
    console.error("[android release] release lookup failed", error);
    return NextResponse.json({ error: "Android release metadata is temporarily unavailable" }, {
      status: 503,
      headers: { "Cache-Control": "no-store" },
    });
  }
}
