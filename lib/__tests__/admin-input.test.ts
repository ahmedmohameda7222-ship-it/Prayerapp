import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  parseAdminDate,
  parseAdminHttpsUrl,
  parseAdminLocale,
  parseAdminNumber,
  parseAdminText,
  parseAdminTime,
  parseAdminUuid,
} from "@/lib/security/admin-input";

const source = (path: string) => readFileSync(join(process.cwd(), path), "utf8").replace(/\r\n/g, "\n");
const ADMIN_ACTION_FILES = [
  "app/admin/announcements/actions.ts",
  "app/admin/donations/actions.ts",
  "app/admin/events/actions.ts",
  "app/admin/jumuah/actions.ts",
  "app/admin/jumuah/khutbah-actions.ts",
  "app/admin/prayer-times/actions.ts",
  "app/admin/ramadan/actions.ts",
  "app/admin/settings/actions.ts",
] as const;

describe("admin server-side input bounds", () => {
  it("accepts exact text boundaries and rejects oversized text", () => {
    expect(parseAdminText("x".repeat(200), { field: "title", max: 200 })).toBe("x".repeat(200));
    expect(() => parseAdminText("x".repeat(201), { field: "title", max: 200 })).toThrow("admin.errors.invalidInput");
    expect(() => parseAdminText("", { field: "title", max: 200, required: true })).toThrow("admin.errors.invalidInput");
    expect(parseAdminText("", { field: "optional", max: 200 })).toBe("");
  });

  it("strictly validates UUID, locale, date, time, URL, and finite numeric ranges", () => {
    expect(parseAdminUuid("00000000-0000-4000-8000-000000000001", "id")).toBe("00000000-0000-4000-8000-000000000001");
    expect(() => parseAdminUuid("1 OR 1=1", "id")).toThrow("admin.errors.invalidInput");
    expect(parseAdminLocale("de", "locale")).toBe("de");
    expect(() => parseAdminLocale("../../etc/passwd", "locale")).toThrow("admin.errors.invalidInput");
    expect(parseAdminDate("2026-09-04", "date")).toBe("2026-09-04");
    expect(() => parseAdminDate("2026-02-31", "date")).toThrow("admin.errors.invalidInput");
    expect(parseAdminTime("23:59", "time")).toBe("23:59");
    expect(() => parseAdminTime("24:00", "time")).toThrow("admin.errors.invalidInput");
    expect(parseAdminHttpsUrl("https://example.com/a", { field: "url", max: 500 })).toBe("https://example.com/a");
    expect(() => parseAdminHttpsUrl("javascript:alert(1)", { field: "url", max: 500 })).toThrow("admin.errors.invalidInput");
    expect(parseAdminNumber("100", { field: "amount", min: 0, max: 1_000_000 })).toBe(100);
    expect(() => parseAdminNumber("Infinity", { field: "amount", min: 0, max: 1_000_000 })).toThrow("admin.errors.invalidInput");
    expect(() => parseAdminNumber("1000001", { field: "amount", min: 0, max: 1_000_000 })).toThrow("admin.errors.invalidInput");
  });

  it("requires every privileged mutation family to use shared server-side bounds", () => {
    for (const path of ADMIN_ACTION_FILES) {
      expect(source(path), `${path} must use shared server-side admin bounds`).toContain("@/lib/security/admin-input");
    }
  });
});
