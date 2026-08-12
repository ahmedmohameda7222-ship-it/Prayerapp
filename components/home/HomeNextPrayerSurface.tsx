import { getImageProps } from "next/image";
import type { ReactNode } from "react";

export function HomeNextPrayerSurface({ children }: { children: ReactNode }) {
  const common = {
    alt: "",
    sizes: "(max-width: 1023px) 100vw, 34vw",
    className: "h-full w-full object-cover",
  };
  const {
    props: { srcSet: desktopSrcSet },
  } = getImageProps({
    ...common,
    src: "/assets/hero-home-mosque-night-desktop.png",
    width: 1915,
    height: 821,
    quality: 78,
  });
  const {
    props: { srcSet: mobileSrcSet, ...imageProps },
  } = getImageProps({
    ...common,
    src: "/assets/hero-home-mosque-night.png",
    width: 1448,
    height: 1086,
    quality: 78,
  });

  return (
    <div className="home-next-prayer-surface" data-testid="home-next-prayer-surface">
      <div className="home-next-prayer-media" aria-hidden="true">
        <picture>
          <source media="(min-width: 1024px)" srcSet={desktopSrcSet} />
          <source media="(max-width: 1023px)" srcSet={mobileSrcSet} />
          <img {...imageProps} alt="" />
        </picture>
      </div>
      <div className="home-next-prayer-content">{children}</div>
    </div>
  );
}
