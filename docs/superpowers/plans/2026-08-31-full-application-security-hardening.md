# Full Application Security Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove confirmed exploitable/high-risk Prayerapp security weaknesses, strengthen meaningful defense-in-depth boundaries, and leave regression evidence plus an auditable residual-risk report without changing product behavior.

**Architecture:** Preserve the existing Next.js + Supabase + Android TWA security architecture and fix risks at trust boundaries rather than redesigning the system. Prioritize known-vulnerable server dependencies and anonymous API abuse first, then Android secret-at-rest protection and CI/supply-chain reproducibility. Treat live provider/dashboard settings that cannot be read safely from this environment as explicit operational controls, not assumed facts.

**Tech Stack:** Next.js 16, React 19, TypeScript, Vitest, Supabase/Postgres/RLS, Web Push, Java 17, Android API 23–37, Android Keystore, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-08-31-full-application-security-hardening-design.md`

## Global Constraints

- Security only; no UI redesign or unrelated refactor.
- Keep all working functionality unless a confirmed security boundary requires narrower behavior.
- Do not weaken or skip tests.
- Do not merge.
- Do not apply destructive remote changes without explicit approval.
- Create/apply a database migration only when required by a confirmed security correction.
- Stop before remote secret rotation/revocation if any real privileged secret is discovered.
- Preserve current `main` Android 17 / API 37 behavior, minSdk 23, native prayer delivery, PWA behavior, and release-signing identity.
- One implementation branch: `security/full-application-hardening`.
- One Draft PR against `main`.

## File Structure / Responsibility Map

- `package.json`, `package-lock.json` — patched npm dependency baseline.
- `lib/security/web-push-endpoint.ts` — pure Web Push endpoint trust policy.
- `lib/__tests__/web-push-security.test.ts` — adversarial endpoint and abuse-boundary tests.
- `app/api/push/subscriptions/route.ts` — subscription validation/ownership boundary.
- `app/api/push/test/route.ts` — anonymous test-push abuse boundary.
- `lib/push/web-push.ts` — delivery-time endpoint validation and bounded fanout.
- `supabase/migrations/*security*.sql` — only if durable abuse state is needed; service-role-only and least privilege.
- `app/api/geocode/route.ts`, `app/api/reverse-geocode/route.ts` — upstream API abuse controls if migrated to durable enforcement.
- `android-twa/app/src/main/java/de/donaumoschee/app/storage/*` — Keystore-backed native credential protection and migration.
- `android-twa/app/src/test/...` and `android-twa/app/src/androidTest/...` — secret-at-rest and compatibility regression coverage.
- `.github/workflows/*.yml` — explicit least privilege and immutable action/tool references where feasible.
- `next.config.ts` — only evidence-backed browser/header hardening; no speculative CSP breakage.
- `docs/superpowers/security/2026-08-31-security-audit-report.md` — finding inventory, OWASP/CWE mapping, verification evidence, residual/manual risk.

---

### Task 1: Patch known-vulnerable server dependencies

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`

**Interfaces:**
- Consumes: existing Next 16.3.x / React 19.2.x application APIs.
- Produces: minimum patched dependency versions without an unrelated major upgrade.

- [ ] **Step 1: Establish vulnerable baseline evidence**

Record the exact installed versions from `package-lock.json` and the authoritative advisories affecting them. Confirm the selected versions are outside all known affected ranges relevant to this application.

- [ ] **Step 2: Change only the required dependency versions**

Update Next.js and its matching ESLint config to the minimum fixed 16.3.x release. If the resolved React Server Components packages are in the July 2026 DoS range, update React/React DOM to the minimum fixed 19.2.x release as well.

- [ ] **Step 3: Verify lockfile consistency and vulnerabilities**

Run:

```bash
npm ci
npm audit --omit=dev
npm run lint
npm test
npm run build
```

Expected: lockfile installs without mutation, relevant advisories no longer apply, lint/tests/build pass.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "fix(security): patch vulnerable web dependencies"
```

---

### Task 2: Reject untrusted Web Push endpoints at registration and delivery

**Files:**
- Create: `lib/security/web-push-endpoint.ts`
- Create/Modify: `lib/__tests__/web-push-security.test.ts`
- Modify: `app/api/push/subscriptions/route.ts`
- Modify: `app/api/push/test/route.ts`
- Modify: `lib/push/web-push.ts`

**Interfaces:**
- Produces: `parseTrustedWebPushEndpoint(value: unknown): URL | null` and `isTrustedWebPushEndpoint(value: unknown): value is string`.
- The same trust policy is enforced before persistence and immediately before outbound delivery.

- [ ] **Step 1: Write RED endpoint-adversary tests**

Cover at minimum: `http:`, credentials in URL, non-443 explicit ports, localhost, loopback/private/link-local/reserved literal addresses, `.local`, arbitrary public attacker domains, and documented legitimate browser push-service hosts.

- [ ] **Step 2: Run focused test and confirm RED**

```bash
npm test -- lib/__tests__/web-push-security.test.ts
```

Expected: FAIL because the shared endpoint trust policy does not yet exist/current routes accept arbitrary HTTPS endpoints.

- [ ] **Step 3: Implement the minimal endpoint trust policy**

Use an explicit, documented allowlist of production browser push-service hosts/suffixes supported by Prayerapp. Reject URL credentials, unexpected ports, and all non-HTTPS inputs. Do not accept an arbitrary hostname merely because it resolves publicly.

- [ ] **Step 4: Enforce at all outbound boundaries**

Use the helper in subscription registration, test-push lookup, and `web-push.ts` before `sendNotification`. Invalid legacy rows must be skipped/disabled rather than contacted.

- [ ] **Step 5: Verify GREEN and regressions**

```bash
npm test -- lib/__tests__/web-push-security.test.ts
npm test
npm run lint
npm run build
```

- [ ] **Step 6: Commit**

```bash
git add lib/security/web-push-endpoint.ts lib/__tests__/web-push-security.test.ts app/api/push/subscriptions/route.ts app/api/push/test/route.ts lib/push/web-push.ts
git commit -m "fix(security): constrain web push outbound endpoints"
```

---

### Task 3: Add durable abuse controls for anonymous push testing and paid proxy APIs

**Files:**
- Create: one focused Supabase migration if required for durable counters/cooldowns.
- Create: `lib/security/rate-limit.ts` or a smaller boundary helper following existing patterns.
- Modify: `app/api/push/test/route.ts`
- Modify: `app/api/push/subscriptions/route.ts` only if registration abuse requires it.
- Modify: `app/api/geocode/route.ts`
- Modify: `app/api/reverse-geocode/route.ts`
- Add focused Vitest and migration privilege tests.

**Interfaces:**
- Preserve the existing geocoding intent of 30 requests / 10 minutes.
- Preserve legitimate anonymous Web Push testing while preventing repeated server-hold/outbound-delivery abuse.

- [ ] **Step 1: Write RED tests for limit persistence semantics**

Demonstrate that process-local maps do not satisfy the desired production contract and that repeated test-push calls for the same abuse key are rejected after the documented allowance.

- [ ] **Step 2: Run focused tests and confirm RED**

```bash
npm test -- lib/__tests__/*rate-limit*.test.ts lib/__tests__/web-push-security.test.ts
```

- [ ] **Step 3: Implement minimal durable enforcement**

If a database primitive is required, keep the table/function service-role-only, use bounded retention/window keys, avoid storing raw authentication tokens, and make increment/check atomic. Do not expose the limiter through anon/authenticated Data API grants.

- [ ] **Step 4: Add migration/bootstrap assertions**

Extend CI/local database assertions so anon/authenticated cannot read or mutate limiter state and only the intended server role can call privileged helpers.

- [ ] **Step 5: Verify GREEN and behavior**

Run focused tests, clean Supabase reset, full web tests/lint/build.

- [ ] **Step 6: Commit**

```bash
git commit -m "fix(security): add durable API abuse controls"
```

---

### Task 4: Bound Web Push fanout resource consumption

**Files:**
- Modify: `lib/push/web-push.ts`
- Modify: `lib/__tests__/web-push-security.test.ts`

- [ ] **Step 1: Write a RED test proving delivery fanout is bounded**

The test must fail if all subscriptions can be fired concurrently with unbounded `Promise.all`.

- [ ] **Step 2: Verify RED**

```bash
npm test -- lib/__tests__/web-push-security.test.ts
```

- [ ] **Step 3: Implement bounded batching/concurrency without dropping recipients**

Preserve existing delivery semantics and failure cleanup while limiting simultaneous outbound requests.

- [ ] **Step 4: Verify GREEN and commit**

```bash
npm test -- lib/__tests__/web-push-security.test.ts
npm test

git commit -m "fix(security): bound push delivery concurrency"
```

---

### Task 5: Protect the Android native credential with Android Keystore

**Files:**
- Create a focused Keystore-backed credential storage class under `android-twa/app/src/main/java/de/donaumoschee/app/storage/`.
- Modify: `NativeStore.java` only at the credential read/create boundary.
- Add Java unit/source-contract tests and instrumentation coverage where the AndroidKeyStore provider is required.

**Interfaces:**
- `NativeStore.credential()` remains the behavioral API.
- Existing plaintext installations must migrate safely once and preserve the same credential value; a failed migration must fail closed rather than silently rotate active authority.
- Must remain compatible with minSdk 23 and backup-disabled app behavior.

- [ ] **Step 1: Write RED tests/source contracts**

Require no long-lived credential plaintext under the existing preference key after successful migration and require AndroidKeyStore-backed authenticated encryption.

- [ ] **Step 2: Verify RED with Android unit/instrumentation test**

Run the smallest applicable Gradle test target and confirm failure is caused by plaintext storage.

- [ ] **Step 3: Implement Keystore AES-GCM protection and one-time migration**

Use a non-exportable Android Keystore AES key and app-private ciphertext/IV storage. Never log key material, credential plaintext, ciphertext, or auth headers.

- [ ] **Step 4: Verify API 23 and API 37 behavior**

Run debug/release unit tests, lint, build, and existing API-23/API-37 instrumentation jobs.

- [ ] **Step 5: Commit**

```bash
git commit -m "fix(android-security): protect native authority credential at rest"
```

---

### Task 6: Harden CI/CD supply-chain and token permissions

**Files:**
- Modify applicable `.github/workflows/*.yml`
- Add/modify workflow source-contract tests if existing repository pattern supports them.

- [ ] **Step 1: Write RED workflow contract tests**

Require explicit least-privilege permissions for ordinary CI and immutable full-SHA references for third-party actions selected for pinning. Require a fixed Supabase CLI version instead of `latest`.

- [ ] **Step 2: Verify RED**

Run the workflow source-contract tests and confirm failures point at mutable references/current CI permissions.

- [ ] **Step 3: Pin verified action SHAs/tool version and add permissions**

Preserve exact workflow behavior, Android signing isolation, artifact verification, and release permissions. Do not grant new scopes.

- [ ] **Step 4: Verify GREEN and commit**

```bash
npm test -- lib/__tests__/*ci*.test.ts lib/__tests__/*workflow*.test.ts
npm test

git commit -m "ci(security): pin supply chain and least privilege tokens"
```

---

### Task 7: Browser, auth, privacy, and secret-scan closure

**Files:**
- Modify only files with evidence-backed findings.
- Update final security report.

- [ ] **Step 1: Finish sink/source review**

Search for raw HTML injection, dynamic code execution, unsafe URL navigation, sensitive browser/native storage, clipboard/notification leakage, debug endpoints, source-map exposure, and sensitive logging.

- [ ] **Step 2: Review auth/reset/session behavior and production-config gaps**

Confirm generic auth errors, safe return URLs, server-side admin authorization, refresh rotation, logout behavior, and direct Data API ownership boundaries. Record live Supabase settings that cannot be verified from the connected account (`secure_password_change`, CAPTCHA, network restrictions, Auth rate limits) as manual checks.

- [ ] **Step 3: Complete current-tree and history secret scan**

Search current content and relevant history for Supabase service keys/JWT secrets, VAPID private keys, OAuth/database credentials, private keys, Android keystores/passwords, and CI tokens. If a real secret is found, stop before remote rotation/revocation.

- [ ] **Step 4: Decide CSP changes from exploit evidence**

Do not remove `script-src 'unsafe-inline'` speculatively if doing so would break Next.js runtime. If no executable injection sink is found, document nonce-based CSP as residual defense-in-depth rather than forcing an unverified framework change.

---

### Task 8: Final verification, attacker re-review, and independent review

**Files:**
- Create/Update: `docs/superpowers/security/2026-08-31-security-audit-report.md`

- [ ] **Step 1: Run all relevant web verification**

```bash
git diff --check origin/main...HEAD
npm ci
npm run lint
npm test
npm audit --omit=dev
npm run build
```

- [ ] **Step 2: Run Supabase bootstrap/security verification**

Run clean local Supabase reset and all privilege/RLS assertions. Run security advisor against the live Prayerapp project only if/when the correct project is connected; do not substitute an unrelated Supabase project.

- [ ] **Step 3: Run Android verification**

```bash
cd android-twa
./gradlew --no-daemon :app:testDebugUnitTest :app:lintDebug :app:assembleDebug :app:assembleDebugAndroidTest :app:testReleaseUnitTest :app:lintRelease :app:assembleRelease :app:bundleRelease --stacktrace
```

Run API-23/API-37 instrumentation through the existing GitHub workflow.

- [ ] **Step 4: Re-run dependency/static/secret checks**

Record exact tool output and distinguish scanner limitations from clean findings.

- [ ] **Step 5: Perform second attacker-perspective review**

Attempt bypasses of endpoint validation, rate-limit keys, user ownership, admin authorization, native authority generations, service-worker cache exclusions, deep links/postMessage origin checks, and CI signing isolation.

- [ ] **Step 6: Request independent code/security review**

Use `requesting-code-review`; keep the PR Draft and do not merge.

- [ ] **Step 7: Final report**

Record branch, Draft PR, final SHA, threat model, every finding/severity/OWASP/CWE/exploit/fix/test, verification results, dependency/scanner results, residual risks, operational Supabase/GitHub/Vercel actions, any rotation needs, CI status, and independent-review status.
