import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const appHeaderSource = readFileSync(
  join(process.cwd(), "components/layout/AppHeader.tsx"),
  "utf8",
);

const supericonsBootstrapWhatsappPath =
  "M13.601 2.326A7.85 7.85 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926";
const legacyWhatsappPath =
  "M20.2 11.7a8.2 8.2 0 0 1-12.1 7.2L4 20l1.1-4A8.2 8.2 0 1 1 20.2 11.7Z";

describe("AppHeader WhatsApp brand icon", () => {
  it("uses the verified Bootstrap WhatsApp SVG from Supericons", () => {
    expect(appHeaderSource).toContain('viewBox="0 0 16 16"');
    expect(appHeaderSource).toContain('fill="currentColor"');
    expect(appHeaderSource).toContain(supericonsBootstrapWhatsappPath);
  });

  it("does not keep the previous hand-drawn WhatsApp SVG", () => {
    expect(appHeaderSource).not.toContain(legacyWhatsappPath);
  });
});
