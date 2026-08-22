"use client";

import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { useTranslation } from "@/lib/i18n/use-translation";

export default function ImprintPage() {
  const { t } = useTranslation();

  return (
    <AppShell>
      <div className="privacy-screen">
        <PageHeader titleKey="legal.imprintTitle" backHref="/more" />
        <p className="privacy-intro">{t("legal.imprintIntro")}</p>

        <div className="privacy-body">
          <section className="legal-section">
            <h2>{t("legal.providerTitle")}</h2>
            <p>{t("legal.providerPending")}</p>
          </section>
          <section className="legal-section">
            <h2>{t("legal.contactDetailsTitle")}</h2>
            <p>{t("legal.contactDetailsPending")}</p>
          </section>
          <p className="legal-review-notice" role="note">{t("legal.reviewRequired")}</p>
          <Link className="legal-related-link" href="/privacy">{t("legal.privacyTitle")}</Link>
        </div>
      </div>
    </AppShell>
  );
}
