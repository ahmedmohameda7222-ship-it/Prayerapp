import { NextResponse } from "next/server";
import {
  bearerToken,
  credentialMatches,
  isAuthorityId,
  isInstallationId,
  isNativeCredential,
} from "@/lib/android/native-credentials";
import { readBoundedJson } from "@/lib/security/http-boundaries";
import { createServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const eventIdPattern = /^p2:[0-9a-f]{64}$/u;
const MAX_ACCOUNT_GENERATION = 2_147_483_647;
const MAX_FUTURE_DELIVERY_MS = 5 * 60 * 1000;
const MAX_RECEIPT_AGE_MS = 2 * 24 * 60 * 60 * 1000;
const MAX_NATIVE_RECEIPT_BODY_BYTES = 2 * 1024;

function parseBody(value: unknown, now: Date) {
  if (!value || typeof value !== "object") return null;
  const body = value as Record<string, unknown>;
  if (typeof body.eventId !== "string" || !eventIdPattern.test(body.eventId)) return null;
  if (body.kind !== "reminder" && body.kind !== "adhan") return null;
  if (
    !Number.isInteger(body.accountGeneration)
    || (body.accountGeneration as number) < 0
    || (body.accountGeneration as number) > MAX_ACCOUNT_GENERATION
  ) return null;
  if (typeof body.deliveredAt !== "string" || body.deliveredAt.length > 64) return null;
  const deliveredAtMs = Date.parse(body.deliveredAt);
  if (!Number.isFinite(deliveredAtMs)) return null;
  if (deliveredAtMs > now.getTime() + MAX_FUTURE_DELIVERY_MS) return null;
  if (deliveredAtMs < now.getTime() - MAX_RECEIPT_AGE_MS) return null;
  return {
    eventId: body.eventId,
    kind: body.kind,
    accountGeneration: body.accountGeneration as number,
    deliveredAt: new Date(deliveredAtMs).toISOString(),
  };
}

export async function POST(request: Request) {
  const installationId = request.headers.get("x-native-installation-id");
  const authorityId = request.headers.get("x-native-authority-id");
  const credential = bearerToken(request, "Native");
  if (!isInstallationId(installationId) || !isAuthorityId(authorityId) || !isNativeCredential(credential)) {
    return NextResponse.json({ error: "Invalid native credentials" }, { status: 401 });
  }

  const now = new Date();
  const parsed = await readBoundedJson(request, {
    maxBytes: MAX_NATIVE_RECEIPT_BODY_BYTES,
    allowMissingContentType: true,
  });
  if (!parsed.ok) return NextResponse.json({ error: parsed.message }, { status: parsed.status });
  const receipt = parseBody(parsed.value, now);
  if (!receipt) return NextResponse.json({ error: "Invalid delivery receipt" }, { status: 400 });

  const client = createServerClient();
  if (!client) return NextResponse.json({ error: "Native receipt ingestion is unavailable" }, { status: 503 });
  const { data, error } = await client
    .from("native_prayer_installations")
    .select("credential_hash, authority_id, user_id, account_generation, receipt_v2")
    .eq("installation_id", installationId)
    .eq("authority_id", authorityId)
    .is("revoked_at", null)
    .maybeSingle();
  const row = data as {
    credential_hash?: string;
    authority_id?: string;
    user_id?: string;
    account_generation?: number;
    receipt_v2?: boolean;
  } | null;
  if (
    error
    || !row?.credential_hash
    || !row.authority_id
    || !row.user_id
    || !credentialMatches(credential, row.credential_hash)
  ) {
    return NextResponse.json({ error: "Invalid native credentials" }, { status: 401 });
  }
  if (row.receipt_v2 !== true || receipt.accountGeneration !== row.account_generation) {
    return NextResponse.json({ error: "Native receipt generation is not current" }, { status: 409 });
  }

  const { data: storedData, error: storeError } = await client
    .from("native_prayer_delivery_receipts")
    .upsert({
      installation_id: installationId,
      user_id: row.user_id,
      event_id: receipt.eventId,
      kind: receipt.kind,
      account_generation: receipt.accountGeneration,
      delivered_at: receipt.deliveredAt,
    } as never, { onConflict: "installation_id,account_generation,event_id" })
    .select("event_id")
    .maybeSingle();
  const stored = storedData as { event_id?: string } | null;
  if (storeError || stored?.event_id !== receipt.eventId) {
    console.error("[native authority] receipt ingestion failed", storeError?.message || "receipt not persisted");
    return NextResponse.json({ error: "Could not persist native delivery receipt" }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
