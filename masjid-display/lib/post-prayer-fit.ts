/**
 * Largest proportional font size fitting a single unbroken bilingual dhikr.
 * Pure numeric search; the DOM measurer supplies actual rendered text heights.
 * Both languages always remain on one page (even for lengthy Quran verses).
 */
export function findLargestPostPrayerFit(fits: (scale: number) => boolean): number {
  if (fits(1)) return 1;
  const min = 0.015;
  if (!fits(min)) return min;
  let low = min;
  let high = 1;
  for (let i = 0; i < 13; i += 1) {
    const mid = (low + high) / 2;
    if (fits(mid)) low = mid;
    else high = mid;
  }
  // Round down, not up: avoid new overflow from subpixel quantization.
  return Math.max(min, Math.floor(low * 1000) / 1000);
}
