import type { SVGProps } from "react";

interface KaabaIconProps extends SVGProps<SVGSVGElement> {
  title?: string;
}

export function KaabaIcon({ title, ...props }: KaabaIconProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable="false"
      {...props}
    >
      <rect
        x="10"
        y="7"
        width="44"
        height="50"
        rx="1.5"
        fill="var(--qibla-kaaba-body, #111111)"
      />

      <rect
        x="10"
        y="18"
        width="44"
        height="7"
        fill="var(--qibla-kaaba-gold, #d4af37)"
      />
      <rect
        x="10"
        y="20.75"
        width="44"
        height="1.5"
        fill="var(--qibla-kaaba-body, #111111)"
        opacity="0.72"
      />

      <g fill="var(--qibla-kaaba-gold, #d4af37)">
        <rect x="13" y="28" width="7" height="2.5" rx="0.75" />
        <rect x="22.5" y="28" width="7" height="2.5" rx="0.75" />
        <rect x="32" y="28" width="7" height="2.5" rx="0.75" />
        <rect x="41.5" y="28" width="9.5" height="2.5" rx="0.75" />
      </g>

      <rect
        x="38"
        y="34"
        width="9"
        height="18"
        rx="0.8"
        fill="var(--qibla-kaaba-gold, #d4af37)"
      />
      <rect
        x="39.5"
        y="36"
        width="6"
        height="3"
        rx="0.5"
        fill="var(--qibla-kaaba-body, #111111)"
        opacity="0.42"
      />
      <circle
        cx="44.5"
        cy="43"
        r="0.8"
        fill="var(--qibla-kaaba-body, #111111)"
        opacity="0.6"
      />

      <rect
        x="10"
        y="54"
        width="44"
        height="3"
        fill="var(--qibla-kaaba-base, #2a2a2a)"
      />
    </svg>
  );
}
