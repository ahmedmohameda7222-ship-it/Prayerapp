import { createHash } from "node:crypto";
import { createServerClient } from "@/lib/supabase/server";

type RateLimitOptions = {
  scope: string;
  limit: number;
  windowSeconds: number;
};

type RateLimitRow = {
  allowed?: unknown;
  remaining?: unknown;
  retry_after_seconds?: unknown;
};

export type SecurityRateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

function clientIdentityHash(request: Request, scope: string) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const clientIp = forwarded && forwarded.length <= 128 ? forwarded : "unknown";
  return createHash("sha256")
    .update(`${scope}\n${clientIp}`, "utf8")
    .digest("hex");
}

export async function consumeSecurityRateLimit(
  request: Request,
  { scope, limit, windowSeconds }: RateLimitOptions,
): Promise<SecurityRateLimitResult> {
  if (!/^[a-z0-9][a-z0-9_-]{0,63}$/.test(scope)) throw new Error("Invalid rate limit scope");
  if (!Number.isInteger(limit) || limit < 1 || limit > 10000) throw new Error("Invalid rate limit allowance");
  if (!Number.isInteger(windowSeconds) || windowSeconds < 1 || windowSeconds > 3600) {
    throw new Error("Invalid rate limit window");
  }

  const client = createServerClient();
  if (!client) throw new Error("Rate limit storage is unavailable");

  const { data, error } = await client.rpc("consume_security_rate_limit", {
    p_scope: scope,
    p_identity_hash: clientIdentityHash(request, scope),
    p_limit: limit,
    p_window_seconds: windowSeconds,
  });
  if (error) throw new Error(`Rate limit check failed: ${error.message}`);

  const row = (Array.isArray(data) ? data[0] : data) as RateLimitRow | null;
  if (
    !row
    || typeof row.allowed !== "boolean"
    || typeof row.remaining !== "number"
    || !Number.isInteger(row.remaining)
    || typeof row.retry_after_seconds !== "number"
    || !Number.isInteger(row.retry_after_seconds)
  ) {
    throw new Error("Rate limit response is invalid");
  }

  return {
    allowed: row.allowed,
    remaining: Math.max(0, row.remaining),
    retryAfterSeconds: Math.max(0, row.retry_after_seconds),
  };
}
