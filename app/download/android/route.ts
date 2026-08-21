import { NextResponse } from "next/server";
import { selectLatestAndroidRelease, type GitHubRelease } from "@/lib/android-release";

export const runtime = "nodejs";

const RELEASES_API = "https://api.github.com/repos/ahmedmohameda7222-ship-it/Prayerapp/releases?per_page=20";

export async function GET() {
  try {
    const response = await fetch(RELEASES_API, {
      headers: {
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      next: { revalidate: 300 },
    });
    if (!response.ok) throw new Error(`GitHub releases returned ${response.status}`);
    const releases = await response.json() as GitHubRelease[];
    const selected = selectLatestAndroidRelease(releases);
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
