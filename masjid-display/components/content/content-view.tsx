import type { ReactNode } from "react";

const LONG_COPY_THRESHOLD = 360;

export interface CardMeasure {
  textLength: number;
  hasQr: boolean;
}

export function languageForInstant(now: Date): "ar" | "de" {
  return Math.floor(now.getTime() / 8_000) % 2 === 0 ? "ar" : "de";
}

export function isLongBilingual(arabic: string, german: string) {
  return arabic.length + german.length > LONG_COPY_THRESHOLD;
}

export function canRenderTwoCards(first: CardMeasure, second: CardMeasure) {
  if (first.textLength > 420 || second.textLength > 420) return false;
  if (first.hasQr && second.hasQr) return false;
  const combined = first.textLength + second.textLength;
  if (combined > 650) return false;
  if ((first.hasQr || second.hasQr) && combined > 520) return false;
  return true;
}

export function selectedPair<T extends { id: string }>(
  items: T[],
  selectedId: string | null,
  measure: (item: T) => CardMeasure,
): T[] {
  if (!items.length) return [];
  const selectedIndex = Math.max(
    0,
    items.findIndex((item) => item.id === selectedId),
  );
  const first = items[selectedIndex];
  if (items.length === 1) return [first];
  const second = items[(selectedIndex + 1) % items.length];
  return canRenderTwoCards(measure(first), measure(second))
    ? [first, second]
    : [first];
}

export function BilingualBlock({
  titleAr,
  titleDe,
  bodyAr,
  bodyDe,
  now,
  className,
}: {
  titleAr: string;
  titleDe: string;
  bodyAr: ReactNode;
  bodyDe: ReactNode;
  now: Date;
  className?: string;
}) {
  const long = isLongBilingual(String(bodyAr), String(bodyDe));
  const language = languageForInstant(now);

  if (long && language === "ar") {
    return (
      <div className={className} dir="rtl" lang="ar">
        <h2>{titleAr}</h2>
        <div>{bodyAr}</div>
      </div>
    );
  }
  if (long) {
    return (
      <div className={className} lang="de">
        <h2>{titleDe}</h2>
        <div>{bodyDe}</div>
      </div>
    );
  }
  return (
    <div className={className}>
      <section dir="rtl" lang="ar">
        <h2>{titleAr}</h2>
        <div>{bodyAr}</div>
      </section>
      <section lang="de">
        <h2>{titleDe}</h2>
        <div>{bodyDe}</div>
      </section>
    </div>
  );
}
