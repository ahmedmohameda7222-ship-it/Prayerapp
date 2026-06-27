import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { I18nProvider } from "@/lib/i18n/context";
import { LanguageMenu } from "./LanguageMenu";

describe("LanguageMenu", () => {
  beforeEach(() => localStorage.clear());

  it("changes the app language directly from the home header", async () => {
    const user = userEvent.setup();
    render(
      <I18nProvider initialLocale="ar">
        <LanguageMenu />
      </I18nProvider>,
    );

    await user.click(screen.getByLabelText("اللغة"));
    await user.click(screen.getByRole("button", { name: /English/ }));

    expect(screen.getByLabelText("Language")).toHaveTextContent("EN");
    expect(document.documentElement.lang).toBe("en");
    expect(localStorage.getItem("locale")).toBe("en");
  });
});
