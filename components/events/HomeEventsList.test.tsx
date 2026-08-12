import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { HomeEventsList } from "./HomeEventsList";
import type { Event } from "@/lib/types";

vi.mock("@/lib/i18n/use-translation", () => ({
  useTranslation: () => ({
    locale: "en",
    t: (key: string) => key.replace("eventTypes.", ""),
  }),
}));

const events: Event[] = [
  {
    id: "event-1",
    title: "Quran Circle",
    description: "A complete first event description that should remain visible.",
    date: "2026-08-14",
    startTime: "18:00",
    endTime: "19:30",
    location: "Main prayer hall",
    type: "Class",
    published: true,
  },
  {
    id: "event-2",
    title: "Community Dinner",
    description: "A complete second event description that should remain visible.",
    date: "2026-08-16",
    startTime: "19:00",
    endTime: "21:00",
    location: "Community room",
    type: "Community",
    published: true,
  },
];

describe("HomeEventsList", () => {
  it("renders all events inside one non-clickable surface with full event information", () => {
    render(<HomeEventsList events={events} />);

    const surface = screen.getByTestId("home-events-surface");
    const rows = within(surface).getAllByTestId("home-event-row");
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent("Quran Circle");
    expect(rows[0]).toHaveTextContent("A complete first event description that should remain visible.");
    expect(rows[0]).toHaveTextContent("Main prayer hall");
    expect(rows[0]).toHaveTextContent("Class");
    expect(rows[1]).toHaveTextContent("Community Dinner");
    expect(rows[1]).toHaveTextContent("Community room");
    expect(within(surface).queryByRole("link")).not.toBeInTheDocument();
    expect(within(surface).queryByRole("button")).not.toBeInTheDocument();
    expect(surface).toHaveClass("home-events-surface");
    expect(surface.className).not.toMatch(/shadow|cream|\bcard\b/);
  });
});
