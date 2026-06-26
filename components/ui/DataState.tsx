"use client";

import { AlertTriangle, LoaderCircle, RefreshCw } from "lucide-react";
import { Card } from "./Card";
import { Button } from "./Button";
import { useTranslation } from "@/lib/i18n/use-translation";

export function DataLoading() {
  const { t } = useTranslation();
  return <Card className="flex items-center justify-center gap-2 text-sm font-bold text-[var(--color-muted)]"><LoaderCircle className="h-5 w-5 animate-spin" />{t("common.loading")}</Card>;
}

export function DataError({ message, retry }: { message?: string; retry?: () => void }) {
  const { t } = useTranslation();
  return (
    <Card className="grid gap-3 text-center">
      <AlertTriangle className="mx-auto h-6 w-6 text-[var(--color-danger)]" />
      <p className="text-sm font-bold text-[var(--color-danger)]">{message || t("common.dataLoadFailed")}</p>
      {retry ? <Button type="button" variant="ghost" onClick={retry}><RefreshCw className="h-4 w-4" />{t("common.retry")}</Button> : null}
    </Card>
  );
}
