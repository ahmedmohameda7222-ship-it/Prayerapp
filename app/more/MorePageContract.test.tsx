import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("More page grouped premium UI contract", () => {
  it("renders three semantic groups instead of one segmented list", () => {
    const page = source("app/more/page.tsx");

    expect(page).toContain('titleKey: "more.sections.worship"');
    expect(page).toContain('titleKey: "more.sections.community"');
    expect(page).toContain('titleKey: "more.sections.accountApp"');
    expect(page).toContain('className="more-screen"');
    expect(page).toContain('className="more-sections"');
    expect(page).toContain('className="more-section-title"');
    expect(page).not.toContain("groupStart");
    expect(page).not.toContain("data-group-start");
  });

  it("keeps the approved row order and refined icon semantics", () => {
    const page = source("app/more/page.tsx");

    const expectedRoutes = [
      "/azkar",
      "/ramadan",
      "/qibla",
      "/events",
      "/donations",
      "/mosque",
      "/account",
      "/settings",
      "/privacy",
    ];

    let previousIndex = -1;
    for (const route of expectedRoutes) {
      const index = page.indexOf(`\"${route}\"`);
      expect(index).toBeGreaterThan(previousIndex);
      previousIndex = index;
    }

    expect(page).toContain("BookOpen");
    expect(page).toContain("Moon");
    expect(page).toContain("Compass");
    expect(page).toContain("CalendarDays");
    expect(page).toContain("HandHeart");
    expect(page).toContain("MosqueIcon");
    expect(page).toContain("UserRound");
    expect(page).toContain("Settings");
    expect(page).toContain("ShieldCheck");
    expect(page).not.toContain("MoonStar");
    expect(page).not.toContain("Landmark");
  });

  it("scopes the premium grouped-list treatment to More", () => {
    const css = source("app/public-ui-refresh.css");

    expect(css).toContain(".more-sections");
    expect(css).toContain(".more-section-title");
    expect(css).toContain(".more-screen .native-list-group");
    expect(css).toContain(".more-screen .native-list-row");
    expect(css).toContain(".more-screen .native-list-row-icon");
  });

  it("localizes the three section headings in every public locale", () => {
    const localeFiles = ["messages/ar.json", "messages/en.json", "messages/de.json", "messages/tr.json"];

    for (const path of localeFiles) {
      const messages = source(path);
      expect(messages).toContain('"more"');
      expect(messages).toContain('"sections"');
      expect(messages).toContain('"worship"');
      expect(messages).toContain('"community"');
      expect(messages).toContain('"accountApp"');
    }
  });
});
