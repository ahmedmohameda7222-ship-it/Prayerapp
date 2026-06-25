import "server-only";
import type { Locale } from "@/lib/i18n/types";

export type TranslationDraft = {
  locale: Locale;
  text: string;
  reviewNeeded: boolean;
};

export async function generateContentTranslations(
  sourceText: string,
  targetLocales: Locale[]
): Promise<{ configured: boolean; messageKey: string; drafts: TranslationDraft[] }> {
  if (!process.env.TRANSLATION_API_KEY) {
    return {
      configured: false,
      messageKey: "admin.translationNotConfigured",
      drafts: [],
    };
  }

  return {
    configured: false,
    messageKey: "admin.translationProviderNotConnected",
    drafts: targetLocales.map((locale) => ({
      locale,
      text: sourceText,
      reviewNeeded: true,
    })),
  };
}
