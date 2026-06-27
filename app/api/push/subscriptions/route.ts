import { NextResponse } from "next/server";
import type { Locale } from "@/lib/i18n/types";
import type { PrayerReminderMinutes } from "@/lib/push/types";
import { createServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const locales = new Set<Locale>(["ar", "en", "de", "tr"]);
const reminders = new Set<PrayerReminderMinutes>([null, 0, 5, 10, 15, 30]);
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return !origin || origin === new URL(request.url).origin;
}

function validEndpoint(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 4096) return false;
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Invalid origin" }, { status: 403 });

  const body = await request.json().catch(() => null);
  const endpoint = body?.subscription?.endpoint;
  const p256dh = body?.subscription?.keys?.p256dh;
  const auth = body?.subscription?.keys?.auth;
  const browserId = body?.browserId;
  const locale = body?.locale;
  const reminder = body?.prayerReminderMinutes as PrayerReminderMinutes;

  if (
    !validEndpoint(endpoint) ||
    typeof p256dh !== "string" || p256dh.length > 1024 ||
    typeof auth !== "string" || auth.length > 1024 ||
    typeof browserId !== "string" || !uuidPattern.test(browserId) ||
    !locales.has(locale) ||
    !reminders.has(reminder)
  ) {
    return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
  }

  const client = createServerClient();
  if (!client) return NextResponse.json({ error: "Push storage is unavailable" }, { status: 503 });

  const now = new Date().toISOString();
  const { error } = await client.from("push_subscriptions").upsert(
    {
      endpoint,
      p256dh,
      auth,
      browser_id: browserId,
      enabled: true,
      locale,
      user_agent: request.headers.get("user-agent")?.slice(0, 1000) || null,
      platform: typeof body?.platform === "string" ? body.platform.slice(0, 120) : null,
      prayer_reminder_minutes: reminder,
      updated_at: now,
      last_seen_at: now,
    },
    { onConflict: "endpoint" }
  );

  if (error) {
    console.error("[push subscription] save failed", error.message);
    return NextResponse.json({ error: "Could not save subscription" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Invalid origin" }, { status: 403 });

  const body = await request.json().catch(() => null);
  if (!validEndpoint(body?.endpoint) || typeof body?.browserId !== "string" || !uuidPattern.test(body.browserId)) {
    return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
  }

  const client = createServerClient();
  if (!client) return NextResponse.json({ error: "Push storage is unavailable" }, { status: 503 });

  const { error } = await client
    .from("push_subscriptions")
    .update({ enabled: false, updated_at: new Date().toISOString() })
    .eq("endpoint", body.endpoint)
    .eq("browser_id", body.browserId);

  if (error) {
    console.error("[push subscription] disable failed", error.message);
    return NextResponse.json({ error: "Could not disable subscription" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
