import { createHash } from "node:crypto";

export type PrayerEventKind = "reminder" | "adhan";

export type PrayerEventIdentity = {
  scheduleId: string;
  scheduleRevision: string;
  date: string;
  prayer: string;
  kind: PrayerEventKind;
  leadMinutes: number;
};

export function prayerEventCanonicalInput(identity: PrayerEventIdentity) {
  return [
    "v2",
    identity.scheduleId,
    identity.scheduleRevision,
    identity.date,
    identity.prayer,
    identity.kind,
    String(identity.leadMinutes),
  ].join("|");
}

export function prayerEventId(identity: PrayerEventIdentity) {
  const digest = createHash("sha256")
    .update(prayerEventCanonicalInput(identity), "utf8")
    .digest("hex");
  return `p2:${digest}`;
}
