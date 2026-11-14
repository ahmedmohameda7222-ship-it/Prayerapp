import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import fixture from "../../lib/__fixtures__/feed-v1.json";
import type { MasjidDisplayFeedV1 } from "../../lib/feed-types";
import type { DisplayRuntimeViewModel } from "../../lib/runtime/use-display-runtime";
import { DisplayShell } from "../DisplayShell";

vi.mock("qrcode.react", () => ({
  QRCodeSVG: ({ value, "data-testid": id }: { value: string; "data-testid"?: string }) => (
    <svg data-testid={id} data-qr-value={value} />
  ),
}));

afterEach(cleanup);

function vm(
  localTime: string,
  overrides: Partial<DisplayRuntimeViewModel> = {},
): DisplayRuntimeViewModel {
  const feed = structuredClone(fixture) as MasjidDisplayFeedV1;
  return {
    feed,
    logicalNow: new Date(localTime),
    state: { kind: "NORMAL", prayer: null, degraded: false, degradedReason: null },
    content: null,
    normalSlide: null,
    urgent: [],
    networkAvailable: true,
    usingLkg: false,
    prayerScheduleStale: false,
    publicAppUrl: feed.mosque.publicAppUrl,
    ...overrides,
  };
}

const nextSlide = { kind: "NEXT_PRAYER", itemId: null } as const;

describe("mosque identity and absolute Iqama display", () => {
  it("replaces the old decorative seal with a real mosque silhouette", () => {
    render(<DisplayShell vm={vm("2026-09-15T12:30:00+02:00")} />);
    const icon = screen.getByRole("img", { name: /moschee|مسجد/i });
    expect(icon.tagName.toLowerCase()).toBe("svg");
    expect(icon.querySelectorAll("path").length).toBeGreaterThanOrEqual(2);
    expect(screen.queryByText("۞")).not.toBeInTheDocument();
  });

  it("shows the absolute Iqama clock time beneath every ordinary prayer", () => {
    render(<DisplayShell vm={vm("2026-09-15T12:30:00+02:00")} />);
    const expected = { fajr: "05:20", dhuhr: "13:25", asr: "17:00", maghrib: "19:30", isha: "21:00" };
    for (const [prayer, time] of Object.entries(expected)) {
      const cell = screen.getByTestId(`prayer-${prayer}`);
      expect(within(cell).getByTestId(`prayer-iqama-${prayer}`)).toHaveTextContent(`Iqama ${time}`);
      expect(cell).not.toHaveTextContent(/Iqama \+\d+/);
    }
    expect(screen.queryByTestId("prayer-iqama-sunrise")).not.toBeInTheDocument();
  });

  it("does not invent a Jumuah Iqama on Fridays", () => {
    render(<DisplayShell vm={vm("2026-09-18T12:20:00+02:00")} />);
    expect(screen.queryByTestId("prayer-iqama-dhuhr")).not.toBeInTheDocument();
    expect(screen.getByTestId("prayer-dhuhr")).toHaveTextContent("Jumuah");
  });

  it("formats an Isha Iqama across midnight as 00:10 in Berlin", () => {
    const model = vm("2026-09-15T12:30:00+02:00");
    model.feed!.prayers.schedule.find((day) => day.date === "2026-09-15")!.isha = "23:50";
    model.feed!.prayers.iqamaDelays.isha = 20;
    render(<DisplayShell vm={model} />);
    expect(screen.getByTestId("prayer-iqama-isha")).toHaveTextContent("Iqama 00:10");
  });
});

describe("Next Prayer in the normal ten-second rotation", () => {
  it("renders the real upcoming Adhan and Iqama, without placeholders", () => {
    render(<DisplayShell vm={vm("2026-09-15T16:30:00+02:00", { normalSlide: nextSlide })} />);
    const hero = screen.getByRole("main");
    expect(within(hero).getByText("الصلاة القادمة")).toBeInTheDocument();
    expect(within(hero).getByText("Asr")).toBeInTheDocument();
    expect(within(hero).getByTestId("next-prayer-adhan")).toHaveTextContent("16:45");
    expect(within(hero).getByTestId("next-prayer-iqama")).toHaveTextContent("17:00");
  });

  it("shows the first Friday service without manufacturing an Iqama", () => {
    render(<DisplayShell vm={vm("2026-09-18T12:30:00+02:00", { normalSlide: nextSlide })} />);
    const hero = screen.getByRole("main");
    expect(within(hero).getByText(/Jumuah 1/)).toBeInTheDocument();
    expect(within(hero).getByTestId("next-prayer-adhan")).toHaveTextContent("13:10");
    expect(within(hero).queryByTestId("next-prayer-iqama")).not.toBeInTheDocument();
  });

  it("includes a manually configured second Friday service and omits its Iqama", () => {
    render(<DisplayShell vm={vm("2026-09-18T14:00:00+02:00", { normalSlide: nextSlide })} />);
    const hero = screen.getByRole("main");
    expect(within(hero).getByText(/Jumuah 2/)).toBeInTheDocument();
    expect(within(hero).getByTestId("next-prayer-adhan")).toHaveTextContent("15:00");
    expect(within(hero).queryByTestId("next-prayer-iqama")).not.toBeInTheDocument();
  });

  it("rolls over to tomorrow's Fajr after Isha", () => {
    render(<DisplayShell vm={vm("2026-09-15T22:00:00+02:00", { normalSlide: nextSlide })} />);
    const hero = screen.getByRole("main");
    expect(within(hero).getByText("Fajr")).toBeInTheDocument();
    expect(within(hero).getByTestId("next-prayer-adhan")).toHaveTextContent("05:00");
    expect(within(hero).getByTestId("next-prayer-iqama")).toHaveTextContent("05:20");
  });
});
