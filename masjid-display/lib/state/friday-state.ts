import type { MasjidDisplayFeedV1 } from "../feed-types";

export type FridayStateResolution =
  | { kind: "FRIDAY_MODE"; serviceId: string; serviceIndex: number }
  | { kind: "JUMUAH_NOW"; serviceId: string; serviceIndex: number };

export function resolveFridayState(
  _feed: MasjidDisplayFeedV1,
  _logicalNow: Date,
): FridayStateResolution | null {
  return null;
}
