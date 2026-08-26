import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("AppHeader association identity contract", () => {
  it("keeps every localized mosque name while defining the exact registered association name", () => {
    const brand = source("lib/app-brand.ts");

    expect(brand).toContain('ar: "مسجد الدوناو"');
    expect(brand).toContain('en: "Danube Mosque"');
    expect(brand).toContain('de: "Donau-Moschee"');
    expect(brand).toContain('tr: "Tuna Camii"');
    expect(brand).toContain('export const ASSOCIATION_NAME = "Deggendorfer Integrations und Bildungsverein e.V";');
  });

  it("renders the legal association directly below the mosque identity and keeps Deggendorf tertiary", () => {
    const header = source("components/layout/AppHeader.tsx");
    const associationPosition = header.indexOf("{ASSOCIATION_NAME}");
    const locationPosition = header.indexOf(">Deggendorf</p>");

    expect(header).toContain('import { APP_NAMES, ASSOCIATION_NAME } from "@/lib/app-brand";');
    expect(header).toContain('className="home-app-header-association-name');
    expect(associationPosition).toBeGreaterThan(-1);
    expect(locationPosition).toBeGreaterThan(associationPosition);
  });
});
