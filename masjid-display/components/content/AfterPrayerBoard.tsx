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
 * One entire Arabic Quran verse / dhikr and the full German translation.
 * Measure the ACTUAL copy region (header, progress and source/footer excluded).
 * Set px font sizes directly: older Silk builds may not support CSS calc()
 * multiplication of a clamp() by a custom numeric property.
 */
function BilingualDhikr({ slide, remainingMs }: { slide: PostPrayerSlide; remainingMs: number }) {
  const articleRef = useRef<HTMLElement>(null);
  const density = densityFor(slide);

  useLayoutEffect(() => {
    const article = articleRef.current;
    if (!article) return;
    const copy = article.querySelector<HTMLElement>(".after-dhikr-copy");
    const arabic = article.querySelector<HTMLElement>(".after-dhikr-ar");
    const german = article.querySelector<HTMLElement>(".after-dhikr-de");
    if (!copy || !arabic || !german) return;
    let disposed = false;

    const adjust = () => {
      if (disposed || !article.isConnected || copy.clientWidth <= 0 || copy.clientHeight <= 0) return;

      // Reset first to obtain the stylesheet's responsive baseline, not the
      // previous slide's inline scaled size.
      arabic.style.removeProperty("font-size");
      german.style.removeProperty("font-size");
      const arabicBase = Number.parseFloat(window.getComputedStyle(arabic).fontSize);
      const germanBase = Number.parseFloat(window.getComputedStyle(german).fontSize);
      if (!Number.isFinite(arabicBase) || !Number.isFinite(germanBase) ||
          arabicBase <= 0 || germanBase <= 0) return;

      const style = window.getComputedStyle(copy);
      const gap = Number.parseFloat(style.rowGap || style.gap) || 0;
      const available = copy.clientHeight - 4;
      const height = (node: HTMLElement) => Math.max(node.scrollHeight, node.getBoundingClientRect().height);

      const fits = (scale: number) => {
        arabic.style.fontSize = `${arabicBase * scale}px`;
        german.style.fontSize = `${germanBase * scale}px`;
        const required = density === "long"
          ? Math.max(height(arabic), height(german))
          : height(arabic) + height(german) + gap;
        const fitsWidth = [arabic, german].every((node) => node.scrollWidth <= node.clientWidth + 2);
        return required <= available && fitsWidth;
      };
      const scale = findLargestPostPrayerFit(fits);
      // The last binary-search probe is not necessarily the chosen best fit.
      arabic.style.fontSize = `${arabicBase * scale}px`;
      german.style.fontSize = `${germanBase * scale}px`;
      article.style.setProperty("--post-dhikr-fit-scale", String(scale));
    };

    adjust();
    window.addEventListener("resize", adjust);
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(adjust);
    observer?.observe(article);
    observer?.observe(copy);
    void document.fonts?.ready.then(() => { if (!disposed) adjust(); }).catch(() => {});
    document.fonts?.addEventListener?.("loadingdone", adjust);

    return () => {
      disposed = true;
      observer?.disconnect();
      window.removeEventListener("resize", adjust);
      document.fonts?.removeEventListener?.("loadingdone", adjust);
      arabic.style.removeProperty("font-size");
      german.style.removeProperty("font-size");
      article.style.removeProperty("--post-dhikr-fit-scale");
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
      <div className="after-dhikr-copy" data-testid="after-prayer-copy">
        <p className="after-dhikr-ar" lang="ar" dir="rtl">{slide.arabicText}</p>
        <p className="after-dhikr-de" lang="de">{slide.translationDe}</p>
      </div>
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

/** One complete, unbroken bilingual dhikr per time-based rotation slide. */
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
        <div className="after-heading-titles" data-testid="after-prayer-titles">
          <h2 className="after-title" lang="ar" dir="rtl">أذكار ما بعد الصلاة</h2>
          <p className="after-subtitle" lang="de">Dhikr nach dem Gebet</p>
        </div>
        <div className="after-rotation-status">
          <span className="after-counter" data-testid="after-prayer-counter">
            <span data-testid="after-prayer-progress" aria-label="Dhikr Nummer">
              {String(index + 1).padStart(2, "0")} / {String(playlist.slides.length).padStart(2, "0")}
            </span>
          </span>
          <time className="after-total-remaining" data-testid="after-prayer-remaining"
            aria-label="Verbleibende Gesamtzeit">
            {remainingDisplayTime(window.endMs - vm.logicalNow.getTime())}
          </time>
        </div>
      </div>
      <BilingualDhikr slide={slide} remainingMs={remainingMs} />
    </section>
  );
}
