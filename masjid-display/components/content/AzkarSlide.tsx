import type { DisplayAzkarDto } from "../../lib/feed-types";

export function AzkarSlide({ item }: { item: DisplayAzkarDto }) {
  return (
    <article className="content-slide azkar-slide">
      <p className="azkar-arabic" dir="rtl" lang="ar">{item.arabicText}</p>
      <p className="azkar-german" lang="de">{item.translationDe}</p>
      <p className="content-meta">{item.source}</p>
      {item.repeatCount > 1 ? (
        <p className="content-meta">× {item.repeatCount}</p>
      ) : null}
    </article>
  );
}
