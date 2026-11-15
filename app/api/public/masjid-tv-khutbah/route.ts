import { isFridayIso } from "@/lib/friday";
import { publishedGermanKhutbah } from "@/lib/masjid-display/khutbah-payload";
import { createServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function validFriday(date: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !isFridayIso(date)) return false;
  const parsed = new Date(`${date}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date;
}

export async function GET(request: Request) {
  const date = new URL(request.url).searchParams.get("date") ?? "";
  if (!validFriday(date)) {
    return Response.json({ error: "invalid_friday_date" }, {
      status: 400,
      headers: { "cache-control": "no-store" },
    });
  }

  const client = createServerClient();
  if (!client) {
    return Response.json({ error: "khutbah_unavailable" }, {
      status: 503,
      headers: { "cache-control": "no-store" },
    });
  }

  try {
    const { data, error } = await client
      .from("friday_khutbahs")
      .select("date,published,title_de,content_de")
      .eq("date", date)
      .eq("published", true)
      .maybeSingle();

    if (error) throw error;
    const khutbah = publishedGermanKhutbah(data, date);
    return Response.json({ date, khutbah }, {
      headers: { "cache-control": "no-store, max-age=0" },
    });
  } catch {
    return Response.json({ error: "khutbah_unavailable" }, {
      status: 503,
      headers: { "cache-control": "no-store" },
    });
  }
}
