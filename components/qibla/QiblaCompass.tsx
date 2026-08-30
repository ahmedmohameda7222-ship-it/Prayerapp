interface QiblaCompassProps {
  rotation: number;
  north: string;
  east: string;
  south: string;
  west: string;
}

export function QiblaCompass({ rotation, north, east, south, west }: QiblaCompassProps) {
  return (
    <div
      aria-hidden="true"
      data-testid="qibla-compass"
      dir="ltr"
      className="relative mx-auto aspect-square w-full max-w-[320px] rounded-full border border-[var(--ui-divider)] bg-[var(--ui-surface-subtle)] shadow-inner"
    >
      <Cardinal label={north} position="top" className="left-1/2 top-3 -translate-x-1/2" />
      <Cardinal label={east} position="right" className="right-3 top-1/2 -translate-y-1/2" />
      <Cardinal label={south} position="bottom" className="bottom-3 left-1/2 -translate-x-1/2" />
      <Cardinal label={west} position="left" className="left-3 top-1/2 -translate-y-1/2" />

      <div className="absolute inset-[18%] rounded-full border border-[var(--ui-divider)]" />
      <div className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--ui-brand-strong)]" />

      <div
        data-testid="qibla-needle"
        className="absolute inset-0 transition-transform duration-150 ease-out motion-reduce:transition-none"
        style={{ transform: `rotate(${rotation}deg)` }}
      >
        <svg viewBox="0 0 100 100" className="h-full w-full" focusable="false">
          <path
            d="M50 10 L57 48 L50 43 L43 48 Z"
            fill="var(--ui-brand)"
            stroke="var(--ui-brand-strong)"
            strokeWidth="1.5"
            vectorEffect="non-scaling-stroke"
          />
          <path
            d="M50 90 L56 52 L50 57 L44 52 Z"
            fill="var(--ui-surface)"
            stroke="var(--ui-brand-strong)"
            strokeWidth="1.5"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      </div>
    </div>
  );
}

function Cardinal({
  label,
  position,
  className,
}: {
  label: string;
  position: "top" | "right" | "bottom" | "left";
  className: string;
}) {
  return (
    <span
      dir="auto"
      data-physical-position={position}
      className={`absolute z-10 text-sm font-black text-[var(--ui-text-secondary-color)] ${className}`}
    >
      {label}
    </span>
  );
}
