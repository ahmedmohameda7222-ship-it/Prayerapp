import { describe, expect, it } from "vitest";
import {
  validateDisplayAdminPublishableContent,
  validateDisplayPublishableContent,
} from "./content-validation";

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

  it("rejects published announcement text whose UTF-8 projection would exceed the display source ceiling", () => {
    expect(validateDisplayAdminPublishableContent("announcement", {
      published: true,
      titleAr: "تنبيه",
      titleDe: "Hinweis",
      messageAr: "ا".repeat(5_000),
      messageDe: "x".repeat(5_000),
    })).toContain("Published display content exceeds maximum display size");
  });

  it("measures JSON-escaped announcement projection bytes before publishing", () => {
    expect(validateDisplayAdminPublishableContent("announcement", {
      published: true,
      titleAr: "تنبيه",
      titleDe: "Hinweis",
      messageAr: '"'.repeat(5_000),
      messageDe: '"'.repeat(4_000),
    })).toContain("Published display content exceeds maximum display size");
  });

  it("allows the same oversized announcement while it remains an unpublished draft", () => {
    expect(validateDisplayAdminPublishableContent("announcement", {
      published: false,
      titleAr: "تنبيه",
      titleDe: "Hinweis",
      messageAr: "ا".repeat(5_000),
      messageDe: "x".repeat(5_000),
    })).toEqual([]);
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

  it("rejects published event text whose UTF-8 projection would exceed the display source ceiling", () => {
    expect(validateDisplayAdminPublishableContent("event", {
      published: true,
      titleAr: "فعالية",
      titleDe: "Veranstaltung",
      descriptionAr: "ا".repeat(4_000),
      descriptionDe: "x".repeat(4_000),
      locationAr: "المسجد",
      locationDe: "Moschee",
    })).toContain("Published display content exceeds maximum display size");
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

  it("rejects active campaign text whose UTF-8 projection would exceed the display source ceiling", () => {
    expect(validateDisplayAdminPublishableContent("campaign", {
      isActive: true,
      titleAr: "تبرع",
      titleDe: "Spende",
      descriptionAr: "ا".repeat(5_000),
      descriptionDe: "x".repeat(5_000),
    })).toContain("Active display campaign exceeds maximum display size");
  });

  it("allows the same oversized campaign while it remains inactive", () => {
    expect(validateDisplayAdminPublishableContent("campaign", {
      isActive: false,
      titleAr: "تبرع",
      titleDe: "Spende",
      descriptionAr: "ا".repeat(5_000),
      descriptionDe: "x".repeat(5_000),
    })).toEqual([]);
  });
});
