import { activeAfterPrayerSlide } from "../../lib/after-prayer-rotation";
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
  const slide = activeAfterPrayerSlide(items, window.startMs, vm.logicalNow.getTime());
  if (!slide) return null;

  const { item, index, count } = slide;
  const density = item.arabicText.length > 240 || item.translationDe.length > 320
    ? "long"
    : item.arabicText.length > 110 || item.translationDe.length > 170
      ? "medium"
      : "short";

  return (
    <section
      className="after-wrapper after-rotating"
      data-testid="after-prayer-board"
      data-density={density}
      data-active-index={index}
      aria-label="أذكار ما بعد الصلاة — Dhikr nach dem Gebet"
    >
      <div className="after-heading">
        <div>
          <h2 className="after-title" lang="ar" dir="rtl">أذكار ما بعد الصلاة</h2>
          <p className="after-subtitle" lang="de">Dhikr nach dem Gebet · Hisn al-Muslim</p>
        </div>
        <div className="after-slide-status">
          <span data-testid="after-prayer-position">{index + 1} / {count}</span>
          <time data-testid="after-prayer-remaining">{remainingDisplayTime(slide.endsAtMs, vm.logicalNow)}</time>
        </div>
      </div>
      <article className="after-active-slide" data-testid="after-prayer-item" aria-live="off">
        <div lang="ar" dir="rtl" className="after-active-ar">{item.arabicText}</div>
        <div lang="de" className="after-active-de">{item.translationDe}</div>
        <div className="after-active-meta">
          <span>{item.source}</span>
          {item.repeatCount > 1 ? (
            <strong className="after-active-repeat" aria-label={`Wiederholungen: ${item.repeatCount}`}>
              ×{item.repeatCount}
            </strong>
          ) : null}
        </div>
      </article>
    </section>
  );
}
