"use client";

export function SegmentedControl({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="grid grid-cols-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-1">
      {options.map((option) => (
        <button
          key={option}
          onClick={() => onChange(option)}
          className={`min-h-10 rounded-xl px-3 text-sm font-bold transition ${
            value === option ? "bg-[var(--color-emerald)] text-[var(--color-card)]" : "text-[var(--color-muted)]"
          }`}
        >
          {option}
        </button>
      ))}
    </div>
  );
}
