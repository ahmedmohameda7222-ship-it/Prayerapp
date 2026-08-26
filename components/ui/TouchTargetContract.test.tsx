import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("public touch-target contract", () => {
  it("keeps the shared button primitive at least 44px tall", () => {
    const button = source("components/ui/Button.tsx");
    expect(button).toContain("min-h-11");
  });

  it("keeps segmented-control options at least 44px tall", () => {
    const segmented = source("components/ui/SegmentedControl.tsx");
    expect(segmented).toContain("min-h-11");
    expect(segmented).not.toContain("min-h-10");
  });

  it("does not shrink Android diagnostic actions below 44px", () => {
    const settings = source("components/settings/SettingsControls.tsx");
    expect(settings).toContain('className="min-h-11 shrink-0 px-3 py-1.5 text-xs"');
    expect(settings).not.toContain('className="min-h-9 shrink-0 px-3 py-1.5 text-xs"');
  });
});
