import { createClient } from "@/lib/supabase/client";
import { auditLogs as mockAuditLogs } from "@/lib/mock-data";
import type { AuditLog } from "@/lib/types";

export async function getAuditLogs(): Promise<AuditLog[]> {
  const client = createClient();
  if (!client) return mockAuditLogs;
  const { data, error } = await client.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(100);
  if (error || !data) return mockAuditLogs;
  return data.map((row: unknown) => ({
    id: String((row as Record<string, unknown>).id),
    actor: String((row as Record<string, unknown>).actor),
    action: String((row as Record<string, unknown>).action),
    createdAt: String((row as Record<string, unknown>).created_at),
  }));
}

export async function createAuditLog(item: Omit<AuditLog, "id">): Promise<AuditLog> {
  const client = createClient();
  if (!client) return { ...item, id: `mock-${Date.now()}` };
  const db = {
    actor: item.actor,
    action: item.action,
    created_at: item.createdAt,
  };
  const { data, error } = await client.from("audit_logs").insert(db).select().single();
  if (error || !data) throw new Error("Failed to create audit log");
  return { ...item, id: String((data as Record<string, unknown>).id) };
}
