import { AdminShell } from "@/components/layout/AdminShell";
import { AdminTable } from "@/components/admin/AdminTable";
import { auditLogs } from "@/lib/mock-data";

export default function AdminLogsPage() {
  return (
    <AdminShell title="Audit Logs">
      <AdminTable headers={["Actor", "Action", "Created At"]} rows={auditLogs.map((log) => [log.actor, log.action, log.createdAt])} />
    </AdminShell>
  );
}
