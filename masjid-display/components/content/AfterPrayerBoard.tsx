import { selectedPostPrayerAzkar } from "../../lib/post-prayer-selection";
import type { DisplayRuntimeViewModel } from "../../lib/runtime/use-display-runtime";
import { resolvePostPrayerWindow } from "../../lib/state/post-prayer-state";

function remainingDisplayTime(endMs: number, now: Date): string {
  const seconds = Math.max(0, Math.ceil((endMs - now.getTime()) / 1_000));
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

export function AfterPrayerBoard({ vm }: { vm: DisplayRuntimeViewModel }) {
  if (!vm.feed) return null;

  const window = resolvePostPrayerWindow(vm.feed, vm.logicalNow);
  if (!window) return null;

  const items = selectedPostPrayerAzkar(vm.feed, vm.state?.prayer ?? window.prayer);

  if (items.length === 0) return null;

  const density = items.length > 8 ? "full" : "selected";

  return (
    <section
      className="after-wrapper"
      data-testid="after-prayer-board"
      data-density={density}
      aria-label="أذكار ما بعد الصلاة — Dhikr nach dem Gebet"
    >
      <div className="after-heading">
        <div>
          <h2 className="after-title" lang="ar" dir="rtl">أذكار ما بعد الصلاة</h2>
          <p className="after-subtitle" lang="de">Dhikr nach dem Gebet · Hisn al-Muslim</p>
        </div>
        <span className="after-fixed-status">
          <span lang="ar">ثابتة</span>
          <time data-testid="after-prayer-remaining">{remainingDisplayTime(window.endMs, vm.logicalNow)}</time>
        </span>
      </div>
      <div className="after-grid">
        {items.map((item, index) => (
          <article
            key={item.id}
            className="after-cell"
            data-testid="after-prayer-item"
            title={item.arabicText}
          >
            <span className="after-number">{String(index + 1).padStart(2, "0")}</span>
            <div className="after-copy">
              <div lang="ar" dir="rtl" className="after-ar">{item.arabicText}</div>
              <div lang="de" className="after-de">{item.translationDe}</div>
              <span className="after-source">{item.source}</span>
            </div>
            <span className="after-repeat" aria-label={`Wiederholungen: ${item.repeatCount}`}>
              ×{item.repeatCount}
            </span>
          </article>
        ))}
      </div>
    </section>
  );
}
