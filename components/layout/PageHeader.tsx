"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { NotificationButton } from "@/components/notifications/NotificationButton";
import { useTranslation } from "@/lib/i18n/use-translation";

export function PageHeader({
  title,
  titleKey,
  arch = false,
  backHref = "/",
}: {
  title?: string;
  titleKey?: string;
  arch?: boolean;
  backHref?: string | null;
}) {
  const { t } = useTranslation();
  const displayTitle = titleKey ? t(titleKey) : title || "";

  return (
    <header className={`app-page-header ${arch ? "app-page-header-prominent" : ""}`}>
      <div className="app-page-header-inner">
        {backHref ? (
          <Link
            href={backHref}
            aria-label={t("common.backHome")}
            className="app-page-header-control"
          >
            <ChevronLeft className="h-5 w-5 rtl:rotate-180" aria-hidden="true" />
          </Link>
        ) : (
          <span className="app-page-header-spacer" aria-hidden="true" />
        )}
        <h1>{displayTitle}</h1>
        <div className="app-page-header-actions">
          <NotificationButton />
        </div>
      </div>
    </header>
  );
}
