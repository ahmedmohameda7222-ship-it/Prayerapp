"use client";

import { useEffect, useState } from "react";
import { AdminShell } from "@/components/layout/AdminShell";
import { AdminTable } from "@/components/admin/AdminTable";
import { getAuditLogs } from "@/lib/data/audit-logs";
import { getLocalizedAuditAction } from "@/lib/i18n/audit-actions";
import { useTranslation } from "@/lib/i18n/use-translation";
import type { AuditLog } from "@/lib/types";

export default function AdminLogsPage() {
  const { t } = useTranslation();
  const [logs, setLogs] = useState<AuditLog[]>([]);

  useEffect(() => {
    getAuditLogs().then((data) => setLogs(data));
  }, []);

  return (
    <AdminShell titleKey="admin.auditLogs">
      <AdminTable headers={[t("admin.actor"), t("admin.action"), t("admin.createdAt")]} rows={logs.map((log) => [log.actor, getLocalizedAuditAction(log.action, t), log.createdAt])} />
    </AdminShell>
  );
}
