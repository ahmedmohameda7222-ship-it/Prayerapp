import { getLatestAndroidRelease } from "@/lib/android-release-server";

export const runtime = "nodejs";

const downloadHeaders = {
  "Content-Type": "application/vnd.android.package-archive",
  "Content-Disposition": 'attachment; filename="danube-mosque.apk"',
  "Cache-Control": "public, max-age=0, must-revalidate",
  "X-Content-Type-Options": "nosniff",
};

async function redirectToLatestAndroidRelease() {
  try {
    const selected = await getLatestAndroidRelease();
    if (!selected) {
      return new Response("The Android application is not available for public download yet.", {
        status: 503,
        headers: { "Cache-Control": "public, max-age=60, s-maxage=300" },
      });
    }

    return new Response(null, {
      status: 307,
      headers: {
        ...downloadHeaders,
        Location: selected.downloadUrl,
      },
    });
  } catch (error) {
    console.error("[android download] release lookup failed", error);
    return new Response("The Android application download is temporarily unavailable.", {
      status: 503,
      headers: { "Cache-Control": "no-store" },
    });
  }
}

export async function GET() {
  return redirectToLatestAndroidRelease();
}

export async function HEAD() {
  return redirectToLatestAndroidRelease();
}
