import { describe, expect, it } from "vitest";
import { validateDisplayPublishableContent } from "./content-validation";

describe("display publishability validation", () => {
  it("rejects a published announcement missing German message", () => {
    expect(validateDisplayPublishableContent("announcement", {
      published: true,
      titleAr: "تنبيه",
      messageAr: "نص",
      titleDe: "Hinweis",
      messageDe: "",
    })).toContain("German message is required for published display content");
  });

  it("allows incomplete unpublished announcement drafts", () => {
    expect(validateDisplayPublishableContent("announcement", { published: false })).toEqual([]);
  });

  it("requires Arabic and German title, description, and location for published events", () => {
    expect(validateDisplayPublishableContent("event", {
      published: true,
      titleAr: "فعالية",
      descriptionAr: "وصف",
      locationAr: "المسجد",
      titleDe: "Veranstaltung",
      descriptionDe: "",
      locationDe: "Moschee",
    })).toContain("German description is required for published display content");
  });

  it("requires Arabic and German title and description only for active campaigns", () => {
    expect(validateDisplayPublishableContent("campaign", {
      isActive: true,
      titleAr: "تبرع",
      descriptionAr: "وصف",
      titleDe: "Spende",
      descriptionDe: "",
    })).toContain("German description is required for active display campaign");
    expect(validateDisplayPublishableContent("campaign", { isActive: false })).toEqual([]);
  });
});
