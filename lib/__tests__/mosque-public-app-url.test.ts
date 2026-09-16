import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { validatePublicAppUrl } from "@/lib/masjid-display/public-app-url";

describe("Prayerapp public URL", () => {
  it("requires HTTPS in production", () => {
    expect(validatePublicAppUrl("https://prayer.example/app", "production")).toBe("https://prayer.example/app");
    expect(() => validatePublicAppUrl("http://prayer.example/app", "production")).toThrow("Prayerapp public URL must use HTTPS");
  });

  it("permits local HTTP only outside production", () => {
    expect(validatePublicAppUrl("http://localhost:3000", "test")).toBe("http://localhost:3000/");
    expect(validatePublicAppUrl("http://127.0.0.1:3000/display", "development")).toBe("http://127.0.0.1:3000/display");
    expect(() => validatePublicAppUrl("http://localhost:3000", "production")).toThrow("Prayerapp public URL must use HTTPS");
  });

  it("invalidates cached mosque settings after an admin settings write", () => {
    const dataSource = readFileSync("lib/data/mosque-settings.ts", "utf8");
    const actionSource = readFileSync("app/admin/settings/actions.ts", "utf8");
    expect(dataSource).toContain("export function invalidateMosqueSettingsCache");
    expect(actionSource).toContain("invalidateMosqueSettingsCache();");
  });
});