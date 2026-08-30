# Full Application Security Hardening Design

**Date:** 2026-08-31

## Goal

Perform a security-only, production-grade hardening pass over Prayerapp without redesigning UI, removing working functionality, weakening tests, merging, or making unrelated refactors. Security corrections must be evidence-driven and preserve newer compatible work already on `main`.

## Authority and constraints

- Baseline is the actual latest `main` inspected before implementation.
- Reuse one branch: `security/full-application-hardening`.
- Maintain one Draft PR against `main`; do not merge it.
- Do not change production data/schema unless a confirmed vulnerability requires the change.
- Do not perform destructive remote changes without explicit approval.
- If a real privileged secret is found, stop before any remote rotation/revocation and report it.
- Every confirmed code vulnerability gets a reproducible unsafe condition, a regression/security test where practical, the minimal fix, regression verification, and bypass review.
- Map material findings to OWASP Top 10 / ASVS / API Security Top 10 / MASVS and CWE.
- Prioritize P0/P1 before P2/P3.

## Threat model

### Unauthenticated attacker
Can reach public pages, public read APIs, authentication surfaces, geocoding proxy routes, public Android metadata/schedule routes, and anonymous Web Push subscription/test flows. Primary goals: resource exhaustion, outbound-request abuse, account enumeration, XSS/injection, cache poisoning, or unintended data access.

### Authenticated malicious user
Can exercise Supabase authenticated-role grants and user-owned personalization APIs. Primary goals: IDOR/BOLA, cross-user reads/writes, privilege escalation, native-installation takeover, or abuse of service-role-backed server routes.

### Compromised user account
Assume a valid user access token is available to the attacker. Bound damage to that account and prevent elevation into mosque administration or another user's native/push authority.

### Malicious client / modified Android app
Assume all client-side checks can be bypassed. Native authority must remain bound to server-validated account ownership plus installation credential/authority generation. No APK-distributed privileged secret is trusted as a security boundary.

### Supply-chain / CI attacker
Assume dependency registries, mutable action tags, artifacts, or PR code could be malicious. Keep signing secrets isolated from PR code, use least-privilege workflow tokens, cryptographically verify release artifacts, and reduce mutable dependencies where practical.

## Audit boundaries

1. Authentication and authorization, including admin server actions, account deletion, password/reset flows, token handling, logout, and IDOR/BOLA.
2. Supabase migrations, RLS, grants, SECURITY DEFINER routines, service-role boundaries, private tables, storage policies, and direct Data API bypass resistance.
3. All Next.js route handlers and backend entry points: authn/authz, validation, abuse controls, SSRF, CORS/origin, methods, response minimization, caching, and error leakage.
4. Browser/PWA security: CSP, HSTS, frame protections, service-worker caches, open redirects, XSS sinks, browser storage, notification URLs.
5. Android: exported components, deep links, postMessage/TWA origin validation, permissions, cleartext, backup, local secrets, logs, notifications, file providers, and target-SDK 37 hardening.
6. Secrets in the current tree and relevant Git history.
7. npm/Android dependencies and GitHub Actions supply chain.
8. CI/CD permissions, signing boundaries, deployment configuration, and branch-protection assumptions.

## Confirmed findings entering implementation

### P1 — Known-vulnerable Next.js dependency
`next@16.3.2` is in the affected range for CVE-2026-75604 / GHSA-p293-qw3h-jr36. Production Vercel is not the documented Windows-hosted exploit condition, but the repository still carries a known critical-vulnerability version and developer/self-hosted Windows environments are exposed. Use the minimum patched 16.3.x release and matching Next ESLint package; do not perform an unrelated major upgrade.

### P1 — Anonymous Web Push abuse / stored outbound-request surface
`/api/push/subscriptions` accepts any HTTPS endpoint and stores it server-side; `/api/push/test` can subsequently cause the server to perform Web Push delivery to that endpoint. The anonymous test path also deliberately keeps a request alive before delivery and has no durable abuse quota. This creates a stored blind SSRF-like outbound-request boundary plus resource/cost-amplification risk. Fix endpoint trust and abuse controls without removing legitimate anonymous Web Push functionality.

### P2 — Distributed rate-limit weakness on geocoding proxies
Geocoding routes use process-local memory counters. On serverless/multi-instance deployment this is not a durable application security boundary for a paid upstream API. Preserve the existing intended 30-per-10-minute policy while making enforcement production-appropriate or explicitly gate it operationally.

### P2 — Android native credential at rest
The native authority credential is generated with strong entropy and kept outside browser JavaScript, but it is stored in ordinary app-private SharedPreferences. Because it acts as a bearer-equivalent installation secret, migrate it to Android Keystore-backed protection while preserving existing installations and API 23 compatibility.

### P2 — CI supply-chain mutability
Several GitHub Actions are referenced by mutable major tags and CI uses `supabase/setup-cli@v2` with `version: latest`; ordinary CI also lacks an explicit least-privilege `permissions` declaration. Pin third-party actions/tool versions where verification supports it and add explicit least privilege without changing required workflow behavior.

### P2 — Operational repository/auth hardening
The inspected GitHub `main` branch is not protected. Checked-in Supabase local config has CAPTCHA disabled and `secure_password_change = false`; live Prayerapp Supabase project state is not accessible from the connected account, so these must be reported as manual production checks rather than silently changed remotely.

## Existing protections to preserve

- Server-only Supabase service-role client; browser receives only publishable/anon credentials.
- Server-side admin bearer-token validation and `ADMIN_EMAILS` allowlist.
- Ownership-bound personal-data RLS and service-role-only native/push tables.
- SECURITY DEFINER cron verifier with restricted execute grants and explicit search path.
- HSTS, nosniff, frame denial, referrer/permissions policies, private no-store headers, service-worker private/API cache exclusion.
- Android `allowBackup=false`, `usesCleartextTraffic=false`, exact-host deep links, verified TWA relationship before postMessage handling, non-exported sensitive components.
- Isolated Android signing jobs that do not execute PR code with signing secrets and verify artifact provenance/certificate/checksums.

## Completion standard

The phase is complete only after all code changes are reviewed, relevant CI/tests/builds/scans are green, a second attacker-perspective bypass review is performed, and residual/manual risks are explicitly documented. No statement of being unhackable or 100% secure is permitted.
