import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("Android server delivery v2 contract", () => {
  it("defines a canonical prayer event ID module", () => {
    const path = join(process.cwd(), "lib/android/prayer-event-id.ts");
    expect(existsSync(path)).toBe(true);
  });

  it("adds a server-only native delivery receipt schema with short retention and no client grants", () => {
    const migrations = readdirSync(join(process.cwd(), "supabase/migrations"));
    const filename = migrations.find((name) => name.includes("native_delivery_receipts"));
    expect(filename).toBeTruthy();
    if (!filename) return;

    const migration = source(`supabase/migrations/${filename}`);
    expect(migration).toContain("create table public.native_prayer_delivery_receipts");
    expect(migration).toContain("event_id text not null");
    expect(migration).toContain("installation_id uuid not null");
    expect(migration).toContain("account_generation integer not null");
    expect(migration).toContain("expires_at timestamptz not null");
    expect(migration).toContain("enable row level security");
    expect(migration).toContain("revoke all on public.native_prayer_delivery_receipts from public, anon, authenticated");
    expect(migration).toContain("grant all on public.native_prayer_delivery_receipts to service_role");
  });

  it("separates reminder capability from Adhan capability", () => {
    const authority = source("lib/android/native-authority.ts");
    expect(authority).toContain("nativeDeliveryCapability");
    expect(authority).toContain('kind === "adhan"');
    expect(authority).toContain("reminder_channel_enabled");
    expect(authority).toContain("adhan_channel_enabled");
    expect(authority).toContain("audio_ready");
  });

  it("makes prayer push payloads expiring and canonical-event aware", () => {
    const delivery = source("lib/prayer-reminder-delivery.ts");
    expect(delivery).toContain("eventId");
    expect(delivery).toContain("dueAt");
    expect(delivery).toContain("expiresAt");
  });

  it("makes cron fallback receipt-aware instead of suppressing solely from a lease", () => {
    const cron = source("app/api/cron/prayer-reminders/route.ts");
    expect(cron).toContain("prayerEventId");
    expect(cron).toContain("native_prayer_delivery_receipts");
    expect(cron).toContain("NATIVE_DELIVERY_GRACE_MS");
    expect(cron).toContain("installation_id");
    expect(cron).toContain("receipt_v2");
    expect(cron).toContain("account_generation");
    expect(cron).toContain('.gt("expires_at"');
    expect(cron).not.toContain("const targets = filterPrayerPushTargets(pushTargets, nativeLeases, now)");
  });

  it("binds each canonical event revision to that prayer's actual time", () => {
    const cron = source("app/api/cron/prayer-reminders/route.ts");
    expect(cron).toContain("scheduleRevision: time");
    expect(cron).not.toContain("function scheduleRevision(schedule");
    expect(cron).not.toContain("note_tr, updated_at");
  });

  it("drops stale prayer fallback pushes before showing them", () => {
    const sw = source("public/sw.js");
    expect(sw).toContain("expiresAt");
    expect(sw).toContain("isStalePrayerPush");
    expect(sw.indexOf("isStalePrayerPush(payload)")).toBeLessThan(sw.indexOf("self.registration.showNotification"));
  });
});
