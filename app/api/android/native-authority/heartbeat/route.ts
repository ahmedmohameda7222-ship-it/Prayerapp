import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { parseNativeHeartbeat } from "@/lib/android/contracts";
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

const LEASE_DURATION_MS = 12 * 60 * 60 * 1000;
const MAX_NATIVE_HEARTBEAT_BODY_BYTES = 16 * 1024;

export async function POST(request: Request) {
  const installationId = request.headers.get("x-native-installation-id");
  const authorityId = request.headers.get("x-native-authority-id");
  const credential = bearerToken(request, "Native");
  if (!isInstallationId(installationId) || !isAuthorityId(authorityId) || !isNativeCredential(credential)) {
    return NextResponse.json({ error: "Invalid native credentials" }, { status: 401 });
  }
  const now = new Date();
  const parsed = await readBoundedJson(request, {
    maxBytes: MAX_NATIVE_HEARTBEAT_BODY_BYTES,
    allowMissingContentType: true,
  });
  if (!parsed.ok) return NextResponse.json({ error: parsed.message }, { status: parsed.status });
  const heartbeat = parseNativeHeartbeat(parsed.value, now);
  if (!heartbeat) return NextResponse.json({ error: "Invalid native readiness report" }, { status: 400 });

  const client = createServerClient();
  if (!client) return NextResponse.json({ error: "Native heartbeat is unavailable" }, { status: 503 });
  const { data, error } = await client
    .from("native_prayer_installations")
    .select("credential_hash, authority_id, account_generation")
    .eq("installation_id", installationId)
    .eq("authority_id", authorityId)
    .is("revoked_at", null)
    .maybeSingle();
  const row = data as { credential_hash?: string; authority_id?: string; account_generation?: number } | null;
  if (error || !row?.credential_hash || !row.authority_id || !credentialMatches(credential, row.credential_hash)) {
    return NextResponse.json({ error: "Invalid native credentials" }, { status: 401 });
  }
  if (heartbeat.receiptV2 && heartbeat.accountGeneration !== row.account_generation) {
    return NextResponse.json({ error: "Native account generation changed" }, { status: 409 });
  }

  const leaseExpiresAt = heartbeat.reminderReady || heartbeat.adhanReady
    ? new Date(now.getTime() + LEASE_DURATION_MS).toISOString()
    : null;
  const { data: updatedData, error: updateError } = await client
    .from("native_prayer_installations")
    .update({
      receipt_v2: heartbeat.receiptV2,
      native_ready: heartbeat.nativeReady,
      notification_permission: heartbeat.notificationPermission,
      notification_delivery_enabled: heartbeat.notificationDeliveryEnabled,
      reminder_channel_enabled: heartbeat.reminderChannelEnabled,
      adhan_channel_enabled: heartbeat.adhanChannelEnabled,
      exact_alarm_permission: heartbeat.exactAlarmPermission,
      schedule_fresh: heartbeat.scheduleFresh,
      alarm_schedule_installed: heartbeat.alarmScheduleInstalled,
      audio_ready: heartbeat.audioReady,
      engine_healthy: heartbeat.engineHealthy,
      schedule_valid_until: heartbeat.scheduleValidUntil,
      lease_expires_at: leaseExpiresAt,
      last_seen_at: now.toISOString(),
      updated_at: now.toISOString(),
    } as never)
    .eq("installation_id", installationId)
    .eq("authority_id", row.authority_id)
    .eq("credential_hash", row.credential_hash)
    .eq("account_generation", row.account_generation ?? 0)
    .is("revoked_at", null)
    .select("authority_id")
    .maybeSingle();
  const updated = updatedData as { authority_id?: string } | null;
  if (updateError) {
    console.error("[native authority] heartbeat failed", updateError.message);
    return NextResponse.json({ error: "Could not update native readiness" }, { status: 500 });
  }
  if (updated?.authority_id !== row.authority_id) {
    return NextResponse.json({ error: "Native authority generation changed" }, { status: 409 });
  }
  return NextResponse.json({
    success: true,
    nativeReady: heartbeat.nativeReady,
    leaseExpiresAt,
  });
}

export async function DELETE(request: Request) {
  const installationId = request.headers.get("x-native-installation-id");
  const authorityId = request.headers.get("x-native-authority-id");
  const credential = bearerToken(request, "Native");
  if (
    !isInstallationId(installationId)
    || (authorityId != null && !isAuthorityId(authorityId))
    || !isNativeCredential(credential)
  ) {
    return NextResponse.json({ error: "Invalid native credentials" }, { status: 401 });
  }
  const client = createServerClient();
  if (!client) return NextResponse.json({ error: "Native heartbeat is unavailable" }, { status: 503 });
  const { data, error: lookupError } = await client
    .from("native_prayer_installations")
    .select("credential_hash, authority_id, revoked_at")
    .eq("installation_id", installationId)
    .maybeSingle();
  const row = data as { credential_hash?: string; authority_id?: string; revoked_at?: string | null } | null;
  if (
    lookupError
    || !row?.credential_hash
    || !row.authority_id
    || !credentialMatches(credential, row.credential_hash)
  ) {
    return NextResponse.json({ error: "Invalid native credentials" }, { status: 401 });
  }

  // A successful revoke rotates authority_id before Android can durably
  // acknowledge it. If the process dies in that window, the retry still
  // carries the previous generation. The credential proves installation
  // ownership, while revoked_at proves there is no active generation left to
  // accidentally revoke, so the retry is safely idempotent.
  if (row.revoked_at) {
    return NextResponse.json({ success: true, authorityId: row.authority_id });
  }
  if (authorityId != null && authorityId !== row.authority_id) {
    return NextResponse.json({ error: "Native authority generation changed" }, { status: 409 });
  }

  const now = new Date().toISOString();
  const revokedAuthorityId = randomUUID();
  // Rotating the persisted authority creates a tombstone. Any heartbeat that
  // already validated the old generation can no longer mutate this row.
  const { data: revokedData, error } = await client
    .from("native_prayer_installations")
    .update({
      authority_id: revokedAuthorityId,
      push_subscription_id: null,
      receipt_v2: false,
      native_ready: false,
      notification_permission: false,
      notification_delivery_enabled: false,
      reminder_channel_enabled: false,
      adhan_channel_enabled: false,
      exact_alarm_permission: false,
      schedule_fresh: false,
      alarm_schedule_installed: false,
      audio_ready: false,
      engine_healthy: false,
      schedule_valid_until: null,
      lease_expires_at: null,
      revoked_at: now,
      last_seen_at: now,
      updated_at: now,
    } as never)
    .eq("installation_id", installationId)
    .eq("authority_id", row.authority_id)
    .eq("credential_hash", row.credential_hash)
    .is("revoked_at", null)
    .select("authority_id")
    .maybeSingle();
  const revoked = revokedData as { authority_id?: string } | null;
  if (error || revoked?.authority_id !== revokedAuthorityId) {
    return NextResponse.json({ error: "Could not revoke native readiness" }, { status: 409 });
  }
  return NextResponse.json({ success: true, authorityId: revoked.authority_id });
}
