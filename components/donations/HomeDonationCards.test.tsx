import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { BankTransferCard } from "./BankTransferCard";
import { DonationCampaignCard } from "./DonationCampaignCard";
import { PayPalCard } from "./PayPalCard";
import { TransparencyCard } from "./TransparencyCard";
import type { DonationCampaign, DonationReport, DonationSettings } from "@/lib/types";

vi.mock("@/lib/i18n/use-translation", () => ({
  useTranslation: () => ({
    locale: "en",
    t: (key: string) => ({
      "donations.bankTransfer": "Bank Transfer",
      "donations.accountHolder": "Account holder",
      "donations.iban": "IBAN",
      "donations.bic": "BIC",
      "donations.reference": "Reference",
      "donations.copy": "Copy",
      "donations.copied": "Copied",
      "donations.donateWithPaypal": "Donate with PayPal",
      "donations.monthlyNeed": "Monthly need",
      "donations.donationsReceived": "Donations received",
      "donations.remaining": "Remaining",
      "phase1.paypalSupport": "You can also support the mosque securely with PayPal.",
    }[key] || key),
  }),
}));

const settings: DonationSettings = {
  accountHolder: "Danube Mosque",
  iban: "DE001234567890",
  bic: "TESTDEFF",
  defaultPurpose: "Donation",
  paypalLink: "https://paypal.me/verifiedmasjid",
};

const campaign: DonationCampaign = {
  id: "campaign-1",
  title: "Masjid expansion",
  description: "A factual campaign description.",
  targetAmount: 3000,
  collectedAmount: 1250,
  startDate: "2026-08-01",
  endDate: "2026-09-01",
  isActive: true,
  isFeatured: true,
};

const report: DonationReport = {
  month: "2026-08",
  monthlyNeed: 3000,
  donationsReceived: 1250,
  remaining: 1750,
};

describe("Home donation cards", () => {
  it("renders each campaign as a restrained Home surface without the legacy card", () => {
    render(<DonationCampaignCard campaign={campaign} home />);
    const surface = screen.getByTestId("home-donation-campaign-surface");
    expect(surface).toHaveClass("home-donation-surface");
    expect(surface).toHaveTextContent("Masjid expansion");
    expect(surface).toHaveTextContent("A factual campaign description.");
    expect(surface.className).not.toMatch(/\bcard\b/);
    expect(within(surface).getByRole("progressbar")).toHaveAttribute("aria-valuenow", "42");
  });

  it("renders bank details as one divided surface", () => {
    render(<BankTransferCard settings={settings} home />);
    const surface = screen.getByTestId("home-bank-surface");
    expect(within(surface).getByText("Danube Mosque")).toBeInTheDocument();
    expect(within(surface).getByText("DE001234567890")).toBeInTheDocument();
    expect(within(surface).getByText("TESTDEFF")).toBeInTheDocument();
    expect(within(surface).getByText("Donation")).toBeInTheDocument();
    expect(within(surface).getAllByRole("button")).toHaveLength(4);
    expect(surface).toHaveClass("home-donation-surface");
    expect(surface.closest(".card")).toBeNull();
  });

  it("renders the three Home transparency metrics side by side", () => {
    render(<TransparencyCard report={report} home />);
    const surface = screen.getByTestId("home-transparency-surface");
    const metrics = within(surface).getAllByTestId("home-transparency-metric");

    expect(surface).toHaveClass("home-donation-surface", "grid", "grid-cols-3", "divide-x");
    expect(surface).not.toHaveClass("divide-y");
    expect(surface.className).not.toMatch(/\bcard\b/);
    expect(metrics).toHaveLength(3);
    expect(metrics[0]).toHaveTextContent("Monthly need");
    expect(metrics[0]).toHaveTextContent("3,000");
    expect(metrics[1]).toHaveTextContent("Donations received");
    expect(metrics[1]).toHaveTextContent("1,250");
    expect(metrics[2]).toHaveTextContent("Remaining");
    expect(metrics[2]).toHaveTextContent("1,750");
  });

  it("shows neutral PayPal context and hides the raw URL on Home", () => {
    render(<PayPalCard paypalLink={settings.paypalLink} showUrl={false} home />);
    expect(screen.getByText("You can also support the mosque securely with PayPal.")).toBeInTheDocument();
    const cta = screen.getByRole("link", { name: /Donate with PayPal/i });
    const surface = screen.getByTestId("home-paypal-surface");
    expect(cta).toHaveAttribute("href", "https://paypal.me/verifiedmasjid");
    expect(screen.queryByText("https://paypal.me/verifiedmasjid")).not.toBeInTheDocument();
    expect(surface).toHaveClass("home-donation-surface");
    expect(cta.closest(".card")).toBeNull();
  });

  it("does not render a PayPal action for an unapproved host", () => {
    const { container } = render(<PayPalCard paypalLink="https://paypal.me.attacker.invalid/masjid" home />);
    expect(container).toBeEmptyDOMElement();
  });
});
