import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { isAdhanPrayer, type AdhanPrayer } from "@/lib/adhan-audio";
import { deliverPushNotifications } from "@/lib/push/web-push";
import type { Locale } from "@/lib/i18n/types";
import type { PushSubscriptionRecord } from "@/lib/push/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 20;

const TEST_DELAY_MS = 10_000;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type TestMode = "notification" | "adhan";

const notificationCopy: Record<Locale, { title: string; body: string }> = {
  ar: {
    title: "اختبار إشعار الصلاة",
    body: "نجح اختبار الإشعارات. وصل هذا الإشعار بعد 10 ثوانٍ.",
  },
  en: {
    title: "Prayer notification test",
    body: "Push test successful. This notification arrived after 10 seconds.",
  },
  de: {
    title: "Test der Gebetsbenachrichtigung",
    body: "Push-Test erfolgreich. Diese Benachrichtigung kam nach 10 Sekunden an.",
  },
  tr: {
    title: "Namaz bildirimi testi",
    body: "Bildirim testi başarılı. Bu bildirim 10 saniye sonra ulaştı.",
  },
};

const adhanCopy: Record<Locale, { title: string; body: string }> = {
  ar: {
    title: "اختبار وصول الأذان",
    body: "وصل وقت الأذان التجريبي. سيحاول التطبيق الآن تشغيل الأذان المحفوظ لهذه الصلاة.",
  },
  en: {
    title: "Adhan arrival test",
    body: "The simulated Adhan time has arrived. The app will now attempt the saved Adhan for this prayer.",
  },
  de: {
    title: "Adhan-Ankunftstest",
    body: "Die simulierte Adhan-Zeit ist erreicht. Die App versucht jetzt, den gespeicherten Adhan dieses Gebets abzuspielen.",
  },
  tr: {
    title: "Ezan geliş testi",
    body: "Simüle edilen ezan vakti geldi. Uygulama şimdi bu namaz için kayıtlı ezanı oynatmayı deneyecek.",
  },
};

function isSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return !origin || origin === new URL(request.url).origin;
}

function bearerToken(request: Request) {
  const authorization = request.headers.get("authorization") || "";
  return authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
}

function validEndpoint(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 4096) return false;
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseMode(value: unknown): TestMode | null {
  return value === "notification" || value === "adhan" ? value : null;
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Invalid origin" }, { status: 403 });

  const body = await request.json().catch(() => null);
  const endpoint = body?.endpoint;
  const browserId = body?.browserId;
  const mode = parseMode(body?.mode);
  const prayer: AdhanPrayer | null = isAdhanPrayer(body?.prayer) ? body.prayer : null;

  if (!validEndpoint(endpoint) || typeof browserId !== "string" || !uuidPattern.test(browserId) || !mode) {
    return NextResponse.json({ error: "Invalid test target" }, { status: 400 });
  }
  if (mode === "adhan" && !prayer) {
    return NextResponse.json({ error: "A valid prayer is required for the Adhan test" }, { status: 400 });
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
  if (row.user_id) {
    const token = bearerToken(request);
    if (!token) return NextResponse.json({ error: "Account session required" }, { status: 401 });
    const { data: userData, error: userError } = await client.auth.getUser(token);
    if (userError || !userData.user || userData.user.id !== row.user_id) {
      return NextResponse.json({ error: "Invalid account session" }, { status: 401 });
    }
  }

  await sleep(TEST_DELAY_MS);

  const eventKey = `system-test:${mode}:${randomUUID()}`;
  const result = await deliverPushNotifications({
    eventKey,
    notificationType: "prayer_reminder",
    subscriptions: [row],
    payloadForLocale: (locale) => {
      if (mode === "adhan") {
        return {
          title: adhanCopy[locale].title,
          body: adhanCopy[locale].body,
          url: "/#prayer-times",
          tag: eventKey,
          kind: "adhan" as const,
          prayer: prayer!,
          date: new Date().toISOString().slice(0, 10),
        };
      }

      return {
        title: notificationCopy[locale].title,
        body: notificationCopy[locale].body,
        url: "/settings#prayer-system-test",
        tag: eventKey,
        kind: "content" as const,
      };
    },
  });

  if (!result.configured) return NextResponse.json({ error: "Push is not configured" }, { status: 503 });
  if (result.sent !== 1) return NextResponse.json({ error: "Push test failed", result }, { status: 502 });
  return NextResponse.json({ success: true, mode, delaySeconds: TEST_DELAY_MS / 1000 });
}
