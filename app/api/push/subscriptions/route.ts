import { NextResponse } from "next/server";
import type { Locale } from "@/lib/i18n/types";
import { createServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const locales = new Set<Locale>(["ar", "en", "de", "tr"]);
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

function bearerToken(request: Request) {
  const authorization = request.headers.get("authorization") || "";
  return authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Invalid origin" }, { status: 403 });

  const body = await request.json().catch(() => null);
  const endpoint = body?.subscription?.endpoint;
  const p256dh = body?.subscription?.keys?.p256dh;
  const auth = body?.subscription?.keys?.auth;
  const browserId = body?.browserId;
  const locale = body?.locale;

  if (
    !validEndpoint(endpoint) ||
    typeof p256dh !== "string" || p256dh.length > 1024 ||
    typeof auth !== "string" || auth.length > 1024 ||
    typeof browserId !== "string" || !uuidPattern.test(browserId) ||
    !locales.has(locale)
  ) {
    return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
  }

  const client = createServerClient();
  if (!client) return NextResponse.json({ error: "Push storage is unavailable" }, { status: 503 });

  const token = bearerToken(request);
  let verifiedUserId: string | null = null;
  if (token) {
    const { data, error } = await client.auth.getUser(token);
    if (error || !data.user) return NextResponse.json({ error: "Invalid account session" }, { status: 401 });
    verifiedUserId = data.user.id;
  }

  const { data: existing, error: existingError } = await client
    .from("push_subscriptions")
    .select("browser_id")
    .eq("endpoint", endpoint)
    .maybeSingle();
  if (existingError) return NextResponse.json({ error: "Could not validate subscription" }, { status: 500 });
  if (existing && existing.browser_id !== browserId) {
    return NextResponse.json({ error: "Subscription ownership mismatch" }, { status: 403 });
  }

  const now = new Date().toISOString();
  const { error } = await client.from("push_subscriptions").upsert(
    {
      endpoint,
      p256dh,
      auth,
      browser_id: browserId,
      user_id: verifiedUserId,
      enabled: true,
      locale,
      user_agent: request.headers.get("user-agent")?.slice(0, 1000) || null,
      platform: typeof body?.platform === "string" ? body.platform.slice(0, 120) : null,
      updated_at: now,
      last_seen_at: now,
    },
    { onConflict: "endpoint" }
  );

  if (error) {
    console.error("[push subscription] save failed", error.message);
    return NextResponse.json({ error: "Could not save subscription" }, { status: 500 });
  }

  return NextResponse.json({ success: true, accountAssociated: Boolean(verifiedUserId) });
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
    .update({ enabled: false, user_id: null, updated_at: new Date().toISOString() })
    .eq("endpoint", body.endpoint)
    .eq("browser_id", body.browserId);

  if (error) {
    console.error("[push subscription] disable failed", error.message);
    return NextResponse.json({ error: "Could not disable subscription" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
