const MAX_METADATA_BYTES = 4_096;
const MAX_KEYS = 24;
const MAX_ARRAY_ITEMS = 20;
const MAX_STRING_LENGTH = 512;
const MAX_DEPTH = 3;
const SECRET_KEY_PATTERN = /(?:authorization|password|passcode|secret|token|credential|cookie|session|service.?role|private.?key|api.?key)/iu;

type JsonPrimitive = string | number | boolean | null;
export type AdminAuditMetadata = Record<string, JsonPrimitive | JsonPrimitive[] | AdminAuditMetadata>;

function safeKey(key: string) {
  return key.length > 0 && key.length <= 64 && !SECRET_KEY_PATTERN.test(key);
}

function sanitizeValue(value: unknown, depth: number): JsonPrimitive | JsonPrimitive[] | AdminAuditMetadata | undefined {
  if (value === null) return null;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined;
  if (typeof value === "string") return value.slice(0, MAX_STRING_LENGTH);
  if (depth >= MAX_DEPTH) return undefined;
  if (Array.isArray(value)) {
    return value
      .slice(0, MAX_ARRAY_ITEMS)
      .map((item) => sanitizeValue(item, depth + 1))
      .filter((item): item is JsonPrimitive => item === null || ["string", "number", "boolean"].includes(typeof item));
  }
  if (typeof value === "object") {
    return sanitizeObject(value as Record<string, unknown>, depth + 1);
  }
  return undefined;
}

function sanitizeObject(input: Record<string, unknown>, depth = 0): AdminAuditMetadata {
  const output: AdminAuditMetadata = {};
  for (const [key, value] of Object.entries(input).slice(0, MAX_KEYS)) {
    if (!safeKey(key)) continue;
    const sanitized = sanitizeValue(value, depth);
    if (sanitized !== undefined) output[key] = sanitized;
  }
  return output;
}

function byteLength(value: AdminAuditMetadata) {
  return Buffer.byteLength(JSON.stringify(value), "utf8");
}

export function sanitizeAdminAuditMetadata(input: unknown): AdminAuditMetadata {
  if (!input || typeof input !== "object" || Array.isArray(input)) return {};
  const sanitized = sanitizeObject(input as Record<string, unknown>);
  if (byteLength(sanitized) <= MAX_METADATA_BYTES) return sanitized;

  const bounded: AdminAuditMetadata = {};
  for (const [key, value] of Object.entries(sanitized)) {
    bounded[key] = value;
    if (byteLength(bounded) > MAX_METADATA_BYTES) {
      delete bounded[key];
      break;
    }
  }
  return bounded;
}

export const ADMIN_AUDIT_METADATA_MAX_BYTES = MAX_METADATA_BYTES;
