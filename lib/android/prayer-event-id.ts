import { createHash } from "node:crypto";

export type PrayerEventKind = "reminder" | "adhan";

export type PrayerEventIdentity = {
  scheduleId: string;
  scheduleRevision: string;
  date: string;
  prayer: string;
  kind: PrayerEventKind;
  leadMinutes: number;
  dueAtMs: number;
};

export type LegacyPrayerEventIdentity = Omit<PrayerEventIdentity, "dueAtMs">;

function sha256EventId(prefix: "p2:" | "p3:", canonical: string) {
  const digest = createHash("sha256").update(canonical, "utf8").digest("hex");
  return `${prefix}${digest}`;
}

export function prayerEventCanonicalInput(identity: PrayerEventIdentity) {
  return [
    "v3",
    identity.scheduleId,
    identity.scheduleRevision,
    identity.date,
    identity.prayer,
    identity.kind,
    String(identity.leadMinutes),
    String(identity.dueAtMs),
  ].join("|");
}

export function prayerEventId(identity: PrayerEventIdentity) {
  return sha256EventId("p3:", prayerEventCanonicalInput(identity));
}

export function legacyPrayerEventIdV2(identity: LegacyPrayerEventIdentity) {
  const canonical = [
    "v2",
    identity.scheduleId,
    identity.scheduleRevision,
    identity.date,
    identity.prayer,
    identity.kind,
    String(identity.leadMinutes),
  ].join("|");
  return sha256EventId("p2:", canonical);
}
