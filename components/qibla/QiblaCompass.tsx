import { KaabaIcon } from "@/components/qibla/KaabaIcon";

interface QiblaCompassProps {
  rotation: number;
  north: string;
  east: string;
  south: string;
  west: string;
  aligned?: boolean;
}

export function QiblaCompass({
  rotation,
  north,
  east,
  south,
  west,
  aligned = false,
}: QiblaCompassProps) {
  const needleFill = aligned ? "var(--ui-success)" : "var(--ui-brand)";
  const needleStroke = aligned ? "var(--ui-success)" : "var(--ui-brand-strong)";

  return (
    <div
      aria-hidden="true"
      data-testid="qibla-compass"
      data-aligned={aligned ? "true" : "false"}
      dir="ltr"
      className={`relative mx-auto aspect-square w-full max-w-[320px] rounded-full border transition-[border-color,background-color,box-shadow] duration-200 motion-reduce:transition-none ${
        aligned
          ? "border-[var(--ui-success)]"
          : "border-[var(--ui-divider)] bg-[var(--ui-surface-subtle)] shadow-inner"
      }`}
      style={
        aligned
          ? {
              backgroundColor:
                "color-mix(in srgb, var(--ui-success) 8%, var(--ui-surface-subtle))",
              boxShadow:
                "inset 0 0 0 1px color-mix(in srgb, var(--ui-success) 18%, transparent), 0 0 24px color-mix(in srgb, var(--ui-success) 22%, transparent)",
            }
          : undefined
      }
    >
      <Cardinal label={north} position="top" className="left-1/2 top-3 -translate-x-1/2" />
      <Cardinal label={east} position="right" className="right-3 top-1/2 -translate-y-1/2" />
      <Cardinal label={south} position="bottom" className="bottom-3 left-1/2 -translate-x-1/2" />
      <Cardinal label={west} position="left" className="left-3 top-1/2 -translate-y-1/2" />

      <div
        className={`absolute inset-[18%] rounded-full border ${
          aligned ? "border-[var(--ui-success)]" : "border-[var(--ui-divider)]"
        }`}
      />
      <div
        className={`absolute left-1/2 top-1/2 z-30 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full ${
          aligned ? "bg-[var(--ui-success)]" : "bg-[var(--ui-brand-strong)]"
        }`}
      />

      <div
        data-testid="qibla-needle"
        data-aligned={aligned ? "true" : "false"}
        className="absolute inset-0 z-10 transition-transform duration-150 ease-out motion-reduce:transition-none"
        style={{ transform: `rotate(${rotation}deg)` }}
      >
        <svg viewBox="0 0 100 100" className="h-full w-full" focusable="false">
          <path
            d="M50 10 L57 48 L50 43 L43 48 Z"
            fill={needleFill}
            stroke={needleStroke}
            strokeWidth="1.5"
            vectorEffect="non-scaling-stroke"
          />
          <path
            d="M50 90 L56 52 L50 57 L44 52 Z"
            fill="var(--ui-surface)"
            stroke={needleStroke}
            strokeWidth="1.5"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      </div>

      <div
        data-testid="qibla-kaaba-target"
        className="pointer-events-none absolute inset-0 z-20 transition-transform duration-150 ease-out motion-reduce:transition-none"
        style={{ transform: `rotate(${rotation}deg)` }}
      >
        <div className="absolute left-1/2 top-[15%] -translate-x-1/2 -translate-y-1/2">
          <KaabaIcon
            data-testid="qibla-kaaba-icon"
            className="h-10 w-10 transition-[filter] duration-200 motion-reduce:transition-none"
            style={{
              transform: `rotate(${-rotation}deg)`,
              filter: aligned ? "drop-shadow(0 0 8px var(--ui-success))" : undefined,
            }}
          />
        </div>
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
