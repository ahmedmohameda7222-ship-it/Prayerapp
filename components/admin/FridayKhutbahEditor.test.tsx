import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("FridayKhutbahEditor contract", () => {
  it("offers the four approved optional languages for one selected Friday", () => {
    const path = "components/admin/FridayKhutbahEditor.tsx";
    expect(existsSync(join(process.cwd(), path))).toBe(true);
    if (!existsSync(join(process.cwd(), path))) return;

    const editor = source(path);
    expect(editor).toContain('code: "ar"');
    expect(editor).toContain('label: "العربية"');
    expect(editor).toContain('code: "en"');
    expect(editor).toContain('label: "English"');
    expect(editor).toContain('code: "de"');
    expect(editor).toContain('label: "Deutsch"');
    expect(editor).toContain('code: "tr"');
    expect(editor).toContain('label: "Türkçe"');
    expect(editor).toContain("selectedFriday");
  });

  it("uses optional plain-text title inputs and multiline textareas with no rich-text HTML path", () => {
    const path = "components/admin/FridayKhutbahEditor.tsx";
    expect(existsSync(join(process.cwd(), path))).toBe(true);
    if (!existsSync(join(process.cwd(), path))) return;

    const editor = source(path);
    expect(editor).toContain("<textarea");
    expect(editor).toContain('data-khutbah-field="title"');
    expect(editor).toContain('data-khutbah-field="content"');
    expect(editor).not.toContain("contentEditable");
    expect(editor).not.toContain("dangerouslySetInnerHTML");
    expect(editor).not.toMatch(/<textarea[^>]*required/);
    expect(editor).not.toMatch(/data-khutbah-field="title"[^>]*required/);
  });

  it("provides separate draft save, publish, and unpublish actions with clear publish validation", () => {
    const path = "components/admin/FridayKhutbahEditor.tsx";
    expect(existsSync(join(process.cwd(), path))).toBe(true);
    if (!existsSync(join(process.cwd(), path))) return;

    const editor = source(path);
    expect(editor).toContain("saveFridayKhutbahAction");
    expect(editor).toContain("unpublishFridayKhutbahAction");
    expect(editor).toContain("hasPublishableKhutbahContent");
    expect(editor).toContain("publishRequiresContent");
    expect(editor).toContain('data-testid="khutbah-save-draft"');
    expect(editor).toContain('data-testid="khutbah-publish"');
  });

  it("is integrated once for the selected Friday rather than per Jumuah service", () => {
    const page = source("app/admin/jumuah/page.tsx");
    expect(page).toContain("FridayKhutbahEditor");
    expect(page).toContain("selectedFriday={selectedFriday}");
    expect(page).not.toContain("selectedServiceKhutbah");
  });
});
