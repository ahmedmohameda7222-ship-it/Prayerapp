import { NextResponse } from "next/server";
import { parseNativeHeartbeat } from "@/lib/android/contracts";
import {
  bearerToken,
  credentialMatches,
  isInstallationId,
  isNativeCredential,
} from "@/lib/android/native-credentials";
import { createServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const LEASE_DURATION_MS = 12 * 60 * 60 * 1000;

export async function POST(request: Request) {
  const installationId = request.headers.get("x-native-installation-id");
  const credential = bearerToken(request, "Native");
  if (!isInstallationId(installationId) || !isNativeCredential(credential)) {
    return NextResponse.json({ error: "Invalid native credentials" }, { status: 401 });
  }
  const now = new Date();
  const heartbeat = parseNativeHeartbeat(await request.json().catch(() => null), now);
  if (!heartbeat) return NextResponse.json({ error: "Invalid native readiness report" }, { status: 400 });

  const client = createServerClient();
  if (!client) return NextResponse.json({ error: "Native heartbeat is unavailable" }, { status: 503 });
  const { data, error } = await client
    .from("native_prayer_installations")
    .select("credential_hash")
    .eq("installation_id", installationId)
    .maybeSingle();
  const row = data as { credential_hash?: string } | null;
  if (error || !row?.credential_hash || !credentialMatches(credential, row.credential_hash)) {
    return NextResponse.json({ error: "Invalid native credentials" }, { status: 401 });
  }

  const leaseExpiresAt = heartbeat.nativeReady
    ? new Date(now.getTime() + LEASE_DURATION_MS).toISOString()
    : null;
  const { error: updateError } = await client
    .from("native_prayer_installations")
    .update({
      native_ready: heartbeat.nativeReady,
      notification_permission: heartbeat.notificationPermission,
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
    .eq("installation_id", installationId);
  if (updateError) {
    console.error("[native authority] heartbeat failed", updateError.message);
    return NextResponse.json({ error: "Could not update native readiness" }, { status: 500 });
  }
  return NextResponse.json({
    success: true,
    nativeReady: heartbeat.nativeReady,
    leaseExpiresAt,
  });
}

export async function DELETE(request: Request) {
  const installationId = request.headers.get("x-native-installation-id");
  const credential = bearerToken(request, "Native");
  if (!isInstallationId(installationId) || !isNativeCredential(credential)) {
    return NextResponse.json({ error: "Invalid native credentials" }, { status: 401 });
  }
  const client = createServerClient();
  if (!client) return NextResponse.json({ error: "Native heartbeat is unavailable" }, { status: 503 });
  const { data } = await client
    .from("native_prayer_installations")
    .select("credential_hash")
    .eq("installation_id", installationId)
    .maybeSingle();
  const row = data as { credential_hash?: string } | null;
  if (!row?.credential_hash || !credentialMatches(credential, row.credential_hash)) {
    return NextResponse.json({ error: "Invalid native credentials" }, { status: 401 });
  }
  const { error } = await client.from("native_prayer_installations").update({
    native_ready: false,
    lease_expires_at: null,
    updated_at: new Date().toISOString(),
  } as never).eq("installation_id", installationId);
  if (error) return NextResponse.json({ error: "Could not revoke native readiness" }, { status: 500 });
  return NextResponse.json({ success: true });
}
