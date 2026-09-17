import type { DisplayAnnouncementDto } from "../lib/feed-types";

export function UrgentBar({ items }: { items: DisplayAnnouncementDto[] }) {
  if (items.length === 0) return null;

  return (
    <aside className="urgent-bar" data-testid="urgent-bar" role="alert">
      {items.map((item) => (
        <div className="urgent-item" key={item.id}>
          <strong dir="rtl">{item.titleAr}</strong>
          <span>{item.titleDe}</span>
        </div>
      ))}
    </aside>
  );
}
