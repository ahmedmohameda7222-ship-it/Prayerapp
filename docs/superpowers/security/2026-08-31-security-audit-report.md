# Prayerapp Full Application Security Audit Report

**Date:** 2026-08-31  
**Repository:** `ahmedmohameda7222-ship-it/Prayerapp`  
**Baseline:** `main@a30bb69acfed518696b03ff80972406b62ab21b5`  
**Security branch:** `security/full-application-hardening`  
**Draft PR:** #104 — `Security: full application hardening`  
**Verified implementation SHA:** `4be2d72cc7f97ccee6a5f311f29a86d1b32d3c80`  
**Status:** Security code hardening implemented and technically verified. PR remains Draft, unmerged, and undeployed. Mandatory operational/pre-merge controls remain listed below.

## 1. Executive summary

This security-only phase reviewed Prayerapp as a web application, Supabase-backed backend, PWA/service worker, Android TWA/native integration, and GitHub Actions release pipeline. The work deliberately avoided UI redesign, unrelated feature refactors, production deployment, production Android release signing, secret rotation, or destructive remote changes.

The review confirmed and remediated multiple application and supply-chain weaknesses, including two P1 classes:

1. a known-vulnerable Next.js/React production dependency baseline; and
2. an anonymous Web Push outbound-request/resource-abuse boundary.

A second attacker-perspective review then discovered another P1-equivalent release-pipeline issue: `workflow_dispatch` inputs were interpolated directly into Bash source in Android signing workflows. Because GitHub Actions expression values are expanded before the shell executes the script, crafted manual-dispatch strings could become shell syntax in signer jobs associated with production credentials. Both signing entry points were hardened and regression-tested.

Other remediations include durable distributed rate limiting, Web Push fanout/concurrency controls, Android Keystore-backed protection for the native installation credential, service-worker private-cache exclusion, immutable GitHub Action references, least-privilege CI permissions, Gradle wrapper integrity verification, and a permanent production dependency audit gate.

No P0 finding was confirmed. The final attacker re-review did not identify an unresolved P1/P2 authentication, authorization, RLS, native-authority-generation, service-role, outbound-request, or signer-input bypass in the reviewed code.

This report does **not** claim that Prayerapp is unhackable or 100% secure. Security is an ongoing control process. Several operational controls remain mandatory before merge, especially GitHub branch protection, independent security review, and production Supabase security/auth verification.

## 2. Scope and threat model

The audit covered:

- authentication, authorization, account deletion, admin actions, token revalidation, and IDOR/BOLA boundaries;
- Supabase migrations, RLS, grants, `SECURITY DEFINER` routines, private/service-role-only tables, and direct Data API resistance;
- all material Next.js route handlers and server-side entry points;
- input validation, rate limiting, SSRF/outbound-request boundaries, CORS/origin behavior, response/cache controls, and error minimization;
- browser/PWA security headers and service-worker caching;
- Android exported components, TWA/deep-link trust, permissions, backup/cleartext policy, native authority secrets, and API 23/API 37 behavior;
- npm/Android dependency and GitHub Actions supply-chain posture;
- Android signing isolation and artifact provenance controls;
- current-tree privileged-secret patterns and operational repository/deployment controls.

Threat actors considered:

- unauthenticated Internet attacker;
- authenticated malicious user;
- attacker controlling a valid user account token;
- modified/malicious Android client;
- attacker attempting cross-user native authority takeover;
- resource-abuse attacker targeting paid/proxied APIs or Web Push fanout;
- CI/supply-chain attacker attempting to influence build/sign/release behavior.

## 3. Findings and remediation status

| ID | Severity | Finding | Status | Primary mappings |
|---|---|---|---|---|
| SEC-01 | P1 | Known-vulnerable Next.js/React dependency baseline | Fixed | OWASP A06; CWE-22 / resource-exhaustion advisory classes |
| SEC-02 | P1 | Anonymous Web Push stored outbound-request / blind-SSRF-like abuse surface | Fixed | OWASP A10; CWE-918; API4 / CWE-400, CWE-770 |
| SEC-03 | P2 | Process-local rate limits on paid geocoding proxies | Fixed | OWASP API4; CWE-770, CWE-799 |
| SEC-04 | P2 | Unbounded Web Push account fanout / delivery concurrency amplification | Fixed | OWASP API4; CWE-400, CWE-770 |
| SEC-05 | P2 | Android bearer-equivalent native credential stored as ordinary app-private plaintext | Fixed | MASVS-STORAGE / MASVS-CRYPTO; CWE-312, CWE-922 |
| SEC-06 | P2 | Service worker could retain private account content in cache | Fixed | OWASP A05/A01; CWE-525 |
| SEC-07 | P2 | Mutable CI dependencies / incomplete least-privilege and integrity controls | Fixed | OWASP A06; CWE-494 / least-privilege class |
| SEC-08 | P1 | Manual Android signer dispatch inputs interpolated directly into Bash, with overly broad signer secret scope | Fixed | OWASP A03; CWE-78 |
| SEC-09 | P2 operational | GitHub `main` currently unprotected | **Pending pre-merge** | Change-control / supply-chain governance |
| SEC-10 | P2 operational | Production Supabase auth/security-advisor state cannot be verified from the connected account | **Pending pre-merge** | OWASP A05 / authentication hardening |

### SEC-01 — vulnerable Next.js/React baseline

**Unsafe condition**

The baseline used Next.js `16.3.2`, which was inside the affected range for the August 2026 security advisories including CVE-2026-75604 / GHSA-p293-qw3h-jr36. The repository also required the corresponding patched React Server Components packages.

**Impact**

A repository carrying a known critical-vulnerability framework baseline is unacceptable even when the production hosting environment does not match every documented exploit precondition. Developer/self-hosted environments and future deployment topology can change the effective exploitability.

**Fix**

- Next.js -> `16.3.3`
- `eslint-config-next` -> `16.3.3`
- React / React DOM -> `19.2.8`

The upgrade stayed inside the existing major/minor family and did not introduce an unrelated framework migration.

**Verification**

- production dependency audit: `npm audit --omit=dev` -> **0 vulnerabilities** on the verified implementation;
- complete test suite and production build passed on Next.js 16.3.3.

Authoritative references:

- https://github.com/advisories/GHSA-p293-qw3h-jr36
- https://nextjs.org/blog/security-update-2026-08-25

### SEC-02 — anonymous Web Push outbound-request and resource abuse

**Unsafe condition**

The anonymous Web Push subscription endpoint accepted arbitrary HTTPS endpoints. The test-delivery path could later cause the server to perform an outbound Web Push request to that stored endpoint. The anonymous test also intentionally waits before delivery and previously lacked a durable abuse boundary.

This created a stored blind-SSRF-like outbound-request capability and resource/cost-amplification opportunity even though it was not a generic response-reading SSRF primitive.

**Fix**

A canonical Web Push endpoint validator now enforces:

- HTTPS only;
- no URL username/password;
- default/443 port only;
- bounded endpoint length;
- explicit trusted Web Push provider host policy;
- controlled exact-host extension via server configuration only.

Endpoint trust is enforced both:

1. before persistence; and
2. immediately before outbound delivery.

Legacy untrusted stored rows are not allowed to bypass the delivery-time check.

The anonymous test path is additionally protected by the durable security rate limiter and bounded delivery concurrency/fanout.

**Bypass review**

The second pass specifically checked scheme, credentials, ports, hostname matching, legacy-row delivery, account fanout, and scheduled-delivery reuse. No alternate outbound-request path was identified in the reviewed push code.

### SEC-03 — non-durable geocoding rate limits

**Unsafe condition**

Forward/reverse geocoding used in-process `Map` counters. In a serverless/multi-instance deployment this does not provide a durable global quota and therefore was not an adequate boundary for a paid upstream API.

**Fix**

A Supabase-backed atomic limiter was added with:

- fixed-window durable state;
- scoped hashed request keys rather than raw IP storage;
- `SECURITY DEFINER` RPC with explicit fixed `search_path`;
- execute access limited to `service_role`;
- no direct table access for `anon`, `authenticated`, or `service_role`;
- fail-closed application behavior when limiter storage is unavailable;
- cleanup support for expired buckets.

Forward and reverse geocoding preserve the intended **30 requests / 10 minutes** policy.

Malformed requests are rejected before paid upstream capacity is consumed.

**Deployment dependency**

Migration `20260831080500_security_rate_limits.sql` must be applied to production through the controlled release process after approval. It was validated from a clean local migration bootstrap; it was not remotely applied during this Draft PR.

### SEC-04 — Web Push fanout/concurrency amplification

**Unsafe condition**

Account-associated push delivery could amplify resource consumption if one account accumulated excessive subscriptions, and outbound delivery concurrency required an explicit ceiling.

**Fix**

- account-associated subscription fanout is bounded;
- scheduled reminder delivery applies the same account cap;
- outbound Web Push concurrency is bounded;
- durable request quotas protect abuse-prone anonymous paths.

The implementation retains legitimate notification behavior while bounding worst-case server work.

### SEC-05 — Android native authority credential at rest

**Unsafe condition**

The native installation credential was strongly generated and inaccessible to normal browser JavaScript, but it was persisted as ordinary plaintext in app-private `SharedPreferences`. The value is a bearer-equivalent credential for native authority operations, so ordinary private storage was insufficient defense in depth.

**Fix**

The credential is now protected using Android Keystore-backed AES/GCM:

- Android Keystore key material;
- `AES/GCM/NoPadding` authenticated encryption;
- randomized encryption state;
- one-time migration of existing plaintext installations;
- atomic persistence that removes the legacy plaintext only after encrypted state is safely committed;
- corrupt/incomplete encrypted state fails closed;
- behavior remains compatible with minSdk/API 23.

**Authority bypass review**

The native server boundary was re-reviewed independently of client checks:

- enrollment requires server-validated account authentication plus the installation credential/authority relationship;
- heartbeat/revocation/receipts require the private native credential;
- authority generation is checked;
- compare-and-set predicates prevent stale generations from mutating current authority.

No cross-user or stale-generation authority escalation was found in the reviewed path.

References:

- https://mas.owasp.org/MASVS/05-MASVS-STORAGE/
- https://mas.owasp.org/MASWE/MASVS-STORAGE/MASWE-0001/
- https://mas.owasp.org/MASWE/MASVS-STORAGE/MASWE-0003/

### SEC-06 — service-worker private caching

**Unsafe condition**

The service-worker route classification did not fully treat `/account` content as private, creating a browser-cache persistence risk for user-specific pages.

**Fix**

- account/private paths are excluded from cache storage;
- private/no-store responses are not cached;
- old private cache entries are purged during service-worker activation;
- admin/API private exclusions remain preserved.

This aligns browser caching with server-side `private, no-store` policy.

### SEC-07 — CI supply-chain mutability and least privilege

**Unsafe condition**

Several workflow dependencies were referenced by mutable major tags; Supabase CLI used a mutable version; ordinary CI did not explicitly constrain token permissions; and checkout credentials could have been retained implicitly.

**Fix**

- all external GitHub Actions are pinned to immutable full commit SHAs;
- Supabase CLI is fixed at `2.116.0`;
- ordinary CI explicitly uses `contents: read`;
- checkout uses `persist-credentials: false`;
- Gradle 9.3.1 wrapper distribution SHA-256 is pinned and validated;
- regression tests enforce these invariants;
- production dependencies are now audited permanently in CI after `npm ci`.

The verified CI log confirms the effective `GITHUB_TOKEN` had read-only contents permission.

### SEC-08 — signer `workflow_dispatch` shell injection

**Unsafe condition discovered during final attacker review**

Both Android signer entry points contained manual-dispatch values embedded directly in `run:` Bash scripts, for example values derived from `inputs.tag`, `inputs.run_id`, `inputs.source_sha`, or confirmation text.

GitHub expression interpolation occurs before Bash executes the generated script. A crafted dispatch value containing shell metacharacters/quoting could therefore alter shell source. The affected jobs were associated with Android production signing credentials, materially raising impact.

A second issue increased blast radius: signing secrets were available at job scope rather than only to the exact signing step that needed them.

**TDD evidence**

A regression test was committed first and deliberately turned CI red. The test requires that no `workflow_dispatch` input expression appears inside a multiline `run:` script.

The first fix hardened `android-production-release.yml`; the still-red test then exposed the same pattern in the isolated signed-RC job in `android-twa.yml`. Both paths were corrected before GREEN verification.

**Fix**

- dispatch inputs are passed through step `env:` bindings rather than becoming Bash source;
- `run_id` is validated as a positive numeric identifier;
- source SHA is validated as a 40-character lowercase hex SHA where applicable;
- release tag/confirmation checks operate on quoted shell variables;
- production keystore material and passwords are no longer job-global;
- secrets are step-scoped to the minimum certificate-reconstruction/signing operations;
- the isolated RC signer continues to avoid checking out PR code;
- production release provenance/certificate/checksum checks remain intact.

The ordinary PR Android workflow confirmed that the signer job remains **skipped** unless explicitly invoked through the protected manual path.

Reference:

- https://docs.github.com/en/actions/concepts/security/script-injections

### SEC-09 — GitHub `main` is unprotected

**Current state**

GitHub's branch metadata for `main` currently reports:

- `protected: false`;
- branch-protection enforcement disabled;
- no required status-check contexts through that protection configuration.

The repository rulesets endpoint also returned no active rulesets during the audit.

**Risk**

Application code can be technically hardened while the change-control boundary remains weak. Direct writes or merges without required review/status gates can bypass the reviewed security process.

**Required pre-merge action**

Configure protection/rules for `main` appropriate to the repository, at minimum requiring the intended CI/security checks and preventing accidental unreviewed direct integration. This is an operational repository action and was intentionally not changed silently by this PR.

### SEC-10 — production Supabase security/auth state is not connected

The connected Supabase account exposes only unrelated Plaivra projects. Prayerapp's live Supabase project is not available through the connected tooling, so production security advisors and auth dashboard controls could not be truthfully verified.

Checked-in local configuration is not proof of production state. Therefore the following remain mandatory manual checks against the actual Prayerapp project:

- Supabase Security Advisor findings;
- CAPTCHA/bot protection for relevant auth flows;
- secure password-change/re-authentication settings;
- auth rate-limit configuration;
- production network restrictions where appropriate;
- production migration state and grants/RLS after the security migration is deployed.

No unrelated Supabase project was used as a substitute.

## 4. Authorization and data-boundary re-review

The final attacker-perspective pass specifically revisited privileged paths rather than relying only on regression tests.

### Account deletion

The destructive account endpoint:

- rejects cross-origin browser requests;
- requires an explicit bearer credential;
- revalidates the token server-side with Supabase;
- derives the deletion target from the verified user;
- does not accept an arbitrary caller-supplied user ID as deletion authority.

### Admin operations

Material admin mutation families were sampled/reviewed, including:

- announcements;
- donations;
- events;
- Jumu'ah/Friday content;
- prayer times;
- Ramadan;
- settings.

Server actions revalidate the admin bearer through the server-side admin allowlist before service-role-backed writes. Page/client gating is not treated as the security boundary.

### Cron

Prayer-reminder cron execution requires either the configured cron bearer secret or the database-verified cron token boundary. Query/body fields do not select a privileged identity. A failed native-authority lookup can fall back to Web Push only **after** cron authorization and is therefore a delivery-reliability fallback, not an authorization bypass.

### Supabase/RLS

The effective migration chain preserves:

- ownership-bound personal data using `auth.uid()`;
- service-role-only native authority/receipt storage;
- restricted `SECURITY DEFINER` execute grants;
- explicit fixed `search_path` on security-definer functions reviewed in this phase;
- no public direct access to security limiter state;
- public Friday/khutbah reads separated from authorized admin mutation paths.

Clean migration bootstrap and privilege assertions passed in CI.

## 5. Browser/PWA controls reviewed

Preserved controls include:

- HSTS with long max-age and subdomains;
- `X-Content-Type-Options: nosniff`;
- frame denial / `frame-ancestors 'none'`;
- restrictive referrer and permissions policies;
- private `no-store` headers on account/admin/private API families;
- service-worker private/API cache exclusions;
- `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`;
- disabled `X-Powered-By` header.

### Residual CSP defense in depth

The current application CSP still includes `script-src 'self' 'unsafe-inline'`. No executable injection sink was confirmed during this phase, and a nonce/hash migration was not forced without a validated Next.js-compatible implementation because doing so speculatively could break application/runtime behavior.

A nonce/hash-based CSP remains a worthwhile defense-in-depth follow-up, but it is not represented here as an unfixed confirmed exploit.

## 6. Android platform review

Preserved Android protections include:

- `allowBackup=false`;
- cleartext traffic disabled;
- exact-host verified TWA/deep-link relationship;
- postMessage/origin relationship validation;
- sensitive Android components not exported unnecessarily;
- target/compile SDK 37 and minSdk 23 retained;
- permanent package/signing identity unchanged;
- signer isolation retained;
- APK/AAB provenance, certificate, and checksum verification retained.

No production APK/AAB was signed or released during this Draft PR.

## 7. Dependency, secret, and scanner evidence

### npm

Verified CI output at implementation SHA:

- `npm ci`: **found 0 vulnerabilities**;
- `npm audit --omit=dev`: **found 0 vulnerabilities**.

`npm audit` is a useful dependency-advisory gate, not a proof that dependencies contain no undisclosed vulnerability.

### Current-tree privileged-secret pattern recheck

Repository code search returned no matches for the reviewed high-signal privileged patterns:

- `SUPABASE_SERVICE_ROLE_KEY`;
- `VAPID_PRIVATE_KEY`;
- `BEGIN PRIVATE KEY`;
- `sk-proj`.

No real privileged credential requiring emergency rotation/revocation was confirmed in this hardening phase. Therefore no remote secret rotation was performed.

GitHub code-search results are not a cryptographic/full-history secret scanner. A dedicated historical secret-scanning product or GitHub secret-scanning capability should remain enabled/used operationally where available.

## 8. Verification evidence

### Web / database CI

**GitHub Actions CI #986** — run `33399900703` — **SUCCESS**

Verified against the PR merge result associated with implementation head `4be2d72cc7f97ccee6a5f311f29a86d1b32d3c80` and unchanged base `main@a30bb69acfed518696b03ff80972406b62ab21b5`:

- `git diff --check origin/main...HEAD` — PASS
- `npm ci` — PASS
- `npm audit --omit=dev` — PASS, 0 vulnerabilities
- `npm run lint` — PASS, 0 errors (35 non-blocking existing warnings)
- `npm test` — PASS, **118 test files / 536 tests**
- clean Supabase bootstrap/reset — PASS
- explicit table/function privilege assertions — PASS
- `npm run build` — PASS using Next.js 16.3.3
- CI cleanup — PASS

### Android CI

**Android TWA #409** — run `33399900606` — **SUCCESS**

Verified on exact implementation head `4be2d72cc7f97ccee6a5f311f29a86d1b32d3c80`:

- Gradle wrapper validation — PASS
- Android API 37 SDK setup — PASS
- debug/release unit tests — PASS
- debug/release lint — PASS
- debug APK / debug Android-test APK — PASS
- unsigned release APK — PASS
- unsigned release AAB — PASS
- exact-head unsigned candidate/provenance preparation — PASS
- API 23 instrumentation — **PASS**
- API 37 instrumentation — **PASS**
- production signing job — correctly **SKIPPED** for ordinary PR execution

The production signing workflow itself was not manually executed because this phase explicitly prohibited release/deployment actions.

## 9. Vercel production-state verification

The connected Vercel project `donaumoschee` is linked to the correct GitHub repository, `Prayerapp`.

At audit completion, the latest production deployment is still built from:

`main@a30bb69acfed518696b03ff80972406b62ab21b5`

—not from the security branch.

Repository deployment policy also keeps Git deployment enabled only for `main` and disabled for other branches.

Therefore this Draft security branch has **not** been deployed to production.

## 10. Residual risks and maintenance items

These items do not negate the verified fixes, but they must remain visible:

1. **GitHub main protection is absent.** Mandatory pre-merge repository control.
2. **Independent security/code review is not yet recorded.** This report is authored as part of the implementation process and is not a substitute for an independent reviewer.
3. **Prayerapp production Supabase is not connected.** Live Security Advisor/auth configuration and post-migration privilege verification remain mandatory.
4. **Production security migration is not applied yet.** Apply through the controlled approved release path; verify RLS/grants/functions afterward.
5. **CSP still permits inline script.** No exploitable sink was confirmed; nonce/hash CSP remains defense in depth.
6. **IP-based limiter identity assumes the trusted Vercel proxy behavior.** If hosting topology changes, revalidate trusted client-IP derivation rather than accepting arbitrary forwarding headers.
7. **No production Android signer execution occurred.** Signer security is structurally/regression tested; actual production signing must follow the protected release process.
8. **Dependency advisory scanning has coverage limits.** Continue Dependabot/security advisories and periodic audits.
9. **GitHub Actions emitted a Node 20 deprecation warning for some action runtimes.** Current pinned actions execute successfully; schedule a maintenance upgrade when supported versions are available and verified rather than switching to mutable/unreviewed action refs.
10. **Physical-device acceptance remains separate from this code-security audit.** Existing Android release acceptance requirements are not waived by emulator CI.

## 11. Mandatory pre-merge checklist

Do not merge PR #104 until all mandatory items below are satisfied:

- [ ] Keep the PR Draft until independent security/code review is complete.
- [ ] Obtain a genuine independent reviewer approval; do not treat the implementation author's review as independent approval.
- [ ] Protect `main` with the intended required review/status-check/change-control policy.
- [ ] Connect/access the actual Prayerapp production Supabase project.
- [ ] Review Supabase Security Advisor results and resolve material findings.
- [ ] Verify production auth controls: secure password changes/re-authentication, CAPTCHA/bot controls where appropriate, and auth rate limits.
- [ ] Plan/apply `20260831080500_security_rate_limits.sql` through the controlled release process only after review/approval.
- [ ] After production migration, verify effective RLS/grants and `consume_security_rate_limit` execute privileges on the live database.
- [ ] Re-run required CI on the final merge candidate.
- [ ] Do not publish/sign a production Android release except through the protected explicit release workflow and existing Android release acceptance process.
- [ ] After approved merge/deployment, verify production security headers, critical authenticated flows, anonymous push/geocoding abuse controls, and monitoring/spend alerts.

## 12. Final security position

At verified implementation SHA `4be2d72cc7f97ccee6a5f311f29a86d1b32d3c80`:

- all confirmed code-level P1/P2 findings from this phase have a implemented remediation and regression/verification evidence;
- the final attacker-perspective re-review did not confirm an unresolved P1/P2 bypass in the reviewed code paths;
- npm production dependency audit reports 0 known vulnerabilities at verification time;
- web CI, clean local database bootstrap, production build, Android Gradle verification, API 23 instrumentation, and API 37 instrumentation are green;
- no privileged secret requiring emergency rotation was confirmed;
- PR #104 remains Draft, unmerged, and undeployed;
- GitHub branch protection, independent review, and live Prayerapp Supabase controls remain mandatory before merge.

Security hardening should be treated as continuous. New dependencies, new privileged endpoints, new Android capabilities, infrastructure changes, and future release-pipeline edits should receive the same threat-model/TDD/bypass-review process used in this phase.
