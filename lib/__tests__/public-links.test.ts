import { describe, expect, it } from "vitest";
import { safeEmailHref, safeExternalUrl, safeTelephoneHref } from "@/lib/public-links";

describe("public external links", () => {
  it.each([
    ["maps", "https://maps.google.com/?q=Deggendorf"],
    ["maps", "https://www.google.com/maps/place/Deggendorf"],
    ["maps", "https://maps.app.goo.gl/verified"],
    ["whatsapp", "https://wa.me/49123456789"],
    ["whatsapp", "https://api.whatsapp.com/send?phone=49123456789"],
    ["telegram", "https://t.me/verifiedmosque"],
    ["paypal", "https://paypal.me/verifiedmosque"],
    ["paypal", "https://www.paypal.com/donate/?hosted_button_id=verified"],
  ] as const)("accepts an approved %s destination", (kind, value) => {
    expect(safeExternalUrl(value, kind)).toBe(value);
  });

  it.each([
    ["whatsapp", "http://wa.me/49123456789"],
    ["whatsapp", "javascript:alert(1)"],
    ["whatsapp", "https://wa.me.evil.test/49123456789"],
    ["maps", "https://evil.test/?next=maps.google.com"],
    ["telegram", "https://user:pass@t.me/verifiedmosque"],
    ["paypal", "https://paypal.me:8443/verifiedmosque"],
  ] as const)("rejects an unsafe %s destination", (kind, value) => {
    expect(safeExternalUrl(value, kind)).toBeUndefined();
  });

  it("validates email and telephone links before rendering them", () => {
    expect(safeEmailHref("office@verified-mosque.de")).toBe("mailto:office@verified-mosque.de");
    expect(safeEmailHref("office@example.test\nsubject:injected")).toBeUndefined();
    expect(safeTelephoneHref("+49 (991) 123-45")).toBe("tel:+49 (991) 123-45");
    expect(safeTelephoneHref("javascript:alert(1)")).toBeUndefined();
  });
});
