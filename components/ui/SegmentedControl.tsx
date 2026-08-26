"use client";

export function SegmentedControl({
  options,
  value,
  onChange,
}: {
  options: Array<string | { value: string; label: string }>;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="grid grid-cols-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-1">
      {options.map((option) => {
        const optionValue = typeof option === "string" ? option : option.value;
        const optionLabel = typeof option === "string" ? option : option.label;
        return (
          <button
            key={optionValue}
            type="button"
            aria-pressed={value === optionValue}
            onClick={() => onChange(optionValue)}
            className={`min-h-11 rounded-xl px-3 text-sm font-bold transition ${
              value === optionValue ? "bg-[var(--color-emerald)] text-[var(--color-card)]" : "text-[var(--color-muted)]"
            }`}
          >
            {optionLabel}
          </button>
        );
      })}
    </div>
  );
}
