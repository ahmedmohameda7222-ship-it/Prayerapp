"use client";

import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { useTranslation } from "@/lib/i18n/use-translation";

export default function PrivacyPage() {
  const { t } = useTranslation();

  return (
    <AppShell>
      <div className="privacy-screen">
        <PageHeader titleKey="legal.privacyTitle" backHref="/more" />
        <p className="privacy-intro">{t("legal.privacyIntro")}</p>

        <div className="privacy-body">
          <section className="legal-section">
            <h2>{t("legal.dataTitle")}</h2>
            <p>{t("legal.dataSummary")}</p>
          </section>
          <section className="legal-section">
            <h2>{t("legal.accountTitle")}</h2>
            <p>{t("legal.accountDeletion")}</p>
          </section>
          <section className="legal-section">
            <h2>{t("legal.notificationsTitle")}</h2>
            <p>{t("legal.notifications")}</p>
          </section>
          <section className="legal-section">
            <h2>{t("legal.contactTitle")}</h2>
            <p>{t("legal.contactPending")}</p>
          </section>
        </div>
      </div>
    </AppShell>
  );
}
