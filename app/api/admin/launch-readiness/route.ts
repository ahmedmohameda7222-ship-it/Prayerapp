import { NextResponse } from "next/server";
import { getAllowedAdminEmail } from "@/lib/auth/admin-server";
import { todayIso } from "@/lib/date-utils";
import {
  assessLaunchDataReadiness,
  CANONICAL_PRAYER_CRON_ENDPOINT,
} from "@/lib/launch-data-readiness";
import { createServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const authorization = request.headers.get("authorization") || "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  if (!(await getAllowedAdminEmail(token))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const client = createServerClient();
  if (!client) {
    return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });
  }

  const [prayers, jumuah, ramadan, mosque, donation, scheduler] = await Promise.all([
    client.from("prayer_times").select("date, published, note, note_ar, note_en, note_de, note_tr").eq("published", true),
    client.from("jumuah_times").select("published, location_name, location_address, khateeb_name, language, language_ar, language_en, language_de, language_tr, notes, notes_ar, notes_en, notes_de, notes_tr").eq("published", true),
    client.from("ramadan_days").select("published, note, note_ar, note_en, note_de, note_tr").eq("published", true),
    client.from("mosque_settings").select("address, phone, email, google_maps_link, whatsapp_link, telegram_link").limit(1).maybeSingle(),
    client.from("donation_settings").select("account_holder, iban, bic, paypal_link").limit(1).maybeSingle(),
    client.rpc("prayer_reminder_cron_endpoint"),
  ]);

  const firstError = [prayers.error, jumuah.error, ramadan.error, mosque.error, donation.error, scheduler.error]
    .find(Boolean);
  if (firstError) {
    console.error("[launch readiness] database check failed", firstError.message);
    return NextResponse.json({ error: "Launch readiness data is unavailable" }, { status: 503 });
  }

  const data = assessLaunchDataReadiness({
    today: todayIso(),
    prayerTimes: prayers.data || [],
    jumuahTimes: jumuah.data || [],
    ramadanDays: ramadan.data || [],
    mosqueSettings: mosque.data,
    donationSettings: donation.data,
  });
  const schedulerEndpointMatchesCanonical = scheduler.data === CANONICAL_PRAYER_CRON_ENDPOINT;

  return NextResponse.json({
    checkedAt: new Date().toISOString(),
    ...data,
    scheduler: { endpointMatchesCanonical: schedulerEndpointMatchesCanonical },
    technicalReady: schedulerEndpointMatchesCanonical,
  }, {
    headers: { "Cache-Control": "no-store" },
  });
}
