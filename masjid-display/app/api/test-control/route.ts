import { fetchPrayerappUpstream } from "../../../lib/upstream";

const TEST_CONTROL_PATH = "/api/public/masjid-display-test-control" as const;
const TEST_CONTROL_TIMEOUT_MS = 3_000;
const FORWARDED_HEADERS = ["content-type", "date", "etag"] as const;

function headersFromUpstream(upstream: Response) {
  const headers = new Headers({ "cache-control": "no-store" });
  for (const name of FORWARDED_HEADERS) {
    const value = upstream.headers.get(name);
    if (value) headers.set(name, value);
  }
  return headers;
}

function statusAllowsBody(status: number) {
  return status !== 204 && status !== 205 && status !== 304;
}

export async function GET(request: Request) {
  try {
    const upstream = await fetchPrayerappUpstream(
      TEST_CONTROL_PATH,
      request,
      TEST_CONTROL_TIMEOUT_MS,
    );
    const body = statusAllowsBody(upstream.status) ? await upstream.arrayBuffer() : null;
    return new Response(body, {
      status: upstream.status,
      headers: headersFromUpstream(upstream),
    });
  } catch {
    return Response.json(
      { error: "masjid_display_test_control_unavailable" },
      {
        status: 503,
        headers: {
          "cache-control": "no-store",
          date: new Date().toUTCString(),
        },
      },
    );
  }
}
