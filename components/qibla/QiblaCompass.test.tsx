import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { QiblaCompass } from "@/components/qibla/QiblaCompass";

describe("QiblaCompass physical coordinate system", () => {
  it("keeps east physically right and west physically left in RTL content", () => {
    render(
      <div dir="rtl">
        <QiblaCompass rotation={90} north="ش" east="ق" south="ج" west="غ" />
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
    render(<QiblaCompass rotation={37} north="N" east="E" south="S" west="W" />);
    expect(screen.getByTestId("qibla-compass")).toHaveAttribute("aria-hidden", "true");
    expect(screen.getByTestId("qibla-needle")).toHaveStyle({ transform: "rotate(37deg)" });
  });
});
