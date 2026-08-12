import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { BankTransferCard } from "./BankTransferCard";
import { PayPalCard } from "./PayPalCard";
import type { DonationSettings } from "@/lib/types";

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
      "phase1.paypalSupport": "You can also support the mosque securely with PayPal.",
    }[key] || key),
  }),
}));

const settings: DonationSettings = {
  accountHolder: "Masjid El-Rahman",
  iban: "DE001234567890",
  bic: "TESTDEFF",
  defaultPurpose: "Donation",
  paypalLink: "https://paypal.example/masjid",
};

describe("Home donation cards", () => {
  it("renders bank details as one divided surface", () => {
    render(<BankTransferCard settings={settings} home />);
    const surface = screen.getByTestId("home-bank-surface");
    expect(within(surface).getByText("Masjid El-Rahman")).toBeInTheDocument();
    expect(within(surface).getByText("DE001234567890")).toBeInTheDocument();
    expect(within(surface).getByText("TESTDEFF")).toBeInTheDocument();
    expect(within(surface).getByText("Donation")).toBeInTheDocument();
    expect(within(surface).getAllByRole("button")).toHaveLength(4);
  });

  it("shows neutral PayPal context and hides the raw URL on Home", () => {
    render(<PayPalCard paypalLink={settings.paypalLink} showUrl={false} home />);
    expect(screen.getByText("You can also support the mosque securely with PayPal.")).toBeInTheDocument();
    const cta = screen.getByRole("link", { name: /Donate with PayPal/i });
    expect(cta).toHaveAttribute("href", "https://paypal.example/masjid");
    expect(screen.queryByText("https://paypal.example/masjid")).not.toBeInTheDocument();
  });
});
