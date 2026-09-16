import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function source(file: string) {
  return readFileSync(path.join(process.cwd(), file), "utf8");
}

describe("Masjid Display content Admin", () => {
  it("exposes announcement display style and optional bounded schedule", () => {
    const page = source("app/admin/announcements/page.tsx");
    const actions = source("app/admin/announcements/actions.ts");
    expect(page).toContain("displayStyle");
    expect(page).toContain("displayFrom");
    expect(page).toContain("displayUntil");
    expect(page).toContain('value="normal"');
    expect(page).toContain('value="special"');
    expect(actions).toContain('throw new Error("Invalid display window")');
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
    expect(actions).toContain('validateDisplayPublishableContent("event"');
  });

  it("allows campaign end date to be blank and exposes an HTTP(S) donation URL without QR upload", () => {
    const page = source("app/admin/donations/page.tsx");
    const actions = source("app/admin/donations/actions.ts");
    expect(page).toContain("donationUrl");
    expect(page).toContain('key: "endDate"');
    expect(page).toContain("optional: true");
    expect(actions).toContain("parseOptionalHttpUrl");
    expect(actions).toContain('url.protocol !== "http:" && url.protocol !== "https:"');
    expect(page).not.toMatch(/qr[^\n]*(upload|file)|type=["']file["']/i);
  });
});