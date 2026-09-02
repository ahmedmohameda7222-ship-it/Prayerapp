import "server-only";

import { randomUUID } from "node:crypto";
import { headers } from "next/headers";
import { requireAllowedAdminIdentity } from "@/lib/auth/admin-server";
import { createServerClient } from "@/lib/supabase/server";
import { sanitizeAdminAuditMetadata, type AdminAuditMetadata } from "@/lib/security/admin-audit-core";

const ACTION_PATTERN = /^[a-z0-9][a-z0-9._:-]{0,95}$/u;
const ENTITY_PATTERN = /^[a-z0-9][a-z0-9._:-]{0,63}$/u;

type AuditOutcome = "attempt" | "success" | "failure";

export type AdminAuditEvent = {
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: unknown;
};

export type AdminAuditContext = {
  actorUserId: string;
  actor: string;
  action: string;
  entityType: string;
  entityId: string | null;
  requestId: string;
  metadata: AdminAuditMetadata;
};

function invalidAuditInput(): never {
  throw new Error("admin.errors.auditUnavailable");
}

function normalizeEvent(event: AdminAuditEvent) {
  const action = event.action.trim().toLowerCase();
  const entityType = event.entityType.trim().toLowerCase();
  const entityId = event.entityId?.trim() || null;
  if (!ACTION_PATTERN.test(action) || !ENTITY_PATTERN.test(entityType) || (entityId && entityId.length > 160)) {
    return invalidAuditInput();
  }
  return { action, entityType, entityId };
}

async function requestCorrelationId() {
  try {
    const requestHeaders = await headers();
    const external = requestHeaders.get("x-request-id") || requestHeaders.get("x-vercel-id");
    if (external && external.length <= 128 && /^[A-Za-z0-9._:/-]+$/u.test(external)) return external;
  } catch {
    // Server Actions may be executed in test/build contexts without request headers.
  }
  return randomUUID();
}

async function appendAudit(
  context: AdminAuditContext,
  outcome: AuditOutcome,
  metadata?: unknown,
) {
  const client = createServerClient();
  if (!client) throw new Error("admin.errors.auditUnavailable");
  const merged = sanitizeAdminAuditMetadata({ ...context.metadata, ...sanitizeAdminAuditMetadata(metadata) });
  const { error } = await client.rpc("append_admin_audit_event", {
    p_actor_user_id: context.actorUserId,
    p_actor: context.actor,
    p_action: context.action,
    p_entity_type: context.entityType,
    p_entity_id: context.entityId,
    p_outcome: outcome,
    p_metadata: merged,
    p_request_id: context.requestId,
  });
  if (error) throw new Error("admin.errors.auditUnavailable");
}

export async function beginAdminAudit(token: string, event: AdminAuditEvent): Promise<AdminAuditContext> {
  const identity = await requireAllowedAdminIdentity(token);
  const normalized = normalizeEvent(event);
  const context: AdminAuditContext = {
    actorUserId: identity.userId,
    actor: identity.email,
    action: normalized.action,
    entityType: normalized.entityType,
    entityId: normalized.entityId,
    requestId: await requestCorrelationId(),
    metadata: sanitizeAdminAuditMetadata(event.metadata),
  };
  await appendAudit(context, "attempt");
  return context;
}

export async function finishAdminAudit(
  context: AdminAuditContext,
  outcome: Exclude<AuditOutcome, "attempt">,
  metadata?: unknown,
) {
  await appendAudit(context, outcome, metadata);
}

export function adminActionError(error: unknown, fallback = "admin.errors.saveFailed") {
  const message = error instanceof Error ? error.message : "";
  if (message === "admin.errors.unauthorized" || message === "admin.errors.auditUnavailable" || message === "admin.errors.invalidInput") {
    return message;
  }
  return fallback;
}
