import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import fixture from "../../../lib/__fixtures__/feed-v1.json";
import { activeDisplayContent } from "../../../lib/content-eligibility";
import type { MasjidDisplayFeedV1 } from "../../../lib/feed-types";
import type { DisplayRuntimeViewModel } from "../../../lib/runtime/use-display-runtime";
import type { NormalSlide } from "../../../lib/scheduler";
import { DisplayShell } from "../../DisplayShell";

vi.mock("qrcode.react", () => ({
  QRCodeSVG: ({
    value,
    title,
    ...props
  }: {
    value: string;
    title?: string;
    [key: string]: unknown;
  }) => (
    <svg {...props} aria-label={title ?? value} data-qr-value={value} />
  ),
}));

function cloneFeed(): MasjidDisplayFeedV1 {
  return structuredClone(fixture) as MasjidDisplayFeedV1;
}

function normalVm(
  feed: MasjidDisplayFeedV1,
  logicalNow: Date,
  slide: NormalSlide,
): DisplayRuntimeViewModel {
  return {
    feed,
    logicalNow,
    state: {
      kind: "NORMAL",
      prayer: null,
      degraded: false,
      degradedReason: null,
    },
    content: activeDisplayContent(feed, logicalNow),
    normalSlide: slide,
    urgent: [],
    networkAvailable: true,
    usingLkg: false,
    prayerScheduleStale: false,
    testMode: false,
    testPayload: null,
    publicAppUrl: feed.mosque.publicAppUrl,
  };
}

afterEach(() => cleanup());

describe("normal rotating content renderers", () => {
  it("renders Azkar Arabic text, German meaning, and source without a marquee", () => {
    const feed = cloneFeed();
    const now = new Date("2026-09-15T08:00:00.000Z");
    const { container } = render(
      <DisplayShell
        vm={normalVm(feed, now, { kind: "AZKAR", itemId: "test-azkar-morning" })}
      />,
    );

    const main = screen.getByRole("main");
    expect(within(main).getByText("سبحان الله")).toBeInTheDocument();
    expect(within(main).getByText("Gepriesen sei Allah")).toBeInTheDocument();
    expect(within(main).getByText(/Synthetic fixture/)).toBeInTheDocument();
    expect(container.querySelector("marquee")).toBeNull();
  });

  it("groups two short event cards but falls back to one when selected copy is long", () => {
    const feed = cloneFeed();
    const now = new Date("2026-09-15T10:00:00.000Z");
    const { rerender } = render(
      <DisplayShell
        vm={normalVm(feed, now, { kind: "EVENT", itemId: "test-event-current" })}
      />,
    );

    let main = screen.getByRole("main");
    expect(within(main).getAllByTestId("event-card")).toHaveLength(2);
    expect(within(main).getByText("Aktuelle Veranstaltung")).toBeInTheDocument();
    expect(within(main).getByText("Kommende Veranstaltung")).toBeInTheDocument();

    const longFeed = cloneFeed();
    longFeed.events[0].descriptionAr = "وصف طويل ".repeat(45);
    longFeed.events[0].descriptionDe = "Sehr lange Beschreibung ".repeat(35);
    rerender(
      <DisplayShell
        vm={normalVm(longFeed, now, { kind: "EVENT", itemId: "test-event-current" })}
      />,
    );

    main = screen.getByRole("main");
    expect(within(main).getAllByTestId("event-card")).toHaveLength(1);
    expect(within(main).queryByText("Kommende Veranstaltung")).not.toBeInTheDocument();
  });

  it("groups two short campaigns when readable", () => {
    const feed = cloneFeed();
    feed.campaigns[1].startDate = "2026-09-01";
    feed.campaigns[1].endDate = null;
    const now = new Date("2026-09-15T10:00:00.000Z");

    render(
      <DisplayShell
        vm={normalVm(feed, now, {
          kind: "CAMPAIGN",
          itemId: "test-campaign-active-url",
        })}
      />,
    );

    expect(within(screen.getByRole("main")).getAllByTestId("campaign-card")).toHaveLength(2);
  });

  it("omits a campaign QR without a donation URL and encodes the exact URL when present", () => {
    const noUrlFeed = cloneFeed();
    const noUrl = noUrlFeed.campaigns[1];
    noUrl.startDate = "2026-09-01";
    noUrl.endDate = null;
    noUrlFeed.campaigns = [noUrl];
    const now = new Date("2026-09-15T10:00:00.000Z");
    const { rerender } = render(
      <DisplayShell
        vm={normalVm(noUrlFeed, now, { kind: "CAMPAIGN", itemId: noUrl.id })}
      />,
    );

    let main = screen.getByRole("main");
    expect(within(main).queryByTestId("campaign-qr")).not.toBeInTheDocument();

    const withUrlFeed = cloneFeed();
    const withUrl = withUrlFeed.campaigns[0];
    withUrlFeed.campaigns = [withUrl];
    rerender(
      <DisplayShell
        vm={normalVm(withUrlFeed, now, { kind: "CAMPAIGN", itemId: withUrl.id })}
      />,
    );

    main = screen.getByRole("main");
    expect(within(main).getByTestId("campaign-qr")).toHaveAttribute(
      "data-qr-value",
      withUrl.donationUrl,
    );
  });

  it("rotates long announcement copy between Arabic and German instead of shrinking both", () => {
    const feed = cloneFeed();
    const announcement = {
      id: "long-announcement",
      titleAr: "إعلان طويل",
      titleDe: "Lange Ankündigung",
      messageAr: "هذه رسالة عربية طويلة للاختبار ".repeat(18),
      messageDe: "Dies ist eine lange deutsche Testnachricht ".repeat(18),
      isUrgent: false,
      displayStyle: "normal" as const,
      displayFrom: null,
      displayUntil: null,
    };
    feed.announcements = [announcement];

    const arNow = new Date("2026-09-15T10:00:00.000Z");
    const { rerender } = render(
      <DisplayShell
        vm={normalVm(feed, arNow, { kind: "ANNOUNCEMENT", itemId: announcement.id })}
      />,
    );

    let main = screen.getByRole("main");
    expect(within(main).getByText(announcement.messageAr)).toBeInTheDocument();
    expect(within(main).queryByText(announcement.messageDe)).not.toBeInTheDocument();

    const deNow = new Date("2026-09-15T10:00:08.000Z");
    rerender(
      <DisplayShell
        vm={normalVm(feed, deNow, { kind: "ANNOUNCEMENT", itemId: announcement.id })}
      />,
    );

    main = screen.getByRole("main");
    expect(within(main).getByText(announcement.messageDe)).toBeInTheDocument();
    expect(within(main).queryByText(announcement.messageAr)).not.toBeInTheDocument();
  });

  it("renders Special Display bilingually", () => {
    const feed = cloneFeed();
    const now = new Date("2026-09-20T10:00:00.000Z");
    const special = feed.announcements.find((item) => item.displayStyle === "special")!;

    render(
      <DisplayShell
        vm={normalVm(feed, now, { kind: "SPECIAL", itemId: special.id })}
      />,
    );

    const main = screen.getByRole("main");
    expect(within(main).getByText(special.titleAr)).toBeInTheDocument();
    expect(within(main).getByText(special.titleDe)).toBeInTheDocument();
  });

  it("renders Maghrib Program as information only and does not invent an Isha state", () => {
    const feed = cloneFeed();
    const now = new Date("2026-09-15T18:30:00.000Z");
    render(
      <DisplayShell
        vm={normalVm(feed, now, {
          kind: "MAGHRIB_PROGRAM",
          itemId: "maghrib-program:2026-09-15",
        })}
      />,
    );

    const main = screen.getByRole("main");
    expect(within(main).getByText("درس المغرب")).toBeInTheDocument();
    expect(within(main).getByText(/20:15/)).toBeInTheDocument();
    expect(within(main).queryByTestId("prayer-state-iqama-now")).not.toBeInTheDocument();
    expect(within(main).queryByTestId("prayer-state-prayer-in-progress")).not.toBeInTheDocument();
  });
});
