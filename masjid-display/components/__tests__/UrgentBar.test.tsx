import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { DisplayAnnouncementDto } from "../../lib/feed-types";
import { UrgentBar } from "../UrgentBar";

const items: DisplayAnnouncementDto[] = [
  {
    id: "urgent-a",
    titleAr: "العاجل أ",
    titleDe: "Dringend A",
    messageAr: "رسالة أ",
    messageDe: "Meldung A",
    isUrgent: true,
    displayStyle: "normal",
    displayFrom: null,
    displayUntil: null,
  },
  {
    id: "urgent-b",
    titleAr: "العاجل ب",
    titleDe: "Dringend B",
    messageAr: "رسالة ب",
    messageDe: "Meldung B",
    isUrgent: true,
    displayStyle: "normal",
    displayFrom: null,
    displayUntil: null,
  },
];

afterEach(cleanup);

describe("UrgentBar rotation", () => {
  it("rotates Arabic A → German A → Arabic B → German B every eight seconds", () => {
    const { rerender } = render(
      <UrgentBar items={items} logicalNow={new Date(0)} />,
    );

    expect(screen.getByText("العاجل أ")).toBeInTheDocument();
    expect(screen.queryByText("Dringend A")).not.toBeInTheDocument();
    expect(screen.queryByText("العاجل ب")).not.toBeInTheDocument();

    rerender(<UrgentBar items={items} logicalNow={new Date(8_000)} />);
    expect(screen.getByText("Dringend A")).toBeInTheDocument();
    expect(screen.queryByText("العاجل أ")).not.toBeInTheDocument();

    rerender(<UrgentBar items={items} logicalNow={new Date(16_000)} />);
    expect(screen.getByText("العاجل ب")).toBeInTheDocument();
    expect(screen.queryByText("Dringend B")).not.toBeInTheDocument();

    rerender(<UrgentBar items={items} logicalNow={new Date(24_000)} />);
    expect(screen.getByText("Dringend B")).toBeInTheDocument();
    expect(screen.queryByText("العاجل ب")).not.toBeInTheDocument();
  });

  it("wraps back to the first language/item view deterministically", () => {
    render(<UrgentBar items={items} logicalNow={new Date(32_000)} />);
    expect(screen.getByText("العاجل أ")).toBeInTheDocument();
  });
});
