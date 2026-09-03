import { serveVerifiedAndroidApk } from "@/lib/android-apk-download-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return serveVerifiedAndroidApk();
}

export async function HEAD() {
  return serveVerifiedAndroidApk({ method: "HEAD" });
}
