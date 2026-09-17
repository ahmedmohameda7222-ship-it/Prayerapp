import type { ActiveContent } from "./content-eligibility";

export interface SchedulerBasis {
  epochMs: number;
  revision: string;
}

export type NormalSlideKind =
  | "PRAYER"
  | "AZKAR"
  | "SPECIAL"
  | "ANNOUNCEMENT"
  | "EVENT"
  | "CAMPAIGN"
  | "MAGHRIB_PROGRAM";

export interface NormalSlide {
  kind: NormalSlideKind;
  itemId: string | null;
}

const SLOT_MS = 10_000;

type GeneralFamily = {
  kind: Exclude<NormalSlideKind, "PRAYER" | "AZKAR">;
  ids: string[];
};

function positiveMod(value: number, divisor: number): number {
  return ((value % divisor) + divisor) % divisor;
}

function slotIndex(now: Date, basis: SchedulerBasis): number {
  return Math.floor((now.getTime() - basis.epochMs) / SLOT_MS);
}

function prayerSlide(active: ActiveContent): NormalSlide | null {
  if (!active.prayerDay) return null;
  return { kind: "PRAYER", itemId: active.prayerDay.date };
}

function azkarSlide(active: ActiveContent, slot: number): NormalSlide | null {
  if (active.azkar.length === 0) return null;
  const generalAvailable = generalFamilies(active).length > 0;
  const occurrence = generalAvailable ? Math.floor(slot / 4) : Math.floor((slot - 1) / 2);
  const item = active.azkar[positiveMod(occurrence, active.azkar.length)];
  return { kind: "AZKAR", itemId: item.id };
}

function generalFamilies(active: ActiveContent): GeneralFamily[] {
  const families: GeneralFamily[] = [];
  if (active.specialAnnouncements.length > 0) {
    families.push({ kind: "SPECIAL", ids: active.specialAnnouncements.map((item) => item.id) });
  }
  if (active.announcements.length > 0) {
    families.push({ kind: "ANNOUNCEMENT", ids: active.announcements.map((item) => item.id) });
  }
  if (active.events.length > 0) {
    families.push({ kind: "EVENT", ids: active.events.map((item) => item.id) });
  }
  if (active.campaigns.length > 0) {
    families.push({ kind: "CAMPAIGN", ids: active.campaigns.map((item) => item.id) });
  }
  if (active.maghribPrograms.length > 0) {
    families.push({
      kind: "MAGHRIB_PROGRAM",
      ids: active.maghribPrograms.map((day) => `maghrib-program:${day.date}`),
    });
  }
  return families;
}

function generalSlide(active: ActiveContent, slot: number): NormalSlide | null {
  const families = generalFamilies(active);
  if (families.length === 0) return null;

  const azkarAvailable = active.azkar.length > 0;
  const occurrence = azkarAvailable ? Math.floor(slot / 4) : Math.floor((slot - 1) / 2);
  const familyIndex = positiveMod(occurrence, families.length);
  const family = families[familyIndex];
  const familyOccurrence = Math.floor(occurrence / families.length);
  const itemId = family.ids[positiveMod(familyOccurrence, family.ids.length)];
  return { kind: family.kind, itemId };
}

export function resolveNormalSlide(active: ActiveContent, now: Date, basis: SchedulerBasis): NormalSlide {
  const slot = slotIndex(now, basis);
  const anchor = prayerSlide(active);

  if (positiveMod(slot, 2) === 0) {
    return anchor ?? azkarSlide(active, slot) ?? generalSlide(active, slot) ?? { kind: "PRAYER", itemId: null };
  }

  if (positiveMod(slot, 4) === 1) {
    return azkarSlide(active, slot) ?? generalSlide(active, slot) ?? anchor ?? { kind: "PRAYER", itemId: null };
  }

  return generalSlide(active, slot) ?? azkarSlide(active, slot) ?? anchor ?? { kind: "PRAYER", itemId: null };
}
