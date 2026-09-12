import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("More page grouped premium UI contract", () => {
  it("renders three semantic groups instead of one segmented list", () => {
    const page = source("app/more/page.tsx");

    expect(page).toContain('id: "worship"');
    expect(page).toContain('id: "community"');
    expect(page).toContain('id: "accountApp"');
    expect(page).toContain("styles.screen");
    expect(page).toContain("styles.sections");
    expect(page).toContain("styles.sectionTitle");
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

  it("keeps More-specific visual polish isolated from shared public lists", () => {
    const page = source("app/more/page.tsx");
    const css = source("app/more/more.module.css");

    expect(page).toContain('import styles from "./more.module.css"');
    expect(css).toContain(".screen");
    expect(css).toContain(".sections");
    expect(css).toContain(".sectionTitle");
    expect(css).toContain(".list");
    expect(css).toContain(".row");
    expect(css).toContain(".icon");
    expect(css).toContain("min-height: 60px");
    expect(css).toContain("var(--app-brand)");
  });

  it("localizes the three section headings for every supported locale", () => {
    const labels = source("app/more/section-labels.ts");

    for (const locale of ["ar", "en", "de", "tr"]) {
      expect(labels).toContain(`${locale}: {`);
    }

    expect(labels).toContain('worship: "العبادة"');
    expect(labels).toContain('community: "المجتمع"');
    expect(labels).toContain('accountApp: "الحساب والتطبيق"');
    expect(labels).toContain('worship: "Worship"');
    expect(labels).toContain('community: "Community"');
    expect(labels).toContain('accountApp: "Account & App"');
  });
});
