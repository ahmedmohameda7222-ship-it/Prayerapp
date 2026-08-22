import { createHash, timingSafeEqual } from "node:crypto";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const credentialPattern = /^[A-Za-z0-9_-]{43,128}$/u;

export function isInstallationId(value: unknown): value is string {
  return typeof value === "string" && uuidPattern.test(value);
}

export function isNativeCredential(value: unknown): value is string {
  return typeof value === "string" && credentialPattern.test(value);
}

export function hashNativeCredential(value: string) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

export function credentialMatches(value: string, expectedHash: string) {
  const actual = Buffer.from(hashNativeCredential(value), "hex");
  const expected = Buffer.from(expectedHash, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function bearerToken(request: Request, scheme = "Bearer") {
  const authorization = request.headers.get("authorization") || "";
  const prefix = `${scheme} `;
  return authorization.startsWith(prefix) ? authorization.slice(prefix.length).trim() : "";
}

export function isSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return !origin || origin === new URL(request.url).origin;
}
