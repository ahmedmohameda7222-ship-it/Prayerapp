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
    <section className={`relative min-h-[200px] overflow-hidden rounded-[24px] shadow-[var(--shadow-card)] sm:min-h-[220px] lg:aspect-[2.7/1] lg:min-h-0 ${className}`}>
      <picture>
        <source media="(min-width: 1024px)" srcSet={desktopSrcSet} />
        <source media="(max-width: 1023px)" srcSet={mobileSrcSet} />
        <img {...imageProps} alt={alt} />
      </picture>
      <div className="hero-overlay absolute inset-0" />
      <div className="relative z-10 flex min-h-[200px] flex-col justify-end p-4 text-[var(--color-card)] sm:min-h-[220px] sm:p-5 lg:absolute lg:inset-0 lg:min-h-0">{children}</div>
    </section>
  );
}
