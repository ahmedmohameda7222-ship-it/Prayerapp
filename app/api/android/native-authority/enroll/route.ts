import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import {
  bearerToken,
  credentialMatches,
  hashNativeCredential,
  isAuthorityId,
  isInstallationId,
  isNativeCredential,
  isSameOrigin,
} from "@/lib/android/native-credentials";
import { createServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

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
  if (
    !isInstallationId(body?.installationId)
    || !isNativeCredential(body?.credential)
    || (body?.authorityId != null && !isAuthorityId(body.authorityId))
    || typeof body?.browserId !== "string"
    || !uuidPattern.test(body.browserId)
    || (body?.endpoint != null && !validEndpoint(body.endpoint))
  ) {
    return NextResponse.json({ error: "Invalid native installation" }, { status: 400 });
  }

  const client = createServerClient();
  if (!client) return NextResponse.json({ error: "Native enrollment is unavailable" }, { status: 503 });
  const token = bearerToken(request);
  if (!token) return NextResponse.json({ error: "Account session required" }, { status: 401 });
  const { data: userData, error: userError } = await client.auth.getUser(token);
  if (userError || !userData.user) return NextResponse.json({ error: "Invalid account session" }, { status: 401 });

  const { data: existingInstallationData, error: existingInstallationError } = await client
    .from("native_prayer_installations")
    .select("user_id, credential_hash, authority_id, revoked_at")
    .eq("installation_id", body.installationId)
    .maybeSingle();
  if (existingInstallationError) return NextResponse.json({ error: "Could not validate native installation" }, { status: 500 });
  const existingInstallation = existingInstallationData as {
    user_id?: string;
    credential_hash?: string;
    authority_id?: string;
    revoked_at?: string | null;
  } | null;
  if (!existingInstallation && body.authorityId != null) {
    return NextResponse.json({
      error: "Native authority generation is no longer current",
      code: "authority_generation_missing",
    }, { status: 409 });
  }
  if (
    existingInstallation
    && (
      !existingInstallation.credential_hash
      || !existingInstallation.authority_id
      || !credentialMatches(body.credential, existingInstallation.credential_hash)
      || (body.authorityId != null && body.authorityId !== existingInstallation.authority_id)
      || (
        body.authorityId == null
        && existingInstallation.user_id !== userData.user.id
        && !existingInstallation.revoked_at
      )
      || (
        body.authorityId == null
        && existingInstallation.user_id === userData.user.id
        && Boolean(existingInstallation.revoked_at)
      )
    )
  ) {
    return NextResponse.json({ error: "Native installation ownership mismatch" }, { status: 403 });
  }

  let pushSubscriptionId: string | null = null;
  if (body.endpoint) {
    const { data, error } = await client
      .from("push_subscriptions")
      .select("id")
      .eq("endpoint", body.endpoint)
      .eq("browser_id", body.browserId)
      .eq("user_id", userData.user.id)
      .eq("enabled", true)
      .maybeSingle();
    if (error) return NextResponse.json({ error: "Could not validate push subscription" }, { status: 500 });
    pushSubscriptionId = (data as { id?: string } | null)?.id || null;
  }

  if (pushSubscriptionId) {
    const { error: detachError } = await client
      .from("native_prayer_installations")
      .update({ push_subscription_id: null, native_ready: false, lease_expires_at: null, updated_at: new Date().toISOString() } as never)
      .eq("push_subscription_id", pushSubscriptionId)
      .eq("user_id", userData.user.id)
      .neq("installation_id", body.installationId);
    if (detachError) return NextResponse.json({ error: "Could not rotate native push pairing" }, { status: 500 });
  }

  const now = new Date().toISOString();
  const authorityId = randomUUID();
  const enrollment = {
    installation_id: body.installationId,
    authority_id: authorityId,
    user_id: userData.user.id,
    push_subscription_id: pushSubscriptionId,
    credential_hash: hashNativeCredential(body.credential),
    native_ready: false,
    lease_expires_at: null,
    revoked_at: null,
    last_seen_at: now,
    updated_at: now,
  };
  const enrollmentResult = existingInstallation
    ? await client.from("native_prayer_installations")
      .update(enrollment as never)
      .eq("installation_id", body.installationId)
      .eq("authority_id", existingInstallation.authority_id!)
      .eq("credential_hash", existingInstallation.credential_hash!)
      .select("authority_id")
      .maybeSingle()
    : await client.from("native_prayer_installations")
      .insert(enrollment as never)
      .select("authority_id")
      .maybeSingle();
  const { data: enrolledData, error } = enrollmentResult;
  const enrolled = enrolledData as { authority_id?: string } | null;
  if (error || !enrolled?.authority_id) {
    console.error("[native authority] enrollment failed", error?.message || "authority generation changed");
    return NextResponse.json({ error: "Could not enroll native installation" }, { status: error ? 500 : 409 });
  }
  return NextResponse.json({
    success: true,
    pushPaired: Boolean(pushSubscriptionId),
    authorityId: enrolled.authority_id,
  });
}
