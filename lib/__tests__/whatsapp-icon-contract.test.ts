import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(join(process.cwd(), path), "utf8");
const iconPath = join(process.cwd(), "components/icons/WhatsAppIcon.tsx");
const simpleIconsWhatsappPath =
  "M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15";

describe("shared WhatsApp brand icon", () => {
  it("uses the approved Simple Icons WhatsApp SVG from Supericons", () => {
    expect(existsSync(iconPath)).toBe(true);
    if (!existsSync(iconPath)) return;

    const icon = readFileSync(iconPath, "utf8");
    expect(icon).toContain('viewBox="0 0 24 24"');
    expect(icon).toContain('fill="currentColor"');
    expect(icon).toContain(simpleIconsWhatsappPath);
  });

  it("is shared by the header and Mosque page instead of duplicate or placeholder marks", () => {
    const header = source("components/layout/AppHeader.tsx");
    const mosque = source("app/mosque/page.tsx");

    expect(header).toContain('import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon"');
    expect(mosque).toContain('import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon"');
    expect(header).not.toContain("function WhatsAppIcon(");
    expect(mosque).not.toContain(">W<");
  });
});
