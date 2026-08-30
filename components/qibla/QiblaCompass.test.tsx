import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { QiblaCompass } from "@/components/qibla/QiblaCompass";

describe("QiblaCompass physical coordinate system", () => {
  it("keeps east physically right and west physically left in RTL content", () => {
    render(
      <div dir="rtl">
        <QiblaCompass
          qiblaBearing={132}
          heading={90}
          north="ش"
          east="ق"
          south="ج"
          west="غ"
          aligned={false}
        />
      </div>,
    );

    const compass = screen.getByTestId("qibla-compass");
    expect(compass).toHaveAttribute("dir", "ltr");
    expect(screen.getByText("ق")).toHaveAttribute("data-physical-position", "right");
    expect(screen.getByText("غ")).toHaveAttribute("data-physical-position", "left");
    expect(screen.getByText("ش")).toHaveAttribute("data-physical-position", "top");
    expect(screen.getByText("ج")).toHaveAttribute("data-physical-position", "bottom");
  });

  it("keeps the Kaaba fixed at its absolute bearing while only the live heading needle moves", () => {
    const { rerender } = render(
      <QiblaCompass
        qiblaBearing={132}
        heading={90}
        north="N"
        east="E"
        south="S"
        west="W"
        aligned={false}
      />,
    );

    expect(screen.getByTestId("qibla-kaaba-target")).toHaveStyle({ transform: "rotate(132deg)" });
    expect(screen.getByTestId("qibla-kaaba-icon")).toHaveStyle({ transform: "rotate(-132deg)" });
    expect(screen.getByTestId("qibla-needle")).toHaveStyle({ transform: "rotate(90deg)" });

    rerender(
      <QiblaCompass
        qiblaBearing={132}
        heading={120}
        north="N"
        east="E"
        south="S"
        west="W"
        aligned={false}
      />,
    );

    expect(screen.getByTestId("qibla-kaaba-target")).toHaveStyle({ transform: "rotate(132deg)" });
    expect(screen.getByTestId("qibla-kaaba-icon")).toHaveStyle({ transform: "rotate(-132deg)" });
    expect(screen.getByTestId("qibla-needle")).toHaveStyle({ transform: "rotate(120deg)" });
  });

  it("uses one positive-clockwise north-up coordinate system and hides the graphic from assistive technology", () => {
    render(
      <QiblaCompass
        qiblaBearing={132}
        heading={37}
        north="N"
        east="E"
        south="S"
        west="W"
        aligned={false}
      />,
    );

    expect(screen.getByTestId("qibla-compass")).toHaveAttribute("aria-hidden", "true");
    expect(screen.getByTestId("qibla-kaaba-target")).toHaveStyle({ transform: "rotate(132deg)" });
    expect(screen.getByTestId("qibla-needle")).toHaveStyle({ transform: "rotate(37deg)" });
  });

  it("exposes the green success visual state only when aligned", () => {
    const { rerender } = render(
      <QiblaCompass
        qiblaBearing={132}
        heading={126}
        north="N"
        east="E"
        south="S"
        west="W"
        aligned={false}
      />,
    );

    expect(screen.getByTestId("qibla-compass")).toHaveAttribute("data-aligned", "false");
    expect(screen.getByTestId("qibla-needle")).toHaveAttribute("data-aligned", "false");

    rerender(
      <QiblaCompass
        qiblaBearing={132}
        heading={132}
        north="N"
        east="E"
        south="S"
        west="W"
        aligned
      />,
    );

    expect(screen.getByTestId("qibla-compass")).toHaveAttribute("data-aligned", "true");
    expect(screen.getByTestId("qibla-needle")).toHaveAttribute("data-aligned", "true");
    expect(screen.getByTestId("qibla-kaaba-target")).toHaveStyle({ transform: "rotate(132deg)" });
    expect(screen.getByTestId("qibla-needle")).toHaveStyle({ transform: "rotate(132deg)" });
  });

  it("keeps a usable surface and shadow fallback when aligned enhancement CSS is unsupported", () => {
    render(
      <QiblaCompass
        qiblaBearing={132}
        heading={132}
        north="N"
        east="E"
        south="S"
        west="W"
        aligned
      />,
    );

    expect(screen.getByTestId("qibla-compass")).toHaveClass(
      "bg-[var(--ui-surface-subtle)]",
      "shadow-inner",
    );
  });

  it("requires callers to provide absolute bearing, live heading, and alignment explicitly", () => {
    const source = readFileSync(resolve(process.cwd(), "components/qibla/QiblaCompass.tsx"), "utf8");

    expect(source).toContain("qiblaBearing: number;");
    expect(source).toContain("heading: number;");
    expect(source).toContain("aligned: boolean;");
    expect(source).not.toContain("rotation: number;");
  });
});
