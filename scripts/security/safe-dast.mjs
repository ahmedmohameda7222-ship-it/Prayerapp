#!/usr/bin/env node

import http from "node:http";
import https from "node:https";

const baseUrl = process.env.BASE_URL || "http://127.0.0.1:3000";
const strictCsp = process.env.EXPECT_STRICT_CSP === "1";
const baseHostname = new URL(baseUrl).hostname;
const isolatedLocalRuntime = baseHostname === "127.0.0.1" || baseHostname === "localhost";

const failures = [];
const evidence = [];

function fail(message) {
  failures.push(message);
}

function record(name, value) {
  evidence.push(`${name}: ${value}`);
}

async function probe(path, init = {}) {
  const response = await fetch(new URL(path, baseUrl), {
    redirect: "manual",
    signal: AbortSignal.timeout(10_000),
    ...init,
  });
  return response;
}

async function rawMethodProbe(path, method) {
  const url = new URL(path, baseUrl);
  const transport = url.protocol === "https:" ? https : http;

  return await new Promise((resolve, reject) => {
    const request = transport.request(url, {
      method,
      headers: {
        "user-agent": "Prayerapp-Safe-DAST/1.0",
      },
    }, (response) => {
      response.resume();
      response.once("end", () => {
        resolve({ status: response.statusCode || 0 });
      });
    });

    request.setTimeout(10_000, () => {
      request.destroy(new Error(`${method} probe timed out`));
    });
    request.once("error", reject);
    request.end();
  });
}

function header(response, name) {
  return response.headers.get(name) || "";
}

function requireHeader(response, name, predicate, description) {
  const value = header(response, name);
  record(`${response.url} ${name}`, value || "<missing>");
  if (!predicate(value)) fail(`${description}: ${name}=${JSON.stringify(value)}`);
}

async function readJsonError(response) {
  try {
    const value = await response.json();
    return value && typeof value === "object" && !Array.isArray(value) && typeof value.error === "string"
      ? value.error
      : "";
  } catch {
    return "";
  }
}

const page = await probe("/privacy");
record("privacy status", page.status);
if (page.status !== 200) fail(`/privacy expected 200, received ${page.status}`);
requireHeader(page, "strict-transport-security", (value) => value.includes("max-age=63072000"), "HSTS missing or weak");
requireHeader(page, "x-content-type-options", (value) => value.toLowerCase() === "nosniff", "nosniff missing");
requireHeader(page, "x-frame-options", (value) => value.toUpperCase() === "DENY", "frame protection missing");
requireHeader(page, "referrer-policy", (value) => value === "strict-origin-when-cross-origin", "referrer policy mismatch");
requireHeader(page, "permissions-policy", (value) => value.includes("camera=()") && value.includes("microphone=()"), "permissions policy mismatch");
if (header(page, "x-powered-by")) fail("X-Powered-By must not be exposed");

const csp = header(page, "content-security-policy");
record("privacy CSP", csp || "<missing>");
if (!csp) fail("Content-Security-Policy missing from page response");
if (strictCsp) {
  const scriptDirective = csp.split(";").map((part) => part.trim()).find((part) => part.startsWith("script-src ")) || "";
  if (!scriptDirective.includes("'strict-dynamic'")) fail("strict CSP must contain strict-dynamic");
  if (!/'nonce-[^']+'/u.test(scriptDirective)) fail("strict CSP must contain a per-request script nonce");
  if (scriptDirective.includes("'unsafe-inline'")) fail("script-src must not contain unsafe-inline");
  if (scriptDirective.includes("'unsafe-eval'")) fail("script-src must not contain unsafe-eval");
  for (const expected of ["script-src-attr 'none'", "object-src 'none'", "frame-ancestors 'none'", "base-uri 'self'", "form-action 'self'"]) {
    if (!csp.includes(expected)) fail(`strict CSP missing ${expected}`);
  }
}

const secondPage = await probe("/privacy");
const secondCsp = header(secondPage, "content-security-policy");
if (strictCsp) {
  const nonceOf = (value) => value.match(/'nonce-([^']+)'/u)?.[1] || "";
  const firstNonce = nonceOf(csp);
  const secondNonce = nonceOf(secondCsp);
  record("nonce changes per request", String(Boolean(firstNonce && secondNonce && firstNonce !== secondNonce)));
  if (!firstNonce || !secondNonce || firstNonce === secondNonce) fail("CSP nonce must change between independent requests");
}

const admin = await probe("/api/admin/launch-readiness");
record("unauthorized admin status", admin.status);
if (admin.status !== 401) fail(`unauthorized admin readiness expected 401, received ${admin.status}`);
requireHeader(admin, "cache-control", (value) => value.includes("no-store"), "admin API must be no-store");

const crossOriginDelete = await probe("/api/account/delete", {
  method: "DELETE",
  headers: { Origin: "https://attacker.invalid" },
});
record("cross-origin account delete status", crossOriginDelete.status);
if (crossOriginDelete.status !== 403) fail(`cross-origin account deletion expected 403, received ${crossOriginDelete.status}`);

if (isolatedLocalRuntime) {
  const objectBoundaryCases = [
    ["null", "null", "Invalid JSON object"],
    ["array", "[]", "Invalid JSON object"],
    ["string", "\"text\"", "Invalid JSON object"],
    ["number", "123", "Invalid JSON object"],
    ["boolean", "true", "Invalid JSON object"],
    ["malformed", "{not-json", "Invalid JSON body"],
  ];
  for (const [label, body, expectedError] of objectBoundaryCases) {
    const response = await probe("/api/android/native-authority/enroll", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
    });
    const error = await readJsonError(response);
    record(`JSON object boundary ${label}`, `${response.status} ${error || "<no-json-error>"}`);
    if (response.status !== 400 || error !== expectedError) {
      fail(`expected-object JSON ${label} probe expected controlled 400 ${expectedError}, received ${response.status} ${JSON.stringify(error)}`);
    }
  }

  const validObject = await probe("/api/android/native-authority/enroll", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: "{}",
  });
  const validObjectError = await readJsonError(validObject);
  record("JSON object boundary valid object", `${validObject.status} ${validObjectError || "<no-json-error>"}`);
  if (validObject.status !== 400 || ["Invalid JSON object", "Invalid JSON body"].includes(validObjectError)) {
    fail(`valid JSON object must cross the object-shape boundary into field validation, received ${validObject.status} ${JSON.stringify(validObjectError)}`);
  }
}

const nativeInvalid = await probe("/api/android/native-authority/heartbeat", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: "{}",
});
record("unauthorized native heartbeat status", nativeInvalid.status);
if (nativeInvalid.status !== 401) fail(`unauthorized native heartbeat expected 401, received ${nativeInvalid.status}`);
requireHeader(nativeInvalid, "cache-control", (value) => value.includes("no-store"), "native authority response must be no-store");

const unsupportedMethod = await probe("/api/health", { method: "PUT" });
record("unsupported PUT health status", unsupportedMethod.status);
if (unsupportedMethod.status !== 405) fail(`unsupported application method expected 405, received ${unsupportedMethod.status}`);

const traceProbe = await rawMethodProbe("/api/health", "TRACE");
record("TRACE health status", traceProbe.status);
if (isolatedLocalRuntime) {
  // Next.js 16's local Node adapter rejects TRACE before route dispatch but currently
  // surfaces that framework-level rejection as 500. The explicit PUT probe above
  // still proves application-level method restriction. Production must reject TRACE
  // cleanly at the hosting edge and is held to 405/501 below.
  if (![405, 500, 501].includes(traceProbe.status)) {
    fail(`TRACE should be rejected before application handling, received ${traceProbe.status}`);
  }
} else if (![405, 501].includes(traceProbe.status)) {
  fail(`Production TRACE should be rejected cleanly, received ${traceProbe.status}`);
}

const openRedirectProbe = await probe("/?next=https%3A%2F%2Fattacker.invalid%2Fescape");
record("open redirect probe status", openRedirectProbe.status);
const location = header(openRedirectProbe, "location");
record("open redirect location", location || "<none>");
if (location && new URL(location, baseUrl).hostname === "attacker.invalid") fail("root query parameter created an external redirect");

const sw = await probe("/sw.js");
record("service worker status", sw.status);
if (sw.status !== 200) fail(`/sw.js expected 200, received ${sw.status}`);
requireHeader(sw, "cache-control", (value) => value.includes("no-store"), "service worker must not be stale-cached");
requireHeader(sw, "content-security-policy", (value) => value.includes("default-src 'self'") && value.includes("script-src 'self'"), "service-worker CSP mismatch");

console.log(evidence.join("\n"));
if (failures.length) {
  console.error("\nSAFE DAST FAILURES:");
  for (const item of failures) console.error(`- ${item}`);
  process.exit(1);
}
console.log("SAFE DAST PASS");
