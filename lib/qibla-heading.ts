import { headingFromAlpha, normalizeDegrees } from "@/lib/qibla-utils";

export const MAX_LIVE_TILT_DEGREES = 35;

export type HeadingReference = "true" | "magnetic" | "relative";

export type HeadingSource =
  | "standard-absolute"
  | "webkit-magnetic"
  | "relative";

export interface HeadingSample {
  heading: number;
  reference: HeadingReference;
  source: HeadingSource;
  accuracyDegrees: number | null;
  beta: number | null;
  gamma: number | null;
}

export type WebkitAccuracy =
  | "usable"
  | "calibration-required"
  | "unusable"
  | "unknown";

export function isValidHeadingDegrees(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value < 360;
}

export function isValidWebkitCompassHeading(value: unknown): value is number {
  return isValidHeadingDegrees(value);
}

export function classifyWebkitCompassAccuracy(value: unknown): WebkitAccuracy {
  if (typeof value !== "number" || !Number.isFinite(value)) return "unknown";
  if (value < 0) return "unusable";
  if (value <= 25) return "usable";
  return "calibration-required";
}

export function magneticToTrueHeading(
  magneticHeading: number,
  declination: number,
): number {
  return normalizeDegrees(magneticHeading + declination);
}

export function standardAbsoluteHeadingFromAlpha(alpha: unknown): number | null {
  if (typeof alpha !== "number" || !Number.isFinite(alpha)) return null;
  return headingFromAlpha(alpha);
}

export function isWithinLiveTilt(
  beta: number | null,
  gamma: number | null,
): boolean {
  return (
    typeof beta === "number" &&
    Number.isFinite(beta) &&
    typeof gamma === "number" &&
    Number.isFinite(gamma) &&
    Math.abs(beta) <= MAX_LIVE_TILT_DEGREES &&
    Math.abs(gamma) <= MAX_LIVE_TILT_DEGREES
  );
}

/**
 * Resolve a structured sample to a heading referenced to true north.
 * Relative samples are intentionally rejected. Magnetic samples fail closed
 * unless a finite declination is supplied by the WMM wrapper.
 */
export function resolveTrueHeading(
  sample: HeadingSample,
  magneticDeclination: number | null = null,
): number | null {
  if (!isValidHeadingDegrees(sample.heading)) return null;

  if (sample.source === "relative" || sample.reference === "relative") {
    return null;
  }

  if (sample.source === "standard-absolute") {
    return sample.reference === "true" ? sample.heading : null;
  }

  if (sample.source === "webkit-magnetic") {
    if (sample.reference !== "magnetic" || !Number.isFinite(magneticDeclination)) {
      return null;
    }
    return magneticToTrueHeading(sample.heading, magneticDeclination as number);
  }

  return null;
}
