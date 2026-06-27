import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { I18nProvider, useLocale } from "@/lib/i18n/context";
import { useTranslation } from "@/lib/i18n/use-translation";

describe("I18nProvider", () => {
  beforeEach(() => localStorage.clear());

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
});
