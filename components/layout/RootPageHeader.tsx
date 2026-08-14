"use client";

import { LanguageMenu } from "@/components/home/LanguageMenu";
import { NotificationButton } from "@/components/notifications/NotificationButton";
import { useTranslation } from "@/lib/i18n/use-translation";

export function RootPageHeader({ titleKey }: { titleKey: string }) {
  const { t } = useTranslation();

  return (
    <header className="root-page-header" data-testid="root-page-header">
      <div className="root-page-header-inner">
        <h1>{t(titleKey)}</h1>
        <div className="root-page-header-actions" dir="ltr">
          <LanguageMenu tone="app-inverted" align="end" />
          <NotificationButton appInverted />
        </div>
      </div>
    </header>
  );
}
