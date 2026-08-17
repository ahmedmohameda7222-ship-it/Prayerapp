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

  it("keeps the popup inside the mobile viewport edge and closes on an outside tap", async () => {
    const user = userEvent.setup();
    render(
      <I18nProvider initialLocale="ar">
        <LanguageMenu />
        <button type="button">Outside</button>
      </I18nProvider>,
    );

    const trigger = screen.getByLabelText("اللغة");
    const details = trigger.closest("details");
    await user.click(trigger);

    expect(details).toHaveAttribute("open");
    expect(screen.getByRole("button", { name: /English/ }).parentElement).toHaveClass("end-0");

    await user.click(screen.getByRole("button", { name: "Outside" }));
    expect(details).not.toHaveAttribute("open");
  });
});
