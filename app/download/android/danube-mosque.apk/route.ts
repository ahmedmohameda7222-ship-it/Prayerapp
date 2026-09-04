import { ANDROID_PUBLIC_DOWNLOAD_PATH } from "@/lib/android-release";

export const runtime = "nodejs";

function redirectToCanonical(request: Request) {
  return Response.redirect(new URL(ANDROID_PUBLIC_DOWNLOAD_PATH, request.url), 307);
}

export function GET(request: Request) {
  return redirectToCanonical(request);
}

export function HEAD(request: Request) {
  return redirectToCanonical(request);
}
