import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { parseAdminBoolean } from "@/lib/security/admin-input";

const root = process.cwd();

const booleanActions = [
  {
    file: "app/admin/announcements/actions.ts",
    functions: [
      { name: "togglePublishAnnouncementAction", parameter: "published" },
      { name: "toggleUrgentAnnouncementAction", parameter: "isUrgent" },
    ],
  },
  {
    file: "app/admin/donations/actions.ts",
    functions: [
      { name: "toggleActiveCampaignAction", parameter: "isActive" },
      { name: "toggleFeaturedCampaignAction", parameter: "isFeatured" },
    ],
  },
  {
    file: "app/admin/jumuah/actions.ts",
    functions: [{ name: "togglePublishJumuahAction", parameter: "published" }],
  },
  {
    file: "app/admin/prayer-times/actions.ts",
    functions: [{ name: "togglePublishPrayerTimeAction", parameter: "published" }],
  },
  {
    file: "app/admin/jumuah/khutbah-actions.ts",
    functions: [{ name: "saveFridayKhutbahAction", parameter: "publish" }],
  },
] as const;

describe("admin boolean runtime parser", () => {
  it.each([
    [true, true],
    [false, false],
    ["true", true],
    ["false", false],
  ])("accepts supported representation %j", (value, expected) => {
    expect(parseAdminBoolean(value, "flag")).toBe(expected);
  });

  it.each([
    "yes",
    "no",
    "1",
    "0",
    1,
    0,
    null,
    [],
    {},
  ])("rejects unsupported representation %j", (value) => {
    expect(() => parseAdminBoolean(value, "flag")).toThrow();
  });
});

describe("exported admin boolean Server Action boundaries", () => {
  for (const entry of booleanActions) {
    const source = fs.readFileSync(path.join(root, entry.file), "utf8");

    for (const fn of entry.functions) {
      it(`${entry.file}:${fn.name} validates ${fn.parameter} before use`, () => {
        const signature = new RegExp(`export\\s+async\\s+function\\s+${fn.name}\\([^)]*${fn.parameter}\\s*:\\s*unknown`, "u");
        expect(source).toMatch(signature);
        expect(source).toContain(`parseAdminBoolean(${fn.parameter},`);
        expect(source).not.toContain(`Boolean(${fn.parameter})`);
      });
    }
  }
});
