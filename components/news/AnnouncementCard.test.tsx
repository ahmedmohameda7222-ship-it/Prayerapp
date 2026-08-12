import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AnnouncementCard } from "./AnnouncementCard";
import type { Announcement } from "@/lib/types";

vi.mock("@/lib/i18n/use-translation", () => ({
  useTranslation: () => ({
    locale: "en",
    t: (key: string) => key,
  }),
}));

const announcement: Announcement = {
  id: "urgent-1",
  title: "Urgent mosque notice",
  message: "The complete announcement message must remain visible on Home.",
  type: "Urgent",
  isUrgent: true,
  published: true,
  createdAt: "2026-08-12T10:00:00.000Z",
};

describe("AnnouncementCard Home variant", () => {
  it("links the full urgent content to news without card decorations", () => {
    const { container } = render(<AnnouncementCard announcement={announcement} home />);

    expect(screen.getByRole("link", { name: "Urgent mosque notice" })).toHaveAttribute("href", "/news");
    expect(screen.getByText(announcement.message)).toBeInTheDocument();
    expect(screen.queryByText(/2026-08-12/)).not.toBeInTheDocument();
    expect(container.querySelector(".card")).toBeNull();
    expect(container.querySelector("svg")).toBeNull();
  });
});
