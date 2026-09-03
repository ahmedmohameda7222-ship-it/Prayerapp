import { NextResponse } from "next/server";
import type { Locale } from "@/lib/i18n/types";
import { readBoundedJsonObject } from "@/lib/security/http-boundaries";
import { MAX_ACCOUNT_PUSH_SUBSCRIPTIONS } from "@/lib/security/push-account-limit";
import { consumeSecurityRateLimit } from "@/lib/security/rate-limit";
import { isTrustedWebPushEndpoint } from "@/lib/security/web-push-endpoint";
import { createServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const locales = new Set<Locale>(["ar", "en", "de", "tr"]);
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PUSH_SUBSCRIPTION_LIMIT = 30;
const PUSH_SUBSCRIPTION_WINDOW_SECONDS = 10 * 60;
const MAX_PUSH_SUBSCRIPTION_BODY_BYTES = 16 * 1024;

function isSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return !origin || origin === new URL(request.url).origin;
}

function bearerToken(request: Request) {
  const authorization = request.headers.get("authorization") || "";
  return authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
}

async function subscriptionRateLimitResponse(request: Request) {
  try {
    const quota = await consumeSecurityRateLimit(request, {
      scope: "push-subscription",
      limit: PUSH_SUBSCRIPTION_LIMIT,
      windowSeconds: PUSH_SUBSCRIPTION_WINDOW_SECONDS,
    });
    if (quota.allowed) return null;
    return NextResponse.json(
      { error: "Too many push subscription requests" },
      {
        status: 429,
        headers: { "Retry-After": String(Math.max(1, quota.retryAfterSeconds)) },
      },
    );
  } catch {
    return NextResponse.json(
      { error: "Push subscription rate limit unavailable" },
      { status: 503, headers: { "Retry-After": "60" } },
    );
  }
}

async function parseRequestBody(request: Request) {
  const parsed = await readBoundedJsonObject(request, {
    maxBytes: MAX_PUSH_SUBSCRIPTION_BODY_BYTES,
  });
  if (!parsed.ok) {
    return {
      response: NextResponse.json({ error: parsed.message }, { status: parsed.status }),
      body: null,
    };
  }
  return { response: null, body: parsed.value };
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  const rateLimited = await subscriptionRateLimitResponse(request);
  if (rateLimited) return rateLimited;

  const parsed = await parseRequestBody(request);
  if (parsed.response) return parsed.response;
  const body = parsed.body as {
    subscription?: { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } };
    browserId?: unknown;
    locale?: unknown;
    platform?: unknown;
  };
  const endpoint = body.subscription?.endpoint;
  const p256dh = body.subscription?.keys?.p256dh;
  const auth = body.subscription?.keys?.auth;
  const browserId = body.browserId;
  const locale = body.locale;

  if (
    !isTrustedWebPushEndpoint(endpoint) ||
    typeof p256dh !== "string" || p256dh.length > 1024 ||
    typeof auth !== "string" || auth.length > 1024 ||
    typeof browserId !== "string" || !uuidPattern.test(browserId) ||
    !locales.has(locale as Locale)
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

  const { data: registrationData, error: registrationError } = await client.rpc(
    "register_push_subscription",
    {
      p_endpoint: endpoint,
      p_p256dh: p256dh,
      p_auth: auth,
      p_browser_id: browserId,
      p_user_id: verifiedUserId,
      p_locale: locale,
      p_user_agent: request.headers.get("user-agent")?.slice(0, 1000) || null,
      p_platform: typeof body.platform === "string" ? body.platform.slice(0, 120) : null,
      p_max_account_subscriptions: MAX_ACCOUNT_PUSH_SUBSCRIPTIONS,
    },
  );

  if (registrationError) {
    console.error("[push subscription] atomic save failed", registrationError.message);
    return NextResponse.json({ error: "Could not save subscription" }, { status: 500 });
  }

  if (registrationData === "ownership_mismatch") {
    return NextResponse.json({ error: "Subscription ownership mismatch" }, { status: 403 });
  }
  if (registrationData === "account_limit_reached") {
    return NextResponse.json({ error: "Account push subscription limit reached" }, { status: 409 });
  }
  if (registrationData !== "saved") {
    console.error("[push subscription] atomic save returned an invalid result");
    return NextResponse.json({ error: "Could not save subscription" }, { status: 500 });
  }

  return NextResponse.json({ success: true, accountAssociated: Boolean(verifiedUserId) });
}

export async function DELETE(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  const rateLimited = await subscriptionRateLimitResponse(request);
  if (rateLimited) return rateLimited;

  const parsed = await parseRequestBody(request);
  if (parsed.response) return parsed.response;
  const body = parsed.body as { endpoint?: unknown; browserId?: unknown };
  if (!isTrustedWebPushEndpoint(body.endpoint) || typeof body.browserId !== "string" || !uuidPattern.test(body.browserId)) {
    return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
  }

  const client = createServerClient();
  if (!client) return NextResponse.json({ error: "Push storage is unavailable" }, { status: 503 });

  const { error } = await client
    .from("push_subscriptions")
    .update({ enabled: false, user_id: null, updated_at: new Date().toISOString() } as never)
    .eq("endpoint", body.endpoint)
    .eq("browser_id", body.browserId);

  if (error) {
    console.error("[push subscription] disable failed", error.message);
    return NextResponse.json({ error: "Could not disable subscription" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
