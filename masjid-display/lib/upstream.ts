export type PrayerappUpstreamPath =
  | "/api/public/masjid-display"
  | "/api/public/masjid-display-test-control";

const ALLOWED_PATHS = new Set<PrayerappUpstreamPath>([
  "/api/public/masjid-display",
  "/api/public/masjid-display-test-control",
]);

function configuredOrigin(): string {
  const raw = process.env.PRAYERAPP_ORIGIN?.trim();
  if (!raw) {
    throw new Error("PRAYERAPP_ORIGIN is required");
  }

  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error("PRAYERAPP_ORIGIN must be a valid URL");
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new Error("PRAYERAPP_ORIGIN must use HTTP or HTTPS");
  }
  if (parsed.username || parsed.password || parsed.search || parsed.hash) {
    throw new Error("PRAYERAPP_ORIGIN must be an origin only");
  }
  if (parsed.pathname !== "/") {
    throw new Error("PRAYERAPP_ORIGIN must not contain a path");
  }

  return parsed.origin;
}

export async function fetchPrayerappUpstream(
  path: PrayerappUpstreamPath,
  request: Request,
  timeoutMs: number,
): Promise<Response> {
  if (!ALLOWED_PATHS.has(path)) {
    throw new Error("Unsupported Prayerapp upstream path");
  }

  const headers = new Headers({ accept: "application/json" });
  const ifNoneMatch = request.headers.get("if-none-match");
  if (ifNoneMatch) {
    headers.set("if-none-match", ifNoneMatch);
  }

  return fetch(`${configuredOrigin()}${path}`, {
    method: "GET",
    headers,
    cache: "no-store",
    redirect: "error",
    signal: AbortSignal.timeout(timeoutMs),
  });
}
