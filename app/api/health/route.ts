import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const NO_STORE_HEADERS = { "Cache-Control": "no-store" };

export async function GET() {
  const client = createServerClient();
  if (!client) return NextResponse.json({ status: "degraded", database: "not-configured" }, { status: 503, headers: NO_STORE_HEADERS });
  const started = Date.now();
  const { error } = await client.from("mosque_settings").select("id").limit(1);
  return NextResponse.json({ status: error ? "degraded" : "ok", database: error ? "unavailable" : "ok", latencyMs: Date.now() - started }, { status: error ? 503 : 200, headers: NO_STORE_HEADERS });
}
