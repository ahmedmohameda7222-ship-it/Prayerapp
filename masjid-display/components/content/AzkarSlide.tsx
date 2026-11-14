import type { DisplayAzkarCategory, DisplayAzkarDto } from "../../lib/feed-types";

const CATEGORY_TITLES: Record<DisplayAzkarCategory, { ar: string; de: string }> = {
  Morning: { ar: "أذكار الصباح", de: "Morgen-Dhikr" },
  Evening: { ar: "أذكار المساء", de: "Abend-Dhikr" },
  "After Prayer": { ar: "أذكار بعد الصلاة", de: "Dhikr nach dem Gebet" },
  Friday: { ar: "أذكار الجمعة", de: "Freitags-Dhikr" },
  Sleep: { ar: "أذكار النوم", de: "Dhikr vor dem Schlafen" },
  Travel: { ar: "أذكار السفر", de: "Reise-Dhikr" },
};

export function AzkarSlide({ item }: { item: DisplayAzkarDto }) {
  const label = CATEGORY_TITLES[item.category];
  const longCopy = item.arabicText.length > 240 || item.translationDe.length > 420;

  return (
    <article
      className={`content-slide azkar-slide${longCopy ? " azkar-slide-long" : ""}`}
      data-azkar-category={item.category}
      lang="ar"
    >
      <div className="azkar-category">
        <span dir="rtl" lang="ar">{label.ar}</span>
        <span lang="de">{label.de}</span>
      </div>
      <p className="azkar-arabic" dir="rtl" lang="ar">{item.arabicText}</p>
      <p className="azkar-german" lang="de">{item.translationDe}</p>
      <div className="azkar-attribution">
        <p className="content-meta">{item.source}</p>
        {item.repeatCount > 1 ? (
          <p className="content-meta" aria-label={`Wiederholungen: ${item.repeatCount}`}>× {item.repeatCount}</p>
        ) : null}
      </div>
    </article>
  );
}
