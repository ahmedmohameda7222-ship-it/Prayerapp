import { cleanup, render } from "@testing-library/react";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { createElement } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { AnnouncementSlide } from "../components/content/AnnouncementSlide";
import type { DisplayAnnouncementDto } from "./feed-types";

const cwd = process.cwd();
const TV_ROOT = basename(cwd) === "masjid-display" ? cwd : resolve(cwd, "masjid-display");

function filesUnder(relative: string): string[] {
  const directory = join(TV_ROOT, relative);
  return readdirSync(directory).flatMap((name) => {
    const full = join(directory, name);
    const stat = statSync(full);
    if (stat.isDirectory()) return filesUnder(join(relative, name));
    if (!/\.(?:ts|tsx|js|jsx)$/.test(name) || /\.(?:test|spec)\./.test(name)) return [];
    return [full];
  });
}

function runtimeSource() {
  return ["app", "components", "lib"]
    .flatMap(filesUnder)
    .map((file) => readFileSync(file, "utf8"))
    .join("\n");
}

describe("Masjid Display TV security boundary", () => {
  afterEach(() => cleanup());

  it("has no Supabase browser runtime, audio runtime, or prayer calculation dependency", () => {
    const packageJson = readFileSync(join(TV_ROOT, "package.json"), "utf8");
    const source = runtimeSource();

    expect(packageJson).not.toContain("@supabase/supabase-js");
    expect(packageJson).not.toMatch(/["']adhan["']/);
    expect(source).not.toContain("@supabase/supabase-js");
    expect(source).not.toMatch(/\bnew\s+Audio\s*\(/);
    expect(source).not.toMatch(/<audio\b/i);
    expect(source).not.toMatch(/from\s+["']adhan["']/);
  });

  it("uses a fixed server-only upstream origin and a closed path allowlist", () => {
    const upstream = readFileSync(join(TV_ROOT, "lib/upstream.ts"), "utf8");
    expect(upstream).toContain("process.env.PRAYERAPP_ORIGIN");
    expect(upstream).not.toContain("NEXT_PUBLIC_PRAYERAPP_ORIGIN");
    expect(upstream).toContain('"/api/public/masjid-display"');
    expect(upstream).toContain('"/api/public/masjid-display-test-control"');
    expect(upstream).toContain("ALLOWED_PATHS.has(path)");
    expect(upstream).not.toMatch(/request\.url|searchParams|get\(["']origin["']\)/i);
  });

  it("keeps both TV proxy endpoints GET-only with generic failure responses", () => {
    for (const route of [
      "app/api/display-feed/route.ts",
      "app/api/test-control/route.ts",
    ]) {
      const source = readFileSync(join(TV_ROOT, route), "utf8");
      expect(source).toMatch(/export async function GET\(/);
      for (const method of ["POST", "PUT", "PATCH", "DELETE"]) {
        expect(source).not.toMatch(
          new RegExp(`export\\s+(?:async\\s+)?function\\s+${method}\\b`),
        );
      }
      expect(source).not.toMatch(/stack|sql|postgres/i);
    }
  });

  it("keeps LKG behind the strict Feed validator and never partially salvages invalid data", () => {
    const lkg = readFileSync(join(TV_ROOT, "lib/lkg.ts"), "utf8");
    const validator = readFileSync(join(TV_ROOT, "lib/validate-feed.ts"), "utf8");
    expect(lkg).toContain("validateFeedV1");
    expect(validator).toContain("exactKeys");
    expect(validator).toContain("only schema version 1 is supported");
  });

  it("keeps diagnostics non-sensitive and without write controls", () => {
    const diagnostics = readFileSync(join(TV_ROOT, "components/DiagnosticsPanel.tsx"), "utf8");
    expect(diagnostics).not.toMatch(/PRAYERAPP_ORIGIN|SUPABASE|SERVICE_ROLE|SECRET_KEY|TOKEN/i);
    expect(diagnostics).not.toMatch(/<button\b|<form\b|fetch\(|\.from\(/i);
  });

  it("treats QR destinations as component values and never as executable HTML", () => {
    const persistent = readFileSync(join(TV_ROOT, "components/PersistentAppQr.tsx"), "utf8");
    const campaign = readFileSync(join(TV_ROOT, "components/content/CampaignSlide.tsx"), "utf8");
    const source = runtimeSource();
    expect(persistent).toContain("value={publicAppUrl}");
    expect(campaign).toContain("value={item.donationUrl}");
    expect(source).not.toContain("dangerouslySetInnerHTML");
  });

  it("escapes hostile synthetic/dynamic text instead of creating executable elements", () => {
    const hostile = '<script data-plan5="attack">globalThis.__owned = true</script>';
    const item: DisplayAnnouncementDto = {
      id: "hostile-test",
      titleAr: hostile,
      titleDe: hostile,
      messageAr: hostile,
      messageDe: hostile,
      isUrgent: false,
      displayStyle: "normal",
      displayFrom: null,
      displayUntil: null,
    };
    const view = render(
      createElement(AnnouncementSlide, {
        item,
        now: new Date("2026-09-15T18:00:00.000Z"),
      }),
    );
    expect(view.container.querySelector("script")).toBeNull();
    expect(view.container.textContent).toContain("<script");
  });
});
