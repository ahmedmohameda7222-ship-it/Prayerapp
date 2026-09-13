import type { Locale } from "@/lib/i18n/types";

export type MoreSectionId = "worship" | "community" | "accountApp";

export const MORE_SECTION_LABELS = {
  ar: {
    worship: "العبادة",
    community: "المجتمع",
    accountApp: "الحساب والتطبيق",
  },
  en: {
    worship: "Worship",
    community: "Community",
    accountApp: "Account & App",
  },
  de: {
    worship: "Glaube & Gebet",
    community: "Gemeinschaft",
    accountApp: "Konto & App",
  },
  tr: {
    worship: "İbadet",
    community: "Topluluk",
    accountApp: "Hesap ve Uygulama",
  },
} as const satisfies Record<Locale, Record<MoreSectionId, string>>;
