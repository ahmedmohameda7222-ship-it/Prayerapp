import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

describe("Home donation transparency contract", () => {
  it("loads the donation report through Home failure isolation and passes it to the client", () => {
    const page = source("app/page.tsx");

    expect(page).toContain("getDonationReport");
    expect(page).toContain("Promise.allSettled([");
    expect(page).toContain("getDonationReport(),");
    expect(page).toContain('donationReportResult.status === "fulfilled" ? donationReportResult.value : undefined');
    expect(page).toContain("donationReport={donationReport}");
  });

  it("renders campaigns, Bank Transfer, Transparency, then PayPal in that DOM order", () => {
    const client = source("components/home/HomePageClient.tsx");

    expect(client).toContain("donationReport?: DonationReport");
    const campaign = client.indexOf("<DonationCampaignCard");
    const bank = client.indexOf("<BankTransferCard");
    const transparency = client.indexOf("<TransparencyCard");
    const paypal = client.indexOf("<PayPalCard");

    expect(campaign).toBeGreaterThan(-1);
    expect(bank).toBeGreaterThan(campaign);
    expect(transparency).toBeGreaterThan(bank);
    expect(paypal).toBeGreaterThan(transparency);
  });
});
