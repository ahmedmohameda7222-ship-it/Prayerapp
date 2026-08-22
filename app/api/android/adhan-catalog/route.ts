import { NextResponse } from "next/server";
import { ADHAN_SOUNDS } from "@/lib/adhan-audio";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    schemaVersion: 1,
    sounds: ADHAN_SOUNDS.map((sound) => ({
      id: sound.id,
      kind: sound.kind,
      audioUrl: sound.audioUrl,
    })),
  }, { headers: { "Cache-Control": "public, max-age=300, s-maxage=3600" } });
}
