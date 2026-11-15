import { getPostPrayerPlaylist, postPrayerSlideAt } from "../../lib/post-prayer-playlist";
import type { DisplayRuntimeViewModel } from "../../lib/runtime/use-display-runtime";
import { resolvePostPrayerWindow } from "../../lib/state/post-prayer-state";

function remainingDisplayTime(milliseconds: number): string {
  const seconds = Math.max(0, Math.ceil(milliseconds / 1_000));
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

/**
 * Full-height reading slide: one complete short dhikr or one large
 * language-specific page at a time, driven only by the logical prayer clock.
 */
export function AfterPrayerBoard({ vm }: { vm: DisplayRuntimeViewModel }) {
  if (!vm.feed) return null;
  const window = resolvePostPrayerWindow(vm.feed, vm.logicalNow);
  if (!window) return null;

  const playlist = getPostPrayerPlaylist(vm.feed, window.prayer);
  const active = postPrayerSlideAt(playlist, vm.logicalNow.getTime() - window.startMs);
  if (!active) return null;

  const { slide, index, remainingMs } = active;
  return (
    <section className="after-wrapper after-rotation" data-testid="after-prayer-board"
      aria-label="أذكار ما بعد الصلاة — Dhikr nach dem Gebet">
      <div className="after-heading">
        <div>
          <h2 className="after-title" lang="ar" dir="rtl">أذكار ما بعد الصلاة</h2>
          <p className="after-subtitle" lang="de">Dhikr nach dem Gebet · Hisn al-Muslim</p>
        </div>
        <div className="after-rotation-status">
          <span data-testid="after-prayer-progress" aria-label="Seitenposition">
            {String(index + 1).padStart(2, "0")} / {String(playlist.slides.length).padStart(2, "0")}
          </span>
          <time data-testid="after-prayer-remaining" aria-label="Verbleibende Gesamtzeit">
            {remainingDisplayTime(window.endMs - vm.logicalNow.getTime())}
          </time>
        </div>
      </div>
      <article className="after-dhikr" data-testid="after-prayer-item"
        data-language={slide.language} data-item-id={slide.itemId}>
        {slide.arabicText ? (
          <p className="after-dhikr-ar" lang="ar" dir="rtl">{slide.arabicText}</p>
        ) : null}
        {slide.translationDe ? (
          <p className="after-dhikr-de" lang="de">{slide.translationDe}</p>
        ) : null}
        <div className="after-dhikr-meta">
          <span className="after-dhikr-source">{slide.source}</span>
          {slide.repeatCount > 1 ? (
            <span className="after-dhikr-repeat" aria-label={`Wiederholungen: ${slide.repeatCount}`}>
              ×{slide.repeatCount}
            </span>
          ) : null}
          <time className="after-dhikr-timer" data-testid="after-slide-remaining"
            aria-label="Zeit für diesen Dhikr">{remainingDisplayTime(remainingMs)}</time>
        </div>
      </article>
    </section>
  );
}
