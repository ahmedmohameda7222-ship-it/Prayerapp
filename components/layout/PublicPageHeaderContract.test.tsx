import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("public page header contract", () => {
  it("gives generic public pages the Friday green header actions", () => {
    const pageHeader = source("components/layout/PageHeader.tsx");

    expect(pageHeader).toContain('className="root-page-header"');
    expect(pageHeader).toContain('className="root-page-header-inner"');
    expect(pageHeader).toContain("<LanguageMenu />");
    expect(pageHeader).toContain("<NotificationButton home />");
    expect(pageHeader).not.toContain("app-page-header-prominent");
  });

  it("keeps Friday and generic public pages on the same shared visual header contract", () => {
    const fridayHeader = source("components/layout/RootPageHeader.tsx");
    const pageHeader = source("components/layout/PageHeader.tsx");

    for (const className of ["root-page-header", "root-page-header-inner", "root-page-header-actions"]) {
      expect(fridayHeader).toContain(className);
      expect(pageHeader).toContain(className);
    }
  });

  it("preserves nested-page back navigation with the approved Tabler shape", () => {
    const pageHeader = source("components/layout/PageHeader.tsx");

    expect(pageHeader).toContain("backHref");
    expect(pageHeader).toContain('data-supericon="tabler:chevron-left"');
    expect(pageHeader).not.toContain('import { ChevronLeft } from "lucide-react"');
  });

  it("uses the approved Tabler Supericons for language and notifications", () => {
    const languageMenu = source("components/home/LanguageMenu.tsx");
    const notificationButton = source("components/notifications/NotificationButton.tsx");

    expect(languageMenu).toContain('data-supericon="tabler:language"');
    expect(languageMenu).not.toContain('import { Languages } from "lucide-react"');
    expect(notificationButton).toContain('data-supericon="tabler:bell"');
    expect(notificationButton).not.toContain('import { Bell, X } from "lucide-react"');
  });

  it("defines shared header tokens and a touch-sized back control outside Home", () => {
    const chrome = source("app/native-pwa.css");

    expect(chrome).toContain("--home-brand: var(--ui-brand)");
    expect(chrome).toContain("--home-brand-strong: var(--ui-brand-strong)");
    expect(chrome).toContain("--home-divider: var(--ui-divider)");
    expect(chrome).toContain(".root-page-header-control");
    expect(chrome).toContain("width: 44px");
    expect(chrome).toContain("height: 44px");
  });

  it("uses the shared green header on account authentication screens", () => {
    const authForm = source("components/account/AuthForm.tsx");

    expect(authForm).toContain('import { PageHeader } from "@/components/layout/PageHeader"');
    expect(authForm).toContain('<PageHeader title={title} backHref="/account" />');
    expect(authForm).not.toContain('import { ChevronLeft } from "lucide-react"');
  });

  it("leaves Home on its dedicated AppHeader design", () => {
    const homePage = source("app/page.tsx");

    expect(homePage).toContain('import { AppHeader } from "@/components/layout/AppHeader"');
    expect(homePage).toContain("<AppHeader");
    expect(homePage).not.toContain("<RootPageHeader");
    expect(homePage).not.toContain("<PageHeader");
  });
});
