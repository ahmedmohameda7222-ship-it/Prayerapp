export type PrayerappUpstreamPath =
  | "/api/public/masjid-display"
  | "/api/public/masjid-display-test-control";

export async function fetchPrayerappUpstream(
  _path: PrayerappUpstreamPath,
  _request: Request,
  _timeoutMs: number,
): Promise<Response> {
  return Response.json({ error: "not_implemented" }, { status: 501 });
}
