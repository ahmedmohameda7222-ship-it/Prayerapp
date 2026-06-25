"use client";

import { useState, useEffect } from "react";
import { AdminShell } from "@/components/layout/AdminShell";
import { AdminTable } from "@/components/admin/AdminTable";
import { getAuditLogs } from "@/lib/data/audit-logs";
import type { AuditLog } from "@/lib/types";

export default function AdminLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);

  useEffect(() => {
    getAuditLogs().then((data) => setLogs(data));
  }, []);

  return (
    <AdminShell title="Audit Logs">
      <AdminTable headers={["Actor", "Action", "Created At"]} rows={logs.map((log) => [log.actor, log.action, log.createdAt])} />
    </AdminShell>
  );
}
