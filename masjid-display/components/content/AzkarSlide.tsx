import type { DisplayAzkarCategory, DisplayAzkarDto } from "../../lib/feed-types";
import { azkarNeedsLanguageSeparation } from "../../lib/azkar-presentation";

const CATEGORY_TITLES: Record<DisplayAzkarCategory, { ar: string; de: string }> = {
  Morning: { ar: "أذكار الصباح", de: "Morgen-Dhikr" },
  Evening: { ar: "أذكار المساء", de: "Abend-Dhikr" },
  "After Prayer": { ar: "أذكار بعد الصلاة", de: "Dhikr nach dem Gebet" },
  Friday: { ar: "أذكار الجمعة", de: "Freitags-Dhikr" },
  Sleep: { ar: "أذكار النوم", de: "Dhikr vor dem Schlafen" },
  Travel: { ar: "أذكار السفر", de: "Reise-Dhikr" },
};

export function AzkarSlide({ item, language }: { item: DisplayAzkarDto; language?: "ar" | "de" }) {
  const label = CATEGORY_TITLES[item.category];
  const longCopy = azkarNeedsLanguageSeparation(item);
  const visibleLanguage = longCopy ? language : undefined;

  return (
    <article
      className={`content-slide azkar-slide${longCopy ? " azkar-slide-long" : ""}${visibleLanguage ? " azkar-slide-single" : ""}`}
      data-azkar-category={item.category}
      lang="ar"
    >
      <div className="azkar-category">
        <span dir="rtl" lang="ar">{label.ar}</span>
        <span lang="de">{label.de}</span>
      </div>
      {visibleLanguage !== "de" ? (
        <p className="azkar-arabic" dir="rtl" lang="ar">{item.arabicText}</p>
      ) : null}
      {visibleLanguage !== "ar" ? (
        <p className="azkar-german" lang="de">{item.translationDe}</p>
      ) : null}
      <div className="azkar-attribution">
        <p className="content-meta">{item.source}</p>
        {item.repeatCount > 1 ? (
          <p className="content-meta" aria-label={`Wiederholungen: ${item.repeatCount}`}>× {item.repeatCount}</p>
        ) : null}
      </div>
    </article>
  );
}
