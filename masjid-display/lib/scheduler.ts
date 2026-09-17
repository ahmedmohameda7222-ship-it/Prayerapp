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

export function resolveNormalSlide(_active: ActiveContent, _now: Date, _basis: SchedulerBasis): NormalSlide {
  return { kind: "PRAYER", itemId: null };
}
