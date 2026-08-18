import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";
import { APP_NAMES, DEFAULT_APP_NAME, getBrandTranslationOverride } from "@/lib/app-brand";

const ROOTS = ["app", "components", "lib", "public"];
const TEXT_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".json", ".webmanifest"]);
const LEGACY_PUBLIC_NAMES = [
  "Masjid El-Rahman",
  "مسجد الرحمن",
  "El-Rahman-Moschee",
  "El-Rahman Camii",
];

function extension(path: string) {
  const dot = path.lastIndexOf(".");
  return dot >= 0 ? path.slice(dot) : "";
}

function collectTextFiles(path: string, out: string[] = []) {
  for (const entry of readdirSync(path)) {
    const fullPath = join(path, entry);
    const stats = statSync(fullPath);
    if (stats.isDirectory()) {
      collectTextFiles(fullPath, out);
    } else if (TEXT_EXTENSIONS.has(extension(fullPath))) {
      out.push(fullPath);
    }
  }
  return out;
}

describe("Danube Mosque app brand", () => {
  it("uses the approved localized names", () => {
    expect(APP_NAMES).toEqual({
      ar: "مسجد الدوناو",
      en: "Danube Mosque",
      de: "Donau-Moschee",
      tr: "Tuna Camii",
    });
    expect(DEFAULT_APP_NAME).toBe("مسجد الدوناو");
  });

  it("uses the new brand in install and accessibility copy", () => {
    expect(getBrandTranslationOverride("ar", "settings.installAppDescription")).toContain("مسجد الدوناو");
    expect(getBrandTranslationOverride("en", "settings.installAppDescription")).toContain("Danube Mosque");
    expect(getBrandTranslationOverride("de", "settings.installAppDescription")).toContain("Donau-Moschee");
    expect(getBrandTranslationOverride("tr", "settings.installAppDescription")).toContain("Tuna Camii");
    expect(getBrandTranslationOverride("ar", "common.appIconAlt")).toContain("مسجد الدوناو");
  });

  it("publishes the Arabic canonical PWA install name", () => {
    const manifest = JSON.parse(readFileSync(join(process.cwd(), "public/manifest.webmanifest"), "utf8")) as {
      name?: string;
      short_name?: string;
      lang?: string;
      dir?: string;
    };

    expect(manifest.name).toBe("مسجد الدوناو");
    expect(manifest.short_name).toBe("مسجد الدوناو");
    expect(manifest.lang).toBe("ar");
    expect(manifest.dir).toBe("rtl");
  });

  it("contains no legacy public app name in runtime source", () => {
    const offenders: string[] = [];
    for (const root of ROOTS) {
      const absoluteRoot = join(process.cwd(), root);
      for (const file of collectTextFiles(absoluteRoot)) {
        if (file.endsWith("app-brand-name.test.ts")) continue;
        const content = readFileSync(file, "utf8");
        if (LEGACY_PUBLIC_NAMES.some((name) => content.includes(name))) {
          offenders.push(relative(process.cwd(), file));
        }
      }
    }

    expect(offenders).toEqual([]);
  });
});
