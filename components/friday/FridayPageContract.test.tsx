import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("Friday root-page contract", () => {
  it("uses root application chrome without a back-to-home control or Home identity header", () => {
    const page = source("app/friday/page.tsx");
    const header = source("components/layout/RootPageHeader.tsx");

    expect(page).toContain('<AppShell surface="root">');
    expect(page).toContain('<RootPageHeader titleKey="nav.friday" />');
    expect(page).not.toContain("AppHeader");
    expect(page).not.toContain("HomeIdentityHeader");
    expect(header).not.toContain('href="/"');
    expect(header).not.toContain("ChevronLeft");
    expect(header).not.toContain("backHome");
  });

  it("keeps the atmospheric image compact and free of a duplicated Friday title", () => {
    const client = source("components/friday/FridayPageClient.tsx");
    const css = source("app/friday-page.css");

    expect(client).toContain('className="friday-identity"');
    expect(client).toContain("fridayImage");
    expect(client).not.toContain("friday-page-title");
    expect(client).not.toContain("friday-identity-content");
    expect(css).toContain("min-height: 176px");
    expect(css).toContain("min-height: 220px");
  });

  it("renders one semantic schedule list with prayer-first hierarchy and visible next-service text", () => {
    const client = source("components/friday/FridayPageClient.tsx");

    expect(client).toContain('<ol className="friday-service-list">');
    expect(client).toContain('className="friday-service-row"');
    expect(client).toContain('data-next={isNext ? "true" : "false"}');
    expect(client).toContain('className="friday-next-label"');
    expect(client).toContain('t("times.nextRange")');
    expect(client.indexOf('className="friday-time-primary"')).toBeLessThan(client.indexOf('className="friday-time-secondary"'));
    expect(client).toContain('t("prayer.prayer")');
    expect(client).toContain('t("prayer.khutbah")');
  });

  it("keeps shared location inside the schedule and distinguishes empty from error state", () => {
    const client = source("components/friday/FridayPageClient.tsx");
    const scheduleClose = client.indexOf("</section>");
    const sharedLocation = client.indexOf('data-testid="friday-shared-location"');

    expect(sharedLocation).toBeGreaterThan(-1);
    expect(sharedLocation).toBeLessThan(scheduleClose);
    expect(client).toContain('data-state="error" role="alert"');
    expect(client).toContain('data-state="empty" role="status"');
    expect(client).toContain('t("common.dataLoadFailed")');
    expect(client).toContain('t("friday.empty")');
  });

  it("uses localized Friday presentation and contains no generic Friday announcements section", () => {
    const client = source("components/friday/FridayPageClient.tsx");
    const presentation = source("lib/friday-presentation.ts");

    expect(client).toContain("getFridayPresentation");
    expect(presentation).toContain('getLocalizedField(item, "language", locale)');
    expect(presentation).toContain('getLocalizedField(item, "notes", locale)');
    expect(client).not.toContain("Friday Announcements");
    expect(client).not.toContain("friday.announcements");
    expect(client).not.toContain("JumuahCard");
  });
});
