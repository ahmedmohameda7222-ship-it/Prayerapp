import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import fixture from "../lib/__fixtures__/feed-v1.json";
import type { MasjidDisplayFeedV1 } from "../lib/feed-types";
import type { DisplayRuntimeViewModel } from "../lib/runtime/use-display-runtime";
import { DisplayShell } from "./DisplayShell";

vi.mock("qrcode.react", () => ({
  QRCodeSVG: ({ value, ...props }: { value: string; [key: string]: unknown }) => (
    <svg {...props} data-qr-value={value} />
  ),
}));
afterEach(cleanup);

const feed = structuredClone(fixture) as MasjidDisplayFeedV1;
function fridayVm(contentDe?: string): DisplayRuntimeViewModel {
  return {
    feed,
    logicalNow: new Date("2026-09-18T13:10:00+02:00"),
    state: { kind: "JUMUAH_NOW", prayer: null, degraded: false, degradedReason: null,
      serviceId: "primary:2026-09-18", serviceIndex: 0 },
    content: null, normalSlide: null, urgent: [],
    networkAvailable: true, usingLkg: false, prayerScheduleStale: false,
    publicAppUrl: feed.mosque.publicAppUrl,
    fridayKhutbah: contentDe ? { date: "2026-09-18", titleDe: "Die Freitagsbotschaft", contentDe } : null,
  };
}

describe("German-only Jumuah TV layout", () => {
  it("shows only published German sermon body and title on the main hero", () => {
    render(<DisplayShell vm={fridayVm("Liebe Gemeinde, wir erinnern uns an die Bedeutung des Gebets.")} />);
    const hero = screen.getByRole("main");
    expect(within(hero).getByText("Die Freitagsbotschaft")).toBeInTheDocument();
    expect(within(hero).getByText(/Liebe Gemeinde/)).toBeInTheDocument();
    expect(hero).not.toHaveTextContent(/صلاة الجمعة الآن|الخطبة|English|Türkisch/);
    expect(screen.queryByTestId("prayer-blackout")).not.toBeInTheDocument();
  });

  it("uses the same German date-scoped sermon for manually configured second Jumuah", () => {
    const model = fridayVm("Die Predigt für diesen Freitag.");
    model.logicalNow = new Date("2026-09-18T15:01:00+02:00");
    model.state = { ...model.state!, serviceId: "test-jumuah-2-2026-09-18", serviceIndex: 1 };
    render(<DisplayShell vm={model} />);
    expect(screen.getByTestId("friday-german-khutbah")).toHaveTextContent("Die Predigt für diesen Freitag.");
  });

  it("shows German-only absence message instead of Arab/English fallback if not published", () => {
    render(<DisplayShell vm={fridayVm()} />);
    const hero = screen.getByRole("main");
    expect(within(hero).getByText("Keine veröffentlichte deutsche Freitagspredigt vorhanden.")).toBeInTheDocument();
    expect(within(hero).queryByText(/Gebet läuft|صلاة الجمعة/)).not.toBeInTheDocument();
  });
});
