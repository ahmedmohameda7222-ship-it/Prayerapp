import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { KaabaIcon } from "@/components/qibla/KaabaIcon";

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

  it("does not expose a custom title prop as a second accessibility naming API", () => {
    const source = readFileSync(resolve(process.cwd(), "components/qibla/KaabaIcon.tsx"), "utf8");

    expect(source).not.toContain("title?: string");
    expect(source).not.toContain("aria-label={title}");
  });

  it("uses the standard aria-label prop when the icon needs an accessible name", () => {
    render(<KaabaIcon data-testid="kaaba-icon" aria-label="Kaaba direction" />);

    expect(screen.getByRole("img", { name: "Kaaba direction" })).toBeInTheDocument();
    expect(screen.getByTestId("kaaba-icon")).not.toHaveAttribute("aria-hidden");
  });
});
