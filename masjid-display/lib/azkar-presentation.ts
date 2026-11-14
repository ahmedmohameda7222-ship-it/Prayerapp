import type { DisplayAzkarDto } from "./feed-types";

// A 10-second bilingual panel is too dense for extended source texts.
// Give each language its own full scheduler slot for these items.
export function azkarNeedsLanguageSeparation(
  item: Pick<DisplayAzkarDto, "arabicText" | "translationDe">,
): boolean {
  return (item.arabicText?.length ?? 0) > 240 || (item.translationDe?.length ?? 0) > 420;
}
