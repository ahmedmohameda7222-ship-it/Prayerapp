"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { useTranslation } from "@/lib/i18n/use-translation";

export function AdminFormSection({ title, children }: { title: string; children: ReactNode }) {
  const { t } = useTranslation();

  return (
    <section className="card p-5">
      <h2 className="mb-4 text-lg font-extrabold text-[var(--color-emerald)]">{title}</h2>
      <div className="grid gap-4 md:grid-cols-2">{children}</div>
      <div className="mt-5 flex gap-3">
        <Button>{t("common.save")}</Button>
        <Button variant="ghost">{t("common.cancel")}</Button>
      </div>
    </section>
  );
}
