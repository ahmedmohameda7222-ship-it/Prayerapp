import { readTvTestCommand } from "@/lib/masjid-display/tv-test-server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const command = await readTvTestCommand();
    return Response.json(
      command ? { active: true, command } : { active: false, command: null },
      { headers: { "cache-control": "no-store, max-age=0" } },
    );
  } catch {
    return Response.json(
      { error: "tv_test_status_unavailable" },
      { status: 503, headers: { "cache-control": "no-store" } },
    );
  }
}
