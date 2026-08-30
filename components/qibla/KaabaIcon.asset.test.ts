import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("KaabaIcon vector asset", () => {
  it("ships as a standalone scalable SVG component without raster imagery", () => {
    const iconPath = resolve(process.cwd(), "components/qibla/KaabaIcon.tsx");

    expect(existsSync(iconPath)).toBe(true);

    if (!existsSync(iconPath)) return;

    const source = readFileSync(iconPath, "utf8");
    expect(source).toContain("<svg");
    expect(source).toContain('viewBox="0 0 64 64"');
    expect(source).not.toMatch(/<image\b/iu);
    expect(source).not.toMatch(/data:image\//iu);
  });
});
