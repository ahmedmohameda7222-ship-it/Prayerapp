import Image from "next/image";
import type { ReactNode } from "react";

export function HeroCard({
  src,
  alt,
  children,
  className = "",
  priority = false,
}: {
  src: string;
  alt: string;
  children: ReactNode;
  className?: string;
  priority?: boolean;
}) {
  return (
    <section className={`relative min-h-[220px] overflow-hidden rounded-[24px] shadow-[var(--shadow-card)] lg:aspect-[4/3] lg:min-h-0 ${className}`}>
      <Image src={src} alt={alt} fill priority={priority} sizes="(max-width: 1023px) 100vw, calc(100vw - 64px)" className="object-cover" />
      <div className="hero-overlay absolute inset-0" />
      <div className="relative z-10 flex min-h-[220px] flex-col justify-end p-5 text-[var(--color-card)] lg:absolute lg:inset-0 lg:min-h-0">{children}</div>
    </section>
  );
}
