import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

describe("Telegram removal and WhatsApp contact contract", () => {
  it("removes Telegram from Admin Settings while clearing legacy stored values on save", () => {
    const page = source("app/admin/settings/page.tsx");
    const actions = source("app/admin/settings/actions.ts");

    expect(page).not.toContain("telegramLink");
    expect(page).not.toContain("admin.telegramLink");
    expect(actions).not.toContain("data.telegramLink");
    expect(actions).toContain('telegram_link: ""');
  });

  it("never renders Telegram from legacy Mosque settings but preserves sanitized WhatsApp", () => {
    const mosque = source("app/mosque/page.tsx");

    expect(mosque).not.toContain("telegramHref");
    expect(mosque).not.toContain("settings?.telegramLink");
    expect(mosque).not.toContain('t("mosque.telegram")');
    expect(mosque).toContain('safeExternalUrl(settings?.whatsappLink, "whatsapp")');
    expect(mosque).toContain('t("mosque.whatsapp")');
    expect(mosque).toContain('target="_blank"');
    expect(mosque).toContain('rel="noreferrer"');
  });

  it("keeps the header WhatsApp destination sanitized and accessibly named", () => {
    const header = source("components/layout/AppHeader.tsx");

    expect(header).toContain('safeExternalUrl(whatsappLink, "whatsapp")');
    expect(header).toContain('aria-label={t("mosque.whatsapp")}');
    expect(header).toContain('target="_blank"');
    expect(header).toContain('rel="noreferrer"');
    expect(header).toContain("h-11 w-11");
  });
});
