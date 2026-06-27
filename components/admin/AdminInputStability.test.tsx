import type { ReactNode } from "react";
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { I18nProvider } from "@/lib/i18n/context";
import AdminPrayerTimesPage from "@/app/admin/prayer-times/page";
import AdminDonationsPage from "@/app/admin/donations/page";

const dataMocks = vi.hoisted(() => ({
  getPrayerTimes: vi.fn(),
  getDonationSettings: vi.fn(),
  getDonationCampaigns: vi.fn(),
  getDonations: vi.fn(),
  getDonationReport: vi.fn(),
}));

vi.mock("@/components/layout/AdminShell", () => ({
  AdminShell: ({ children }: { children: ReactNode }) => <>{children}</>,
}));
vi.mock("@/lib/auth/use-admin-auth", () => ({
  useAdminAuth: () => ({ session: { access_token: "test-token" } }),
}));
vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({}) }));
vi.mock("@/lib/data/prayer-times", () => ({ getPrayerTimes: dataMocks.getPrayerTimes }));
vi.mock("@/lib/data/donations", () => ({
  getDonationSettings: dataMocks.getDonationSettings,
  getDonationCampaigns: dataMocks.getDonationCampaigns,
  getDonations: dataMocks.getDonations,
  getDonationReport: dataMocks.getDonationReport,
}));
vi.mock("@/app/admin/prayer-times/actions", () => ({}));
vi.mock("@/app/admin/donations/actions", () => ({}));

function renderInEnglish(node: ReactNode) {
  return render(<I18nProvider initialLocale="en">{node}</I18nProvider>);
}

describe("admin input stability", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    dataMocks.getPrayerTimes.mockResolvedValue([]);
    dataMocks.getDonationCampaigns.mockResolvedValue([]);
    dataMocks.getDonations.mockResolvedValue([]);
    dataMocks.getDonationSettings.mockResolvedValue({
      accountHolder: "Mosque",
      iban: "DE00",
      bic: "TEST",
      paypalLink: "",
      defaultPurpose: "Donation",
      defaultPurposeAr: "تبرع",
      defaultPurposeEn: "Donation",
      defaultPurposeDe: "Spende",
      defaultPurposeTr: "Bağış",
    });
    dataMocks.getDonationReport.mockResolvedValue({
      month: "2026-06",
      monthlyNeed: 3000,
      donationsReceived: 1250,
      remaining: 1750,
    });
  });

  afterEach(cleanup);

  it("does not reload prayer times while time and text inputs change", async () => {
    const user = userEvent.setup();
    const { container } = renderInEnglish(<AdminPrayerTimesPage />);
    await waitFor(() => expect(dataMocks.getPrayerTimes).toHaveBeenCalledTimes(1));

    const timeInput = container.querySelector<HTMLInputElement>('input[type="time"]');
    const noteInput = container.querySelector<HTMLInputElement>('input[type="text"]');
    expect(timeInput).not.toBeNull();
    expect(noteInput).not.toBeNull();

    fireEvent.change(timeInput!, { target: { value: "03:45" } });
    await user.type(noteInput!, "continuous prayer form typing ".repeat(8));

    expect(timeInput).toHaveValue("03:45");
    expect(dataMocks.getPrayerTimes).toHaveBeenCalledTimes(1);
  });

  it("does not reload donation data while every number field changes", async () => {
    const user = userEvent.setup();
    const { container } = renderInEnglish(<AdminDonationsPage />);
    await waitFor(() => {
      expect(dataMocks.getDonationSettings).toHaveBeenCalledTimes(1);
      expect(dataMocks.getDonationCampaigns).toHaveBeenCalledTimes(1);
      expect(dataMocks.getDonations).toHaveBeenCalledTimes(1);
      expect(dataMocks.getDonationReport).toHaveBeenCalledTimes(1);
    });

    const numberInputs = Array.from(container.querySelectorAll<HTMLInputElement>('input[type="number"]'));
    expect(numberInputs).toHaveLength(4);
    for (const input of numberInputs) {
      await user.clear(input);
      await user.type(input, "250050");
    }

    expect(numberInputs.every((input) => input.value === "250050")).toBe(true);
    expect(dataMocks.getDonationSettings).toHaveBeenCalledTimes(1);
    expect(dataMocks.getDonationCampaigns).toHaveBeenCalledTimes(1);
    expect(dataMocks.getDonations).toHaveBeenCalledTimes(1);
    expect(dataMocks.getDonationReport).toHaveBeenCalledTimes(1);
  });
});
