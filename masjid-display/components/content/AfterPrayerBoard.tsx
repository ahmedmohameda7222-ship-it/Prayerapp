import { useLayoutEffect, useRef } from "react";
import { findLargestPostPrayerFit } from "../../lib/post-prayer-fit";
import { getPostPrayerPlaylist, postPrayerSlideAt, type PostPrayerSlide } from "../../lib/post-prayer-playlist";
import type { DisplayRuntimeViewModel } from "../../lib/runtime/use-display-runtime";
import { resolvePostPrayerWindow } from "../../lib/state/post-prayer-state";

function remainingDisplayTime(milliseconds: number): string {
  const seconds = Math.max(0, Math.ceil(milliseconds / 1_000));
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

function densityFor(slide: PostPrayerSlide): "short" | "long" {
  return (slide.arabicText?.length ?? 0) > 160 ||
    (slide.translationDe?.length ?? 0) > 260 ? "long" : "short";
}

/**
 * Size a complete Arabic/German pair to the actual browser viewport. The
 * binary search adjusts a shared factor, without splitting verses, omitting
 * words, scrolling hidden content or resetting the canonical rotation clock.
 */
function BilingualDhikr({ slide, remainingMs }: { slide: PostPrayerSlide; remainingMs: number }) {
  const articleRef = useRef<HTMLElement>(null);
  const density = densityFor(slide);

  useLayoutEffect(() => {
    const element = articleRef.current;
    if (!element) return;
    let disposed = false;

    const adjust = () => {
      if (disposed || !element.isConnected || !element.clientHeight || !element.clientWidth) return;
      const style = window.getComputedStyle(element);
      const verticalPadding = (parseFloat(style.paddingTop) || 0) + (parseFloat(style.paddingBottom) || 0);
      const availableHeight = Math.max(0, element.clientHeight - verticalPadding - 4);
      const gap = parseFloat(style.rowGap) || parseFloat(style.gap) || 0;
      const arabic = element.querySelector<HTMLElement>(".after-dhikr-ar");
      const german = element.querySelector<HTMLElement>(".after-dhikr-de");
      const meta = element.querySelector<HTMLElement>(".after-dhikr-meta");
      const height = (node: HTMLElement | null) =>
        node ? Math.max(node.scrollHeight, node.getBoundingClientRect().height) : 0;

      const fits = (scale: number) => {
        element.style.setProperty("--post-dhikr-fit-scale", String(scale));
        const textHeight = density === "long"
          ? Math.max(height(arabic), height(german))
          : height(arabic) + height(german) + gap;
        const needed = textHeight + height(meta) + gap;
        const noHorizontalClipping = [arabic, german, meta].every(
          (node) => !node || node.scrollWidth <= node.clientWidth + 2,
        );
        return needed <= availableHeight && noHorizontalClipping;
      };

      const factor = findLargestPostPrayerFit(fits);
      element.style.setProperty("--post-dhikr-fit-scale", String(factor));
    };

    adjust();
    window.addEventListener("resize", adjust);
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(adjust);
    observer?.observe(element);
    void document.fonts?.ready.then(() => { if (!disposed) adjust(); }).catch(() => {});

    return () => {
      disposed = true;
      observer?.disconnect();
      window.removeEventListener("resize", adjust);
    };
  }, [density, slide.itemId, slide.arabicText, slide.translationDe]);

  return (
    <article
      ref={articleRef}
      className="after-dhikr"
      data-testid="after-prayer-item"
      data-language={slide.language}
      data-density={density}
      data-item-id={slide.itemId}
    >
      <p className="after-dhikr-ar" lang="ar" dir="rtl">{slide.arabicText}</p>
      <p className="after-dhikr-de" lang="de">{slide.translationDe}</p>
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
  );
}

/** One whole bilingual dhikr per time-based rotation slide; no Quran verse pages. */
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
          <p className="after-subtitle" lang="de">Dhikr nach dem Gebet</p>
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
      <BilingualDhikr slide={slide} remainingMs={remainingMs} />
    </section>
  );
}
