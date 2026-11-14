import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useState } from "react";
import { LocalizedContentFields } from "./LocalizedContentFields";

vi.mock("@/lib/i18n/use-translation", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

function CampaignLocalizedFields({ active }: { active: boolean }) {
  const [form, setForm] = useState<Record<string, string>>({
    titleAr: "تبرع",
    titleDe: "Spende",
    descriptionAr: "وصف",
    descriptionDe: "Beschreibung",
  });

  return (
    <LocalizedContentFields
      fields={[
        { base: "title", labelKey: "admin.title", requiredArabic: true, requiredGerman: active },
        { base: "description", labelKey: "admin.description", textarea: true, requiredArabic: true, requiredGerman: active },
      ]}
      form={form}
      setForm={setForm}
    />
  );
}

afterEach(cleanup);

describe("active campaign multilingual fields", () => {
  it("requires German title and description on an active campaign", () => {
    render(<CampaignLocalizedFields active />);
    const german = screen.getByRole("heading", { name: "settings.german" }).closest("section");
    expect(german).not.toBeNull();
    const fields = within(german!).getAllByRole("textbox");
    expect(fields).toHaveLength(2);
    expect(fields[0]).toBeRequired();
    expect(fields[1]).toBeRequired();
  });

  it("allows German fields to remain optional on an inactive campaign", () => {
    render(<CampaignLocalizedFields active={false} />);
    const german = screen.getByRole("heading", { name: "settings.german" }).closest("section");
    expect(german).not.toBeNull();
    for (const field of within(german!).getAllByRole("textbox")) {
      expect(field).not.toBeRequired();
    }
  });
});
