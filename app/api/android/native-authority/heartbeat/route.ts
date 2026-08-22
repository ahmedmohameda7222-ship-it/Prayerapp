import { NextResponse } from "next/server";
import { parseNativeHeartbeat } from "@/lib/android/contracts";
import {
  bearerToken,
  credentialMatches,
  isAuthorityId,
  isInstallationId,
  isNativeCredential,
} from "@/lib/android/native-credentials";
import { createServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const LEASE_DURATION_MS = 12 * 60 * 60 * 1000;

export async function POST(request: Request) {
  const installationId = request.headers.get("x-native-installation-id");
  const authorityId = request.headers.get("x-native-authority-id");
  const credential = bearerToken(request, "Native");
  if (!isInstallationId(installationId) || !isAuthorityId(authorityId) || !isNativeCredential(credential)) {
    return NextResponse.json({ error: "Invalid native credentials" }, { status: 401 });
  }
  const now = new Date();
  const heartbeat = parseNativeHeartbeat(await request.json().catch(() => null), now);
  if (!heartbeat) return NextResponse.json({ error: "Invalid native readiness report" }, { status: 400 });

  const client = createServerClient();
  if (!client) return NextResponse.json({ error: "Native heartbeat is unavailable" }, { status: 503 });
  const { data, error } = await client
    .from("native_prayer_installations")
    .select("credential_hash, authority_id")
    .eq("installation_id", installationId)
    .eq("authority_id", authorityId)
    .maybeSingle();
  const row = data as { credential_hash?: string; authority_id?: string } | null;
  if (error || !row?.credential_hash || !row.authority_id || !credentialMatches(credential, row.credential_hash)) {
    return NextResponse.json({ error: "Invalid native credentials" }, { status: 401 });
  }

  const leaseExpiresAt = heartbeat.nativeReady
    ? new Date(now.getTime() + LEASE_DURATION_MS).toISOString()
    : null;
  const { data: updatedData, error: updateError } = await client
    .from("native_prayer_installations")
    .update({
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
  let lookup = client
    .from("native_prayer_installations")
    .select("credential_hash, authority_id")
    .eq("installation_id", installationId);
  if (authorityId) lookup = lookup.eq("authority_id", authorityId);
  const { data } = await lookup.maybeSingle();
  const row = data as { credential_hash?: string; authority_id?: string } | null;
  if (!row?.credential_hash || !row.authority_id || !credentialMatches(credential, row.credential_hash)) {
    return NextResponse.json({ error: "Invalid native credentials" }, { status: 401 });
  }

  // Deleting the authority row makes revocation terminal for the old credential:
  // an already in-flight stale heartbeat can no longer reactivate a lease after reset.
  const { data: deletedData, error } = await client
    .from("native_prayer_installations")
    .delete()
    .eq("installation_id", installationId)
    .eq("authority_id", row.authority_id)
    .eq("credential_hash", row.credential_hash)
    .select("authority_id")
    .maybeSingle();
  const deleted = deletedData as { authority_id?: string } | null;
  if (error || deleted?.authority_id !== row.authority_id) {
    return NextResponse.json({ error: "Could not revoke native readiness" }, { status: 409 });
  }
  return NextResponse.json({ success: true });
}
