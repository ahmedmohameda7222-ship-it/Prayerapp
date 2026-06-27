import { getImageProps } from "next/image";
import type { ReactNode } from "react";

export function HeroCard({
  src,
  desktopSrc,
  alt,
  children,
  className = "",
  priority = false,
}: {
  src: string;
  desktopSrc?: string;
  alt: string;
  children: ReactNode;
  className?: string;
  priority?: boolean;
}) {
  const sizes = "(max-width: 1023px) 100vw, calc(100vw - 64px)";
  const common = {
    alt,
    sizes,
    className: "absolute inset-0 h-full w-full object-cover",
    fetchPriority: priority ? ("high" as const) : undefined,
  };
  const {
    props: { srcSet: desktopSrcSet },
  } = getImageProps({ ...common, src: desktopSrc || src, width: 1915, height: 821, quality: 75 });
  const {
    props: { srcSet: mobileSrcSet, ...imageProps },
  } = getImageProps({ ...common, src, width: 1448, height: 1086, quality: 75 });

  return (
    <section className={`relative min-h-[220px] overflow-hidden rounded-[24px] shadow-[var(--shadow-card)] lg:aspect-[21/9] lg:min-h-0 ${className}`}>
      <picture>
        <source media="(min-width: 1024px)" srcSet={desktopSrcSet} />
        <source media="(max-width: 1023px)" srcSet={mobileSrcSet} />
        <img {...imageProps} alt={alt} />
      </picture>
      <div className="hero-overlay absolute inset-0" />
      <div className="relative z-10 flex min-h-[220px] flex-col justify-end p-5 text-[var(--color-card)] lg:absolute lg:inset-0 lg:min-h-0">{children}</div>
    </section>
  );
}
