import { act, render, renderHook, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { I18nProvider, useLocale } from "@/lib/i18n/context";
import { useTranslation } from "@/lib/i18n/use-translation";

function CurrentLocale() {
  const { locale } = useLocale();
  return <span>{locale}</span>;
}

describe("I18nProvider", () => {
  beforeEach(() => window.localStorage.clear());

  it("keeps the translation callback stable until the locale changes", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <I18nProvider initialLocale="ar">{children}</I18nProvider>
    );
    const { result, rerender } = renderHook(
      () => ({ ...useTranslation(), setLocale: useLocale().setLocale }),
      { wrapper },
    );
    const initialTranslate = result.current.t;

    rerender();
    expect(result.current.t).toBe(initialTranslate);

    act(() => result.current.setLocale("en"));
    expect(result.current.t).not.toBe(initialTranslate);
    expect(result.current.locale).toBe("en");
  });

  it("uses the server-provided locale for the hydration render", () => {
    window.localStorage.setItem("locale", "tr");

    render(
      <I18nProvider initialLocale="en">
        <CurrentLocale />
      </I18nProvider>,
    );

    expect(screen.getByText("en")).toBeInTheDocument();
    expect(window.localStorage.getItem("locale")).toBe("en");
  });
});
