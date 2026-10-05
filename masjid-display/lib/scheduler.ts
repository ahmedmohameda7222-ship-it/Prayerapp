import type { ActiveContent } from "./content-eligibility";

export interface SchedulerBasis {
  epochMs: number;
  revision: string;
}

export type NormalSlideKind =
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
  kind: Exclude<NormalSlideKind, "AZKAR">;
  ids: string[];
};

function positiveMod(value: number, divisor: number): number {
  return ((value % divisor) + divisor) % divisor;
}

function slotIndex(now: Date, basis: SchedulerBasis): number {
  return Math.floor((now.getTime() - basis.epochMs) / SLOT_MS);
}

function azkarSlide(active: ActiveContent, occurrence: number): NormalSlide | null {
  if (active.azkar.length === 0) return null;
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

function generalSlide(active: ActiveContent, occurrence: number): NormalSlide | null {
  const families = generalFamilies(active);
  if (families.length === 0) return null;

  const familyIndex = positiveMod(occurrence, families.length);
  const family = families[familyIndex];
  const familyOccurrence = Math.floor(occurrence / families.length);
  const itemId = family.ids[positiveMod(familyOccurrence, family.ids.length)];
  return { kind: family.kind, itemId };
}

export function resolveNormalSlide(
  active: ActiveContent,
  now: Date,
  basis: SchedulerBasis,
): NormalSlide | null {
  const slot = slotIndex(now, basis);
  const hasAzkar = active.azkar.length > 0;
  const hasGeneral = generalFamilies(active).length > 0;

  if (hasAzkar && hasGeneral) {
    const occurrence = Math.floor(slot / 2);
    return positiveMod(slot, 2) === 0
      ? azkarSlide(active, occurrence)
      : generalSlide(active, occurrence);
  }

  if (hasAzkar) return azkarSlide(active, slot);
  if (hasGeneral) return generalSlide(active, slot);
  return null;
}
