import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { QiblaCompass } from "@/components/qibla/QiblaCompass";

describe("QiblaCompass physical coordinate system", () => {
  it("keeps east physically right and west physically left in RTL content", () => {
    render(
      <div dir="rtl">
        <QiblaCompass rotation={90} north="ش" east="ق" south="ج" west="غ" aligned={false} />
      </div>,
    );

    const compass = screen.getByTestId("qibla-compass");
    expect(compass).toHaveAttribute("dir", "ltr");
    expect(screen.getByText("ق")).toHaveAttribute("data-physical-position", "right");
    expect(screen.getByText("غ")).toHaveAttribute("data-physical-position", "left");
    expect(screen.getByText("ش")).toHaveAttribute("data-physical-position", "top");
    expect(screen.getByText("ج")).toHaveAttribute("data-physical-position", "bottom");
  });

  it("uses one positive-clockwise rotation coordinate system and hides the graphic from assistive technology", () => {
    render(<QiblaCompass rotation={37} north="N" east="E" south="S" west="W" aligned={false} />);
    expect(screen.getByTestId("qibla-compass")).toHaveAttribute("aria-hidden", "true");
    expect(screen.getByTestId("qibla-needle")).toHaveStyle({ transform: "rotate(37deg)" });
  });

  it("keeps a visible Kaaba target on the same Qibla rotation while the icon stays upright", () => {
    render(<QiblaCompass rotation={37} north="N" east="E" south="S" west="W" aligned={false} />);

    expect(screen.getByTestId("qibla-kaaba-target")).toHaveStyle({ transform: "rotate(37deg)" });
    expect(screen.getByTestId("qibla-kaaba-icon")).toHaveStyle({ transform: "rotate(-37deg)" });
  });

  it("exposes the green success visual state only when aligned", () => {
    const { rerender } = render(
      <QiblaCompass rotation={6} north="N" east="E" south="S" west="W" aligned={false} />,
    );

    expect(screen.getByTestId("qibla-compass")).toHaveAttribute("data-aligned", "false");
    expect(screen.getByTestId("qibla-needle")).toHaveAttribute("data-aligned", "false");

    rerender(<QiblaCompass rotation={1.5} north="N" east="E" south="S" west="W" aligned />);

    expect(screen.getByTestId("qibla-compass")).toHaveAttribute("data-aligned", "true");
    expect(screen.getByTestId("qibla-needle")).toHaveAttribute("data-aligned", "true");
  });

  it("keeps a usable surface and shadow fallback when aligned enhancement CSS is unsupported", () => {
    render(<QiblaCompass rotation={0} north="N" east="E" south="S" west="W" aligned />);

    expect(screen.getByTestId("qibla-compass")).toHaveClass(
      "bg-[var(--ui-surface-subtle)]",
      "shadow-inner",
    );
  });
});
