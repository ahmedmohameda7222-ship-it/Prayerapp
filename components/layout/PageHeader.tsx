"use client";

import Link from "next/link";
import { LanguageMenu } from "@/components/home/LanguageMenu";
import { NotificationButton } from "@/components/notifications/NotificationButton";
import { useTranslation } from "@/lib/i18n/use-translation";

export function PageHeader({
  title,
  titleKey,
  backHref = "/",
}: {
  title?: string;
  titleKey?: string;
  arch?: boolean;
  backHref?: string | null;
}) {
  const { t, locale } = useTranslation();
  const displayTitle = titleKey ? t(titleKey) : title || "";

  return (
    <header className="root-page-header">
      <div className="root-page-header-inner">
        <h1>{displayTitle}</h1>
        <div className="root-page-header-actions" dir="ltr">
          <LanguageMenu />
          <NotificationButton home />
          {backHref ? (
            <Link
              href={backHref}
              aria-label={t("common.backHome")}
              className="root-page-header-control"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={`h-5 w-5 ${locale === "ar" ? "rotate-180" : ""}`}
                data-supericon="tabler:chevron-left"
                aria-hidden="true"
              >
                <path d="M15 6l-6 6l6 6" />
              </svg>
            </Link>
          ) : null}
        </div>
      </div>
    </header>
  );
}
