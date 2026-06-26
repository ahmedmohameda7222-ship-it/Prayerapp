"use client";

import type { Dispatch, SetStateAction } from "react";
import { localeFieldSuffix, type Locale } from "@/lib/i18n/types";
import { useTranslation } from "@/lib/i18n/use-translation";

type FieldConfig = {
  base: string;
  labelKey: string;
  textarea?: boolean;
  requiredArabic?: boolean;
};

const languages: Array<{ locale: Locale; labelKey: string }> = [
  { locale: "ar", labelKey: "settings.arabic" },
  { locale: "en", labelKey: "settings.english" },
  { locale: "de", labelKey: "settings.german" },
  { locale: "tr", labelKey: "settings.turkish" },
];

export function localizedFormKey(base: string, locale: Locale) {
  return `${base}${localeFieldSuffix(locale)}`;
}

export function LocalizedContentFields({
  fields,
  form,
  setForm,
  disabled,
}: {
  fields: FieldConfig[];
  form: Record<string, string>;
  setForm: Dispatch<SetStateAction<Record<string, string>>>;
  disabled?: boolean;
}) {
  const { t } = useTranslation();

  return (
    <div className="grid gap-4 md:col-span-2">
      <h3 className="text-sm font-extrabold uppercase text-[var(--color-gold-dark)]">{t("admin.multilingualContent")}</h3>
      {languages.map(({ locale, labelKey }) => (
        <section key={locale} className="grid gap-3 rounded-2xl bg-[var(--color-cream)] p-3">
          <h4 className="font-bold text-[var(--color-emerald)]">{t(labelKey)}</h4>
          <div className="grid gap-3 md:grid-cols-2">
            {fields.map((field) => {
              const key = localizedFormKey(field.base, locale);
              const required = locale === "ar" && field.requiredArabic;
              const inputClass = "min-h-11 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] px-3 text-[var(--color-charcoal)] outline-none focus:border-[var(--color-gold)] disabled:opacity-50";
              return (
                <label key={key} className={`grid gap-1 text-sm font-bold text-[var(--color-emerald)] ${field.textarea ? "md:col-span-2" : ""}`}>
                  {t(field.labelKey)} {required ? <span className="text-[var(--color-danger)]">{t("admin.required")}</span> : null}
                  {field.textarea ? (
                    <textarea
                      required={required}
                      rows={3}
                      value={form[key] || ""}
                      onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))}
                      disabled={disabled}
                      className={`${inputClass} py-2`}
                    />
                  ) : (
                    <input
                      type="text"
                      required={required}
                      value={form[key] || ""}
                      onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))}
                      disabled={disabled}
                      className={inputClass}
                    />
                  )}
                </label>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
