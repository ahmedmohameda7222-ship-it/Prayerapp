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

  it("preserves native SVG title props instead of repurposing them as accessibility labels", () => {
    render(<KaabaIcon data-testid="kaaba-icon" title="Kaaba tooltip" />);

    const icon = screen.getByTestId("kaaba-icon");
    expect(icon).toHaveAttribute("title", "Kaaba tooltip");
    expect(icon).toHaveAttribute("aria-hidden", "true");
    expect(icon).not.toHaveAttribute("aria-label");
  });

  it("uses the standard aria-label prop when the icon needs an accessible name", () => {
    render(<KaabaIcon data-testid="kaaba-icon" aria-label="Kaaba direction" />);

    expect(screen.getByRole("img", { name: "Kaaba direction" })).toBeInTheDocument();
    expect(screen.getByTestId("kaaba-icon")).not.toHaveAttribute("aria-hidden");
  });
});
