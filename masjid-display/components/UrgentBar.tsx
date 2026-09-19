import type { DisplayAnnouncementDto } from "../lib/feed-types";

const URGENT_VIEW_MS = 8_000;

function positiveModulo(value: number, divisor: number) {
  return ((value % divisor) + divisor) % divisor;
}

export function UrgentBar({
  items,
  logicalNow,
}: {
  items: DisplayAnnouncementDto[];
  logicalNow: Date;
}) {
  if (items.length === 0) return null;

  const viewCount = items.length * 2;
  const viewIndex = positiveModulo(
    Math.floor(logicalNow.getTime() / URGENT_VIEW_MS),
    viewCount,
  );
  const item = items[Math.floor(viewIndex / 2)];
  const german = viewIndex % 2 === 1;

  return (
    <aside className="urgent-bar" data-testid="urgent-bar" role="alert">
      <div
        className="urgent-item"
        data-item-id={item.id}
        data-language={german ? "de" : "ar"}
      >
        {german ? (
          <>
            <strong lang="de">{item.titleDe}</strong>
            <span lang="de">{item.messageDe}</span>
          </>
        ) : (
          <>
            <strong dir="rtl" lang="ar">{item.titleAr}</strong>
            <span dir="rtl" lang="ar">{item.messageAr}</span>
          </>
        )}
      </div>
    </aside>
  );
}
