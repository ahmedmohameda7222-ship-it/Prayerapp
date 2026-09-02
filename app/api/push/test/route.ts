import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { isAdhanPrayer, type AdhanPrayer } from "@/lib/adhan-audio";
import { prayerEventId } from "@/lib/android/prayer-event-id";
import { todayIso } from "@/lib/date-utils";
import { deliverPrayerReminderEvent } from "@/lib/prayer-reminder-delivery";
import type { PushSubscriptionRecord } from "@/lib/push/types";
import { consumeSecurityRateLimit } from "@/lib/security/rate-limit";
import { isTrustedWebPushEndpoint } from "@/lib/security/web-push-endpoint";
import { createServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 20;

const TEST_DELAY_MS = 10_000;
const TEST_REMINDER_LEAD_MINUTES = 15 as const;
const TEST_PUSH_TTL_MS = 5 * 60_000;
const TEST_PUSH_LIMIT = 6;
const TEST_PUSH_WINDOW_SECONDS = 10 * 60;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type TestMode = "reminder" | "adhan";

function isSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return !origin || origin === new URL(request.url).origin;
}

function bearerToken(request: Request) {
  const authorization = request.headers.get("authorization") || "";
  return authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseMode(value: unknown): TestMode | null {
  return value === "reminder" || value === "adhan" ? value : null;
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Invalid origin" }, { status: 403 });

  const body = await request.json().catch(() => null);
  const endpoint = body?.endpoint;
  const browserId = body?.browserId;
  const mode = parseMode(body?.mode);
  const prayer: AdhanPrayer | null = isAdhanPrayer(body?.prayer) ? body.prayer : null;

  if (
    !isTrustedWebPushEndpoint(endpoint)
    || typeof browserId !== "string"
    || !uuidPattern.test(browserId)
    || !mode
    || !prayer
  ) {
    return NextResponse.json({ error: "Invalid prayer simulation target" }, { status: 400 });
  }

  try {
    const quota = await consumeSecurityRateLimit(request, {
      scope: "push-test",
      limit: TEST_PUSH_LIMIT,
      windowSeconds: TEST_PUSH_WINDOW_SECONDS,
    });
    if (!quota.allowed) {
      return NextResponse.json(
        { error: "Too many prayer simulation requests" },
        {
          status: 429,
          headers: { "Retry-After": String(Math.max(1, quota.retryAfterSeconds)) },
        },
      );
    }
  } catch {
    return NextResponse.json(
      { error: "Prayer simulation rate limit unavailable" },
      { status: 503, headers: { "Retry-After": "60" } },
    );
  }

  const client = createServerClient();
  if (!client) return NextResponse.json({ error: "Push storage is unavailable" }, { status: 503 });

  const { data, error } = await client
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth, locale, user_id, browser_id, enabled")
    .eq("endpoint", endpoint)
    .eq("browser_id", browserId)
    .eq("enabled", true)
    .maybeSingle();

  if (error) return NextResponse.json({ error: "Could not validate push subscription" }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Push subscription not found" }, { status: 404 });

  const row = data as PushSubscriptionRecord & { browser_id: string; enabled: boolean };
  if (!isTrustedWebPushEndpoint(row.endpoint)) {
    await client
      .from("push_subscriptions")
      .update({ enabled: false, updated_at: new Date().toISOString() } as never)
      .eq("id", row.id);
    return NextResponse.json({ error: "Push subscription is no longer trusted" }, { status: 410 });
  }

  if (row.user_id) {
    const token = bearerToken(request);
    if (!token) return NextResponse.json({ error: "Account session required" }, { status: 401 });
    const { data: userData, error: userError } = await client.auth.getUser(token);
    if (userError || !userData.user || userData.user.id !== row.user_id) {
      return NextResponse.json({ error: "Invalid account session" }, { status: 401 });
    }
  }

  await sleep(TEST_DELAY_MS);

  const due = new Date();
  const date = todayIso(due);
  const leadMinutes = mode === "adhan" ? 0 : TEST_REMINDER_LEAD_MINUTES;
  const eventId = prayerEventId({
    scheduleId: randomUUID(),
    scheduleRevision: "simulation",
    date,
    prayer,
    kind: mode,
    leadMinutes,
  });
  const dueAt = due.toISOString();
  const expiresAt = new Date(due.getTime() + TEST_PUSH_TTL_MS).toISOString();
  const result = await deliverPrayerReminderEvent({
    eventId,
    dueAt,
    expiresAt,
    prayer,
    date,
    leadMinutes,
    subscriptions: [row],
  });

  if (!result.configured) return NextResponse.json({ error: "Push is not configured" }, { status: 503 });
  if (result.sent !== 1) return NextResponse.json({ error: "Prayer simulation failed", result }, { status: 502 });
  return NextResponse.json({
    success: true,
    mode,
    prayer,
    leadMinutes,
    delaySeconds: TEST_DELAY_MS / 1000,
  });
}
