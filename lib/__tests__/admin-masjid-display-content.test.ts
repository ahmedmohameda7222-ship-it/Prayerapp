import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function source(file: string) {
  return readFileSync(path.join(process.cwd(), file), "utf8");
}

describe("Masjid Display content Admin", () => {
  it("exposes announcement display style and optional bounded schedule", () => {
    const page = source("app/admin/announcements/page.tsx");
    const client = source("components/admin/AdminAnnouncementsPageClient.tsx");
    const actions = source("app/admin/announcements/actions.ts");
    expect(page).toContain("getRuntimePrayerTimezone");
    expect(client).toContain("displayStyle");
    expect(client).toContain("displayFrom");
    expect(client).toContain("displayUntil");
    expect(client).toContain('value="normal"');
    expect(client).toContain('value="special"');
    expect(actions).toContain('throw new Error("Invalid display window")');
  });

  it("parses timezone-less announcement windows as mosque-local instants", () => {
    const actions = source("app/admin/announcements/actions.ts");
    expect(actions).not.toContain("const instant = new Date(value)");
    expect(actions).toContain("parseDateTimeLocalInput");
    expect(actions).toContain("getRuntimePrayerTimezone");
  });

  it("formats stored announcement instants as mosque-local datetime-local values", () => {
    const client = source("components/admin/AdminAnnouncementsPageClient.tsx");
    expect(client).toContain("formatDateTimeLocalInput(item.displayFrom, timezone)");
    expect(client).toContain("formatDateTimeLocalInput(item.displayUntil, timezone)");
    expect(client).not.toContain("value.slice(0, 16)");
  });

  it("invalidates dynamic display-feed caches after admin mutations", () => {
    const announcementActions = source("app/admin/announcements/actions.ts");
    const eventActions = source("app/admin/events/actions.ts");
    const donationActions = source("app/admin/donations/actions.ts");
    const announcementData = source("lib/data/announcements.ts");
    const eventData = source("lib/data/events.ts");
    const donationData = source("lib/data/donations.ts");

    expect(announcementData).toContain("export function invalidateAnnouncementCaches");
    expect(eventData).toContain("export function invalidateEventCaches");
    expect(donationData).toContain("export function invalidateDonationCampaignCaches");

    expect((announcementActions.match(/invalidateAnnouncementCaches\(\)/g) || []).length).toBeGreaterThanOrEqual(5);
    expect((eventActions.match(/invalidateEventCaches\(\)/g) || []).length).toBeGreaterThanOrEqual(3);
    expect((donationActions.match(/invalidateDonationCampaignCaches\(\)/g) || []).length).toBeGreaterThanOrEqual(5);
  });

  it("keeps Event display content explicitly Arabic and German", () => {
    const page = source("app/admin/events/page.tsx");
    const actions = source("app/admin/events/actions.ts");
    expect(page).toContain('base: "title"');
    expect(page).toContain('base: "description"');
    expect(page).toContain('base: "location"');
    expect(actions).toContain("titleDe");
    expect(actions).toContain("descriptionDe");
    expect(actions).toContain("locationDe");
    expect(actions).toContain('validateDisplayAdminPublishableContent("event"');
  });

  it("revalidates publishable display size in all Admin mutation paths", () => {
    const announcementActions = source("app/admin/announcements/actions.ts");
    const eventActions = source("app/admin/events/actions.ts");
    const actions = source("app/admin/donations/actions.ts");
    expect(announcementActions).toContain("validateDisplayAdminPublishableContent");
    expect(eventActions).toContain("validateDisplayAdminPublishableContent");
    expect(actions).toContain("validateDisplayAdminPublishableContent");
    expect(actions).toContain(
      'select("title_ar,title_de,description_ar,description_de,donation_url,updated_at")',
    );
    expect(actions).toContain("donationUrl: row.donation_url || undefined");
  });

  it("allows campaign end date to be blank and requires an HTTPS donation URL without QR upload", () => {
    const page = source("app/admin/donations/page.tsx");
    const actions = source("app/admin/donations/actions.ts");
    expect(page).toContain("donationUrl");
    expect(page).toContain('key: "endDate"');
    expect(page).toContain("optional: true");
    expect(actions).toContain("parseAdminOptionalHttpsUrl");
    expect(actions).not.toContain("parseOptionalHttpUrl");
    expect(page).not.toMatch(/qr[^\n]*(upload|file)|type=["']file["']/i);
  });
});