# Prayerapp Security Remediation — Execution Checklist

Baseline: `b18430b360313148fc76baaeda9d96844ed508a5`  
Open controls at audit: **324** = **54 FAIL + 270 NOT VERIFIED**

**Rule:** a box may be checked only when the required evidence exists. Implementation approval does not authorize Production mutation, signing, publishing, or merge.


## Wave 0 — Evidence freeze, threat model & data classification (44 controls)

### Section 2 — Attack Surface Inventory

- [ ] `OPEN-012` [⬜ NOT VERIFIED] Enumerate every Next.js page that accepts user-controlled data.  
  **Closure evidence:** Code/config review plus reproducible verification evidence
- [ ] `OPEN-013` [⬜ NOT VERIFIED] Enumerate webhook/callback endpoints.  
  **Closure evidence:** Code/config review plus reproducible verification evidence
- [ ] `OPEN-014` [⬜ NOT VERIFIED] Enumerate Supabase Auth providers and redirect URLs.  
  **Closure evidence:** Code/config review plus reproducible verification evidence
- [ ] `OPEN-015` [⬜ NOT VERIFIED] Enumerate public assets that may contain configuration.  
  **Closure evidence:** Code/config review plus reproducible verification evidence
- [ ] `OPEN-016` [⬜ NOT VERIFIED] Enumerate PWA service-worker capabilities.  
  **Closure evidence:** Code/config review plus reproducible verification evidence
- [ ] `OPEN-017` [⬜ NOT VERIFIED] Enumerate GitHub environments and protection gates.  
  **Closure evidence:** Code/config review plus reproducible verification evidence
- [ ] `OPEN-018` [⬜ NOT VERIFIED] Enumerate long-lived signing/deployment/database credentials.  
  **Closure evidence:** Code/config review plus reproducible verification evidence

### Section 3 — Threat Model

- [ ] `OPEN-019` [⬜ NOT VERIFIED] Identify anonymous attacker capabilities.  
  **Closure evidence:** Documented runbook/model plus exercised evidence
- [ ] `OPEN-020` [⬜ NOT VERIFIED] Identify authenticated normal-user capabilities.  
  **Closure evidence:** Documented runbook/model plus exercised evidence
- [ ] `OPEN-021` [⬜ NOT VERIFIED] Identify malicious authenticated-user capabilities.  
  **Closure evidence:** Documented runbook/model plus exercised evidence
- [ ] `OPEN-022` [⬜ NOT VERIFIED] Identify compromised browser/session scenarios.  
  **Closure evidence:** Documented runbook/model plus exercised evidence
- [ ] `OPEN-023` [⬜ NOT VERIFIED] Identify compromised Android-device scenarios.  
  **Closure evidence:** Documented runbook/model plus exercised evidence
- [ ] `OPEN-024` [⬜ NOT VERIFIED] Identify malicious third-party app scenarios on Android.  
  **Closure evidence:** Documented runbook/model plus exercised evidence
- [ ] `OPEN-025` [⬜ NOT VERIFIED] Identify stolen/modified APK scenarios.  
  **Closure evidence:** Documented runbook/model plus exercised evidence
- [ ] `OPEN-026` [⬜ NOT VERIFIED] Identify compromised dependency/package scenarios.  
  **Closure evidence:** Documented runbook/model plus exercised evidence
- [ ] `OPEN-027` [⬜ NOT VERIFIED] Identify compromised CI pull-request scenarios.  
  **Closure evidence:** Documented runbook/model plus exercised evidence
- [ ] `OPEN-028` [⬜ NOT VERIFIED] Identify compromised developer-account scenarios.  
  **Closure evidence:** Documented runbook/model plus exercised evidence
- [ ] `OPEN-029` [⬜ NOT VERIFIED] Identify stolen admin-account scenarios.  
  **Closure evidence:** Documented runbook/model plus exercised evidence
- [ ] `OPEN-030` [⬜ NOT VERIFIED] Identify leaked public Supabase configuration vs leaked privileged Supabase secret.  
  **Closure evidence:** Documented runbook/model plus exercised evidence
- [ ] `OPEN-031` [⬜ NOT VERIFIED] Identify database abuse paths that bypass the application server.  
  **Closure evidence:** Documented runbook/model plus exercised evidence
- [ ] `OPEN-032` [⬜ NOT VERIFIED] Identify Web Push abuse/spam paths.  
  **Closure evidence:** Documented runbook/model plus exercised evidence
- [ ] `OPEN-033` [⬜ NOT VERIFIED] Identify native-alarm/native-authority spoofing paths.  
  **Closure evidence:** Documented runbook/model plus exercised evidence
- [ ] `OPEN-034` [⬜ NOT VERIFIED] Identify TWA origin-spoofing / Digital Asset Links failure modes.  
  **Closure evidence:** Documented runbook/model plus exercised evidence
- [ ] `OPEN-035` [⬜ NOT VERIFIED] Identify SSRF paths through geocoding/media/URL-fetching behavior.  
  **Closure evidence:** Documented runbook/model plus exercised evidence
- [ ] `OPEN-036` [⬜ NOT VERIFIED] Identify resource-exhaustion / cost-amplification paths.  
  **Closure evidence:** Documented runbook/model plus exercised evidence
- [ ] `OPEN-037` [⬜ NOT VERIFIED] Identify destructive admin action paths.  
  **Closure evidence:** Documented runbook/model plus exercised evidence
- [ ] `OPEN-038` [⬜ NOT VERIFIED] Identify data privacy impact if any one component is compromised.  
  **Closure evidence:** Documented runbook/model plus exercised evidence
- [ ] `OPEN-039` [⬜ NOT VERIFIED] Document trust boundaries and privilege transitions.  
  **Closure evidence:** Documented runbook/model plus exercised evidence

### Section 23 — Sensitive Data Classification

- [ ] `OPEN-101` [⬜ NOT VERIFIED] Inventory personal data collected.  
  **Closure evidence:** Documented runbook/model plus exercised evidence
- [ ] `OPEN-102` [⬜ NOT VERIFIED] Inventory account data.  
  **Closure evidence:** Documented runbook/model plus exercised evidence
- [ ] `OPEN-103` [⬜ NOT VERIFIED] Inventory location/geolocation data.  
  **Closure evidence:** Documented runbook/model plus exercised evidence
- [ ] `OPEN-104` [⬜ NOT VERIFIED] Inventory notification subscription data.  
  **Closure evidence:** Documented runbook/model plus exercised evidence
- [ ] `OPEN-105` [⬜ NOT VERIFIED] Inventory device identifiers/tokens if any.  
  **Closure evidence:** Documented runbook/model plus exercised evidence
- [ ] `OPEN-106` [⬜ NOT VERIFIED] Inventory logs containing user identifiers/IPs.  
  **Closure evidence:** Documented runbook/model plus exercised evidence
- [ ] `OPEN-107` [⬜ NOT VERIFIED] Inventory admin data.  
  **Closure evidence:** Documented runbook/model plus exercised evidence
- [ ] `OPEN-108` [⬜ NOT VERIFIED] Classify each data field: public / internal / personal / sensitive / secret.  
  **Closure evidence:** Documented runbook/model plus exercised evidence
- [ ] `OPEN-109` [⬜ NOT VERIFIED] Define retention period for each non-public data category.  
  **Closure evidence:** Documented runbook/model plus exercised evidence
- [ ] `OPEN-110` [⬜ NOT VERIFIED] Remove data not required for product function.  
  **Closure evidence:** Documented runbook/model plus exercised evidence
- [ ] `OPEN-111` [⬜ NOT VERIFIED] Verify production data is not copied into insecure dev/test environments.  
  **Closure evidence:** Documented runbook/model plus exercised evidence
- [ ] `OPEN-112` [⬜ NOT VERIFIED] Verify backups inherit appropriate protection and retention.  
  **Closure evidence:** Documented runbook/model plus exercised evidence
- [ ] `OPEN-113` [⬜ NOT VERIFIED] Verify account deletion/data deletion behavior meets product/legal requirements.  
  **Closure evidence:** Documented runbook/model plus exercised evidence
- [ ] `OPEN-114` [⬜ NOT VERIFIED] Verify privacy disclosures match actual app behavior.  
  **Closure evidence:** Documented runbook/model plus exercised evidence
- [ ] `OPEN-115` [⬜ NOT VERIFIED] Verify Android data collection matches Play/Data Safety declarations where applicable.  
  **Closure evidence:** Documented runbook/model plus exercised evidence
- [ ] `OPEN-116` [⬜ NOT VERIFIED] Verify app does not collect unexpected telemetry.  
  **Closure evidence:** Documented runbook/model plus exercised evidence

**Wave 0 exit:** [ ] all Wave 0 controls have evidence and have been reclassified PASS/N/A under the original checklist rules.

## Wave 1 — Supabase convergence, auth/admin auditability & native backend integrity (30 controls)

### Section 1 — Exact Repository and Deployment Baseline

- [ ] `OPEN-008` [⬜ NOT VERIFIED] Record exact Supabase project/environment being assessed.  
  **Closure evidence:** Production Supabase schema/config/log evidence
- [ ] `OPEN-009` [❌ FAIL] Verify repository migrations correspond to production migrations.  
  **Closure evidence:** Production Supabase schema/config/log evidence
- [ ] `OPEN-010` [⬜ NOT VERIFIED] Record enabled third-party services and APIs.  
  **Closure evidence:** Production Supabase schema/config/log evidence
- [ ] `OPEN-011` [⬜ NOT VERIFIED] Record all production environment-variable names; never copy secret values into the report.  
  **Closure evidence:** Production Supabase schema/config/log evidence

### Section 5 — Authentication

- [ ] `OPEN-046` [⬜ NOT VERIFIED] Verify account enumeration is minimized where applicable.  
  **Closure evidence:** Code/config review plus reproducible verification evidence
- [ ] `OPEN-047` [⬜ NOT VERIFIED] Verify login endpoints have abuse/rate limiting appropriate to provider capabilities.  
  **Closure evidence:** Code/config review plus reproducible verification evidence
- [ ] `OPEN-048` [⬜ NOT VERIFIED] Verify password reset flow cannot be hijacked through manipulated redirects.  
  **Closure evidence:** Code/config review plus reproducible verification evidence
- [ ] `OPEN-049` [⬜ NOT VERIFIED] Verify password reset tokens are single-purpose and expire.  
  **Closure evidence:** Code/config review plus reproducible verification evidence
- [ ] `OPEN-050` [⬜ NOT VERIFIED] Verify account recovery does not bypass normal privilege checks.  
  **Closure evidence:** Code/config review plus reproducible verification evidence
- [ ] `OPEN-051` [⬜ NOT VERIFIED] Verify email change requires appropriate re-authentication/verification.  
  **Closure evidence:** Code/config review plus reproducible verification evidence
- [ ] `OPEN-052` [⬜ NOT VERIFIED] Verify privileged actions use fresh/recent authentication when warranted.  
  **Closure evidence:** Code/config review plus reproducible verification evidence

### Section 6 — Admin Authentication and Authorization

- [ ] `OPEN-053` [❌ FAIL] Verify high-impact admin actions are auditable.  
  **Closure evidence:** Automated test + durable audit-log evidence

### Section 7 — Authorization / IDOR / BOLA / BFLA

- [ ] `OPEN-054` [⬜ NOT VERIFIED] Verify list endpoints cannot return other users' private data.  
  **Closure evidence:** Code/config review plus reproducible verification evidence
- [ ] `OPEN-055` [⬜ NOT VERIFIED] Verify query/filter parameters cannot widen scope beyond the caller's rights.  
  **Closure evidence:** Code/config review plus reproducible verification evidence
- [ ] `OPEN-056` [⬜ NOT VERIFIED] Verify admin-only fields cannot be modified by normal users.  
  **Closure evidence:** Code/config review plus reproducible verification evidence

### Section 8 — Supabase Project Configuration

- [ ] `OPEN-057` [⬜ NOT VERIFIED] Verify production Auth redirect URLs are narrowly configured.  
  **Closure evidence:** Production Supabase schema/config/log evidence
- [ ] `OPEN-058` [⬜ NOT VERIFIED] Verify unused Auth providers are disabled.  
  **Closure evidence:** Production Supabase schema/config/log evidence
- [ ] `OPEN-059` [⬜ NOT VERIFIED] Verify any dashboard/admin accounts use strong authentication and MFA where available.  
  **Closure evidence:** Production Supabase schema/config/log evidence
- [ ] `OPEN-060` [⬜ NOT VERIFIED] Verify Supabase project access is limited to authorized maintainers.  
  **Closure evidence:** Production Supabase schema/config/log evidence
- [ ] `OPEN-061` [⬜ NOT VERIFIED] Verify production secrets are not shared with preview deployments unless specifically required and protected.  
  **Closure evidence:** Production Supabase schema/config/log evidence
- [ ] `OPEN-062` [❌ FAIL] Review Supabase security/advisor findings and resolve launch-blocking findings.  
  **Closure evidence:** Production Supabase schema/config/log evidence

### Section 10 — PostgreSQL Functions, RPC, Views, Triggers and Privileges

- [ ] `OPEN-063` [⬜ NOT VERIFIED] Verify rollback/recovery path for security-sensitive migrations.  
  **Closure evidence:** Production Supabase schema/config/log evidence

### Section 49 — Announcement / News / Admin Content Integrity

- [ ] `OPEN-241` [⬜ NOT VERIFIED] Stored XSS testing completed.  
  **Closure evidence:** Automated test + durable audit-log evidence
- [ ] `OPEN-242` [❌ FAIL] Audit/log evidence exists for impactful admin changes where required.  
  **Closure evidence:** Automated test + durable audit-log evidence

### Section 50 — Native Authority / Web Push Fallback Logic

- [ ] `OPEN-243` [❌ FAIL] Device/account association is correct.  
  **Closure evidence:** Production Supabase schema/config/log evidence
- [ ] `OPEN-244` [❌ FAIL] Concurrent devices behave correctly.  
  **Closure evidence:** Production Supabase schema/config/log evidence

### Section 51 — Security Logging

- [ ] `OPEN-245` [⬜ NOT VERIFIED] Define security-relevant events.  
  **Closure evidence:** Automated test + durable audit-log evidence
- [ ] `OPEN-246` [❌ FAIL] Log significant admin actions.  
  **Closure evidence:** Automated test + durable audit-log evidence
- [ ] `OPEN-247` [⬜ NOT VERIFIED] Restrict log access.  
  **Closure evidence:** Automated test + durable audit-log evidence
- [ ] `OPEN-248` [⬜ NOT VERIFIED] Define retention.  
  **Closure evidence:** Automated test + durable audit-log evidence

**Wave 1 exit:** [ ] all Wave 1 controls have evidence and have been reclassified PASS/N/A under the original checklist rules.

## Wave 2 — Web/API validation, CSP/XSS and abuse hardening (37 controls)

### Section 13 — Input Validation & Injection

- [ ] `OPEN-064` [❌ FAIL] Validate length.  
  **Closure evidence:** RED→GREEN automated regression + live/black-box evidence
- [ ] `OPEN-065` [❌ FAIL] Validate numeric range.  
  **Closure evidence:** RED→GREEN automated regression + live/black-box evidence
- [ ] `OPEN-066` [⬜ NOT VERIFIED] Test SQL injection.  
  **Closure evidence:** RED→GREEN automated regression + live/black-box evidence
- [ ] `OPEN-067` [⬜ NOT VERIFIED] Test command injection.  
  **Closure evidence:** RED→GREEN automated regression + live/black-box evidence
- [ ] `OPEN-068` [⬜ NOT VERIFIED] Test template injection.  
  **Closure evidence:** RED→GREEN automated regression + live/black-box evidence
- [ ] `OPEN-069` [⬜ NOT VERIFIED] Test path traversal.  
  **Closure evidence:** RED→GREEN automated regression + live/black-box evidence
- [ ] `OPEN-070` [⬜ NOT VERIFIED] Test header injection / CRLF.  
  **Closure evidence:** RED→GREEN automated regression + live/black-box evidence
- [ ] `OPEN-071` [⬜ NOT VERIFIED] Test log injection.  
  **Closure evidence:** RED→GREEN automated regression + live/black-box evidence
- [ ] `OPEN-072` [⬜ NOT VERIFIED] Test JSON/body parser abuse.  
  **Closure evidence:** RED→GREEN automated regression + live/black-box evidence
- [ ] `OPEN-073` [⬜ NOT VERIFIED] Test prototype-pollution-relevant object merging where applicable.  
  **Closure evidence:** RED→GREEN automated regression + live/black-box evidence
- [ ] `OPEN-074` [⬜ NOT VERIFIED] Test malformed Unicode/encoding edge cases in security-sensitive identifiers.  
  **Closure evidence:** RED→GREEN automated regression + live/black-box evidence
- [ ] `OPEN-075` [⬜ NOT VERIFIED] Test integer/size overflow and extremely large inputs.  
  **Closure evidence:** RED→GREEN automated regression + live/black-box evidence
- [ ] `OPEN-076` [⬜ NOT VERIFIED] Test duplicate parameters / parameter pollution where routing/framework behavior matters.  
  **Closure evidence:** RED→GREEN automated regression + live/black-box evidence

### Section 14 — Cross-Site Scripting (XSS)

- [ ] `OPEN-077` [⬜ NOT VERIFIED] Test stored XSS.  
  **Closure evidence:** RED→GREEN automated regression + live/black-box evidence
- [ ] `OPEN-078` [⬜ NOT VERIFIED] Test reflected XSS.  
  **Closure evidence:** RED→GREEN automated regression + live/black-box evidence
- [ ] `OPEN-079` [⬜ NOT VERIFIED] Test DOM-based XSS.  
  **Closure evidence:** RED→GREEN automated regression + live/black-box evidence
- [ ] `OPEN-080` [⬜ NOT VERIFIED] Test URL/query/hash injection into DOM.  
  **Closure evidence:** RED→GREEN automated regression + live/black-box evidence
- [ ] `OPEN-081` [❌ FAIL] Verify CSP meaningfully limits exploitability.  
  **Closure evidence:** RED→GREEN automated regression + live/black-box evidence
- [ ] `OPEN-082` [❌ FAIL] Minimize/remove `'unsafe-inline'` where feasible through nonces/hashes.  
  **Closure evidence:** RED→GREEN automated regression + live/black-box evidence

### Section 15 — CSRF / Cross-Origin Request Security

- [ ] `OPEN-083` [⬜ NOT VERIFIED] Identify whether authentication uses cookies/session cookies.  
  **Closure evidence:** RED→GREEN automated regression + live/black-box evidence
- [ ] `OPEN-084` [⬜ NOT VERIFIED] Verify `SameSite`, `Secure`, `HttpOnly` cookie attributes where cookies are used.  
  **Closure evidence:** RED→GREEN automated regression + live/black-box evidence
- [ ] `OPEN-085` [⬜ NOT VERIFIED] Verify CORS is explicit and minimal.  
  **Closure evidence:** RED→GREEN automated regression + live/black-box evidence
- [ ] `OPEN-086` [⬜ NOT VERIFIED] Verify CORS never combines arbitrary origins with credentials.  
  **Closure evidence:** RED→GREEN automated regression + live/black-box evidence
- [ ] `OPEN-087` [⬜ NOT VERIFIED] Verify TWA/native-origin flows do not require dangerously broad CORS.  
  **Closure evidence:** RED→GREEN automated regression + live/black-box evidence
- [ ] `OPEN-088` [⬜ NOT VERIFIED] Test state-changing API calls from an attacker-controlled origin.  
  **Closure evidence:** RED→GREEN automated regression + live/black-box evidence

### Section 19 — API Security — OWASP API Top 10 Coverage

- [ ] `OPEN-089` [⬜ NOT VERIFIED] Authentication bypass, token/session manipulation, expired/revoked credentials tested.  
  **Closure evidence:** RED→GREEN automated regression + live/black-box evidence
- [ ] `OPEN-090` [⬜ NOT VERIFIED] Automated abuse of notification subscriptions, admin actions, cron-like operations, and other sensitive workflows tested.  
  **Closure evidence:** RED→GREEN automated regression + live/black-box evidence

### Section 20 — Rate Limiting, Abuse and Denial of Service

- [ ] `OPEN-091` [⬜ NOT VERIFIED] Apply global circuit breakers where runaway cost is possible.  
  **Closure evidence:** RED→GREEN automated regression + live/black-box evidence
- [ ] `OPEN-092` [⬜ NOT VERIFIED] Test burst abuse.  
  **Closure evidence:** RED→GREEN automated regression + live/black-box evidence
- [ ] `OPEN-093` [⬜ NOT VERIFIED] Test slow-request behavior where relevant.  
  **Closure evidence:** RED→GREEN automated regression + live/black-box evidence
- [ ] `OPEN-094` [⬜ NOT VERIFIED] Test repeated invalid-auth traffic.  
  **Closure evidence:** RED→GREEN automated regression + live/black-box evidence
- [ ] `OPEN-095` [⬜ NOT VERIFIED] Test automated subscription creation/deletion.  
  **Closure evidence:** RED→GREEN automated regression + live/black-box evidence

### Section 21 — Web Push Security

- [ ] `OPEN-096` [⬜ NOT VERIFIED] Cron secret cannot be brute-forced without throttling/monitoring.  
  **Closure evidence:** RED→GREEN automated regression + live/black-box evidence
- [ ] `OPEN-097` [⬜ NOT VERIFIED] Test forged subscription payloads.  
  **Closure evidence:** RED→GREEN automated regression + live/black-box evidence
- [ ] `OPEN-098` [⬜ NOT VERIFIED] Test malformed endpoint URLs.  
  **Closure evidence:** RED→GREEN automated regression + live/black-box evidence
- [ ] `OPEN-099` [⬜ NOT VERIFIED] Test unauthorized send attempts.  
  **Closure evidence:** RED→GREEN automated regression + live/black-box evidence
- [ ] `OPEN-100` [⬜ NOT VERIFIED] Test replay of cron/send requests where relevant.  
  **Closure evidence:** RED→GREEN automated regression + live/black-box evidence

**Wave 2 exit:** [ ] all Wave 2 controls have evidence and have been reclassified PASS/N/A under the original checklist rules.

## Wave 3 — CI/SAST/secret scanning/SBOM and repository governance (30 controls)

### Section 4 — Secret Management

- [ ] `OPEN-040` [⬜ NOT VERIFIED] Scan **entire Git history**, not only current files, for secrets.  
  **Closure evidence:** Code/config review plus reproducible verification evidence
- [ ] `OPEN-041` [⬜ NOT VERIFIED] Scan source, tests, fixtures, docs, issues/artifacts where accessible for secret leakage.  
  **Closure evidence:** Code/config review plus reproducible verification evidence
- [ ] `OPEN-042` [⬜ NOT VERIFIED] Verify secret rotation procedure exists.  
  **Closure evidence:** Code/config review plus reproducible verification evidence
- [ ] `OPEN-043` [⬜ NOT VERIFIED] Rotate any credential that has ever been exposed.  
  **Closure evidence:** Code/config review plus reproducible verification evidence
- [ ] `OPEN-044` [⬜ NOT VERIFIED] Verify retired/replaced secrets are revoked.  
  **Closure evidence:** Code/config review plus reproducible verification evidence
- [ ] `OPEN-045` [⬜ NOT VERIFIED] Verify GitHub environment protections cover production/signing secrets.  
  **Closure evidence:** Code/config review plus reproducible verification evidence

### Section 25 — Dependency Inventory / SCA

- [ ] `OPEN-117` [❌ FAIL] Generate inventory/SBOM for npm dependencies.  
  **Closure evidence:** CI scan/SBOM artifact
- [ ] `OPEN-118` [❌ FAIL] Generate inventory/SBOM for Gradle/Android dependencies.  
  **Closure evidence:** CI scan/SBOM artifact
- [ ] `OPEN-119` [⬜ NOT VERIFIED] Include transitive dependencies.  
  **Closure evidence:** CI scan/SBOM artifact
- [ ] `OPEN-120` [⬜ NOT VERIFIED] Review `CRITICAL` and `HIGH` advisories manually for exploitability.  
  **Closure evidence:** CI scan/SBOM artifact
- [ ] `OPEN-121` [⬜ NOT VERIFIED] Resolve/mitigate launch-blocking vulnerable dependencies.  
  **Closure evidence:** CI scan/SBOM artifact
- [ ] `OPEN-122` [⬜ NOT VERIFIED] Confirm no abandoned dependency is used for security-critical functionality.  
  **Closure evidence:** CI scan/SBOM artifact
- [ ] `OPEN-123` [⬜ NOT VERIFIED] Review dependency install scripts where risk warrants it.  
  **Closure evidence:** CI scan/SBOM artifact
- [ ] `OPEN-124` [⬜ NOT VERIFIED] Review newly introduced dependencies.  
  **Closure evidence:** CI scan/SBOM artifact
- [ ] `OPEN-125` [⬜ NOT VERIFIED] Remove unused dependencies.  
  **Closure evidence:** CI scan/SBOM artifact
- [ ] `OPEN-126` [⬜ NOT VERIFIED] Pin/lock dependencies reproducibly.  
  **Closure evidence:** CI scan/SBOM artifact
- [ ] `OPEN-127` [⬜ NOT VERIFIED] Review Gradle repositories and package sources.  
  **Closure evidence:** CI scan/SBOM artifact
- [ ] `OPEN-128` [⬜ NOT VERIFIED] Prevent dependency-confusion exposure for internal package names.  
  **Closure evidence:** CI scan/SBOM artifact
- [ ] `OPEN-129` [⬜ NOT VERIFIED] Verify package integrity/checksums/signatures where supported.  
  **Closure evidence:** CI scan/SBOM artifact
- [ ] `OPEN-130` [⬜ NOT VERIFIED] Monitor newly disclosed vulnerabilities after launch.  
  **Closure evidence:** CI scan/SBOM artifact

### Section 26 — Static Application Security Testing (SAST)

- [ ] `OPEN-131` [❌ FAIL] Run GitHub CodeQL where supported.  
  **Closure evidence:** CI scan/SBOM artifact
- [ ] `OPEN-132` [⬜ NOT VERIFIED] Run framework/language static security analysis.  
  **Closure evidence:** CI scan/SBOM artifact
- [ ] `OPEN-133` [❌ FAIL] Run secret scanner.  
  **Closure evidence:** CI scan/SBOM artifact
- [ ] `OPEN-134` [⬜ NOT VERIFIED] Do not close findings solely because a scanner labels them low-confidence.  
  **Closure evidence:** CI scan/SBOM artifact

### Section 27 — GitHub Repository Security

- [ ] `OPEN-135` [❌ FAIL] Required review policy appropriate to project.  
  **Closure evidence:** GitHub ruleset/config evidence

### Section 44 — Signing Key Protection

- [ ] `OPEN-167` [⬜ NOT VERIFIED] Confirm key has never been committed.  
  **Closure evidence:** Code/config review plus reproducible verification evidence
- [ ] `OPEN-168` [⬜ NOT VERIFIED] Confirm key is backed up securely.  
  **Closure evidence:** Code/config review plus reproducible verification evidence
- [ ] `OPEN-169` [⬜ NOT VERIFIED] Confirm backup access is restricted.  
  **Closure evidence:** Code/config review plus reproducible verification evidence
- [ ] `OPEN-170` [⬜ NOT VERIFIED] Confirm signing key rotation/loss plan is understood.  
  **Closure evidence:** Code/config review plus reproducible verification evidence
- [ ] `OPEN-171` [⬜ NOT VERIFIED] If Google Play App Signing is used, distinguish upload key vs Play app-signing key and publish correct accepted DAL fingerprint(s).  
  **Closure evidence:** Code/config review plus reproducible verification evidence

**Wave 3 exit:** [ ] all Wave 3 controls have evidence and have been reclassified PASS/N/A under the original checklist rules.

## Wave 4 — Android hardened release candidate and artifact/device verification (88 controls)

### Section 34 — Android Data-at-Rest / MASVS-STORAGE

- [ ] `OPEN-141` [⬜ NOT VERIFIED] Verify screenshots/recent-app preview handling is appropriate for any sensitive screens.  
  **Closure evidence:** Code/config review plus reproducible verification evidence
- [ ] `OPEN-142` [⬜ NOT VERIFIED] Verify clipboard is not used for secrets.  
  **Closure evidence:** Code/config review plus reproducible verification evidence
- [ ] `OPEN-143` [⬜ NOT VERIFIED] Inspect device filesystem on rooted/test device for unintended sensitive data.  
  **Closure evidence:** Code/config review plus reproducible verification evidence

### Section 36 — Android Authentication / Authorization / MASVS-AUTH

- [ ] `OPEN-144` [❌ FAIL] Verify stale native-authority lease cannot permanently suppress Web Push or grant authority.  
  **Closure evidence:** Code/config review plus reproducible verification evidence
- [ ] `OPEN-145` [⬜ NOT VERIFIED] Verify user/account changes do not leave another user's sensitive cached state.  
  **Closure evidence:** Code/config review plus reproducible verification evidence

### Section 37 — Android Network Security / MASVS-NETWORK

- [ ] `OPEN-146` [⬜ NOT VERIFIED] Test hostile Wi-Fi / interception using a controlled test proxy.  
  **Closure evidence:** Code/config review plus reproducible verification evidence

### Section 39 — Exact Alarm / Prayer Notification Security

- [ ] `OPEN-147` [⬜ NOT VERIFIED] Test reboot.  
  **Closure evidence:** Code/config review plus reproducible verification evidence
- [ ] `OPEN-148` [⬜ NOT VERIFIED] Test app update/package replacement.  
  **Closure evidence:** Code/config review plus reproducible verification evidence
- [ ] `OPEN-149` [⬜ NOT VERIFIED] Test manual clock change.  
  **Closure evidence:** Code/config review plus reproducible verification evidence
- [ ] `OPEN-150` [⬜ NOT VERIFIED] Test time-zone change.  
  **Closure evidence:** Code/config review plus reproducible verification evidence
- [ ] `OPEN-151` [⬜ NOT VERIFIED] Test permission revoke/grant.  
  **Closure evidence:** Code/config review plus reproducible verification evidence
- [ ] `OPEN-152` [⬜ NOT VERIFIED] Test process death.  
  **Closure evidence:** Code/config review plus reproducible verification evidence
- [ ] `OPEN-153` [⬜ NOT VERIFIED] Test device locked.  
  **Closure evidence:** Code/config review plus reproducible verification evidence
- [ ] `OPEN-154` [⬜ NOT VERIFIED] Test offline cached playback.  
  **Closure evidence:** Code/config review plus reproducible verification evidence
- [ ] `OPEN-155` [⬜ NOT VERIFIED] Test stale schedule.  
  **Closure evidence:** Code/config review plus reproducible verification evidence
- [ ] `OPEN-156` [⬜ NOT VERIFIED] Test corrupted local state.  
  **Closure evidence:** Code/config review plus reproducible verification evidence

### Section 43 — Android Privacy / MASVS-PRIVACY

- [ ] `OPEN-157` [⬜ NOT VERIFIED] App requests only permissions necessary for features.  
  **Closure evidence:** Code/config review plus reproducible verification evidence
- [ ] `OPEN-158` [⬜ NOT VERIFIED] Permission purpose is clear to user.  
  **Closure evidence:** Code/config review plus reproducible verification evidence
- [ ] `OPEN-159` [⬜ NOT VERIFIED] Data collection is minimized.  
  **Closure evidence:** Code/config review plus reproducible verification evidence
- [ ] `OPEN-160` [⬜ NOT VERIFIED] No unnecessary device fingerprinting.  
  **Closure evidence:** Code/config review plus reproducible verification evidence
- [ ] `OPEN-161` [⬜ NOT VERIFIED] Location use is limited to intended Prayerapp functionality.  
  **Closure evidence:** Code/config review plus reproducible verification evidence
- [ ] `OPEN-162` [⬜ NOT VERIFIED] Privacy policy accurately describes collected/transmitted data.  
  **Closure evidence:** Code/config review plus reproducible verification evidence
- [ ] `OPEN-163` [⬜ NOT VERIFIED] Play Store Data Safety answers match implementation.  
  **Closure evidence:** Code/config review plus reproducible verification evidence
- [ ] `OPEN-164` [⬜ NOT VERIFIED] User can exercise applicable control/deletion choices.  
  **Closure evidence:** Code/config review plus reproducible verification evidence
- [ ] `OPEN-165` [⬜ NOT VERIFIED] Third-party SDK collection is inventoried.  
  **Closure evidence:** Code/config review plus reproducible verification evidence
- [ ] `OPEN-166` [⬜ NOT VERIFIED] No analytics/SDK transmits more information than intended.  
  **Closure evidence:** Code/config review plus reproducible verification evidence

### Section 45 — APK/AAB Release Artifact Verification

- [ ] `OPEN-172` [❌ FAIL] Build from exact approved commit.  
  **Closure evidence:** Signed artifact/static analysis/device evidence
- [ ] `OPEN-173` [❌ FAIL] Sign only verified artifact.  
  **Closure evidence:** Signed artifact/static analysis/device evidence
- [ ] `OPEN-174` [❌ FAIL] Verify APK signature with platform tooling.  
  **Closure evidence:** Signed artifact/static analysis/device evidence
- [ ] `OPEN-175` [❌ FAIL] Verify AAB signing.  
  **Closure evidence:** Signed artifact/static analysis/device evidence
- [ ] `OPEN-176` [❌ FAIL] Verify package ID.  
  **Closure evidence:** Signed artifact/static analysis/device evidence
- [ ] `OPEN-177` [❌ FAIL] Verify versionCode/versionName.  
  **Closure evidence:** Signed artifact/static analysis/device evidence
- [ ] `OPEN-178` [❌ FAIL] Verify target/min SDK.  
  **Closure evidence:** Signed artifact/static analysis/device evidence
- [ ] `OPEN-179` [❌ FAIL] Inspect final merged manifest.  
  **Closure evidence:** Signed artifact/static analysis/device evidence
- [ ] `OPEN-180` [❌ FAIL] Verify `debuggable=false`.  
  **Closure evidence:** Signed artifact/static analysis/device evidence
- [ ] `OPEN-181` [❌ FAIL] Verify cleartext disabled.  
  **Closure evidence:** Signed artifact/static analysis/device evidence
- [ ] `OPEN-182` [❌ FAIL] Verify expected exported components only.  
  **Closure evidence:** Signed artifact/static analysis/device evidence
- [ ] `OPEN-183` [❌ FAIL] Verify expected permissions only.  
  **Closure evidence:** Signed artifact/static analysis/device evidence
- [ ] `OPEN-184` [❌ FAIL] Verify signing certificate SHA-256.  
  **Closure evidence:** Signed artifact/static analysis/device evidence
- [ ] `OPEN-185` [❌ FAIL] Generate signed APK/AAB SHA-256 checksum.  
  **Closure evidence:** Signed artifact/static analysis/device evidence
- [ ] `OPEN-186` [❌ FAIL] Install exact signed RC on physical device.  
  **Closure evidence:** Signed artifact/static analysis/device evidence
- [ ] `OPEN-187` [❌ FAIL] Verify asset links/TWA relationship using release identity.  
  **Closure evidence:** Signed artifact/static analysis/device evidence
- [ ] `OPEN-188` [❌ FAIL] Verify upgrade from previous production version preserves required functionality/security.  
  **Closure evidence:** Signed artifact/static analysis/device evidence
- [ ] `OPEN-189` [❌ FAIL] Verify downgrade behavior is not relied on for security.  
  **Closure evidence:** Signed artifact/static analysis/device evidence
- [ ] `OPEN-190` [❌ FAIL] Verify public download/release mechanism cannot serve a draft/untrusted artifact.  
  **Closure evidence:** Signed artifact/static analysis/device evidence
- [ ] `OPEN-191` [❌ FAIL] Verify release tag/version maps to the exact artifact and source.  
  **Closure evidence:** Signed artifact/static analysis/device evidence

### Section 47 — Android Static & Dynamic Testing

- [ ] `OPEN-219` [⬜ NOT VERIFIED] Analyze final release APK with MobSF-style static analysis or equivalent.  
  **Closure evidence:** Signed artifact/static analysis/device evidence
- [ ] `OPEN-220` [⬜ NOT VERIFIED] Decompile final release APK with JADX/apktool-style tooling for manual review.  
  **Closure evidence:** Signed artifact/static analysis/device evidence
- [ ] `OPEN-221` [⬜ NOT VERIFIED] Review manifest from built APK, not only source manifest.  
  **Closure evidence:** Signed artifact/static analysis/device evidence
- [ ] `OPEN-222` [⬜ NOT VERIFIED] Review exported components.  
  **Closure evidence:** Signed artifact/static analysis/device evidence
- [ ] `OPEN-223` [⬜ NOT VERIFIED] Review network security settings.  
  **Closure evidence:** Signed artifact/static analysis/device evidence
- [ ] `OPEN-224` [⬜ NOT VERIFIED] Review file-provider configuration.  
  **Closure evidence:** Signed artifact/static analysis/device evidence
- [ ] `OPEN-225` [⬜ NOT VERIFIED] Review WebView/TWA usage.  
  **Closure evidence:** Signed artifact/static analysis/device evidence
- [ ] `OPEN-226` [⬜ NOT VERIFIED] Review cryptography.  
  **Closure evidence:** Signed artifact/static analysis/device evidence
- [ ] `OPEN-227` [⬜ NOT VERIFIED] Install on physical Android device.  
  **Closure evidence:** Signed artifact/static analysis/device evidence
- [ ] `OPEN-228` [⬜ NOT VERIFIED] Test with ADB component invocation.  
  **Closure evidence:** Signed artifact/static analysis/device evidence
- [ ] `OPEN-229` [⬜ NOT VERIFIED] Test deep/app links from external app/ADB.  
  **Closure evidence:** Signed artifact/static analysis/device evidence
- [ ] `OPEN-230` [⬜ NOT VERIFIED] Test permission denial/revocation.  
  **Closure evidence:** Signed artifact/static analysis/device evidence
- [ ] `OPEN-231` [⬜ NOT VERIFIED] Test background/foreground lifecycle.  
  **Closure evidence:** Signed artifact/static analysis/device evidence
- [ ] `OPEN-232` [⬜ NOT VERIFIED] Test lock screen.  
  **Closure evidence:** Signed artifact/static analysis/device evidence
- [ ] `OPEN-233` [⬜ NOT VERIFIED] Test reboot.  
  **Closure evidence:** Signed artifact/static analysis/device evidence
- [ ] `OPEN-234` [⬜ NOT VERIFIED] Test offline mode.  
  **Closure evidence:** Signed artifact/static analysis/device evidence
- [ ] `OPEN-235` [⬜ NOT VERIFIED] Test malicious/invalid bridge messages.  
  **Closure evidence:** Signed artifact/static analysis/device evidence
- [ ] `OPEN-236` [⬜ NOT VERIFIED] Inspect local storage/files on test/rooted environment.  
  **Closure evidence:** Signed artifact/static analysis/device evidence
- [ ] `OPEN-237` [⬜ NOT VERIFIED] Inspect logcat for sensitive data.  
  **Closure evidence:** Signed artifact/static analysis/device evidence
- [ ] `OPEN-238` [⬜ NOT VERIFIED] Proxy native traffic where technically applicable.  
  **Closure evidence:** Signed artifact/static analysis/device evidence
- [ ] `OPEN-239` [⬜ NOT VERIFIED] Verify TLS behavior.  
  **Closure evidence:** Signed artifact/static analysis/device evidence
- [ ] `OPEN-240` [⬜ NOT VERIFIED] Test final signed build, not merely debug build.  
  **Closure evidence:** Signed artifact/static analysis/device evidence

### Section 59 — Android Release Candidate Verification on Physical Device

- [ ] `OPEN-297` [⬜ NOT VERIFIED] Verify package ID/version/signing fingerprint.  
  **Closure evidence:** Signed artifact/static analysis/device evidence
- [ ] `OPEN-298` [⬜ NOT VERIFIED] Launch verified production TWA.  
  **Closure evidence:** Signed artifact/static analysis/device evidence
- [ ] `OPEN-299` [⬜ NOT VERIFIED] Confirm no unexpected Custom Tab fallback under normal conditions.  
  **Closure evidence:** Signed artifact/static analysis/device evidence
- [ ] `OPEN-300` [⬜ NOT VERIFIED] Confirm notification permission flow.  
  **Closure evidence:** Signed artifact/static analysis/device evidence
- [ ] `OPEN-301` [⬜ NOT VERIFIED] Confirm exact-alarm permission flow.  
  **Closure evidence:** Signed artifact/static analysis/device evidence
- [ ] `OPEN-302` [⬜ NOT VERIFIED] Confirm prayer schedule sync.  
  **Closure evidence:** Signed artifact/static analysis/device evidence
- [ ] `OPEN-303` [⬜ NOT VERIFIED] Confirm 10-second reminder test with locked device.  
  **Closure evidence:** Signed artifact/static analysis/device evidence
- [ ] `OPEN-304` [⬜ NOT VERIFIED] Confirm 10-second Adhan test with locked device.  
  **Closure evidence:** Signed artifact/static analysis/device evidence
- [ ] `OPEN-305` [⬜ NOT VERIFIED] Confirm media notification and Stop control.  
  **Closure evidence:** Signed artifact/static analysis/device evidence
- [ ] `OPEN-306` [⬜ NOT VERIFIED] Remove app from recents and repeat.  
  **Closure evidence:** Signed artifact/static analysis/device evidence
- [ ] `OPEN-307` [⬜ NOT VERIFIED] Cache valid Adhan, disable network, repeat.  
  **Closure evidence:** Signed artifact/static analysis/device evidence
- [ ] `OPEN-308` [⬜ NOT VERIFIED] Reboot with future alarms configured and verify repair.  
  **Closure evidence:** Signed artifact/static analysis/device evidence
- [ ] `OPEN-309` [⬜ NOT VERIFIED] Revoke notifications and verify safe fallback.  
  **Closure evidence:** Signed artifact/static analysis/device evidence
- [ ] `OPEN-310` [⬜ NOT VERIFIED] Revoke exact alarm access and verify safe fallback.  
  **Closure evidence:** Signed artifact/static analysis/device evidence
- [ ] `OPEN-311` [⬜ NOT VERIFIED] Disable relevant notification channel and verify readiness revocation.  
  **Closure evidence:** Signed artifact/static analysis/device evidence
- [ ] `OPEN-312` [⬜ NOT VERIFIED] Corrupt/expire schedule state and verify fallback.  
  **Closure evidence:** Signed artifact/static analysis/device evidence
- [ ] `OPEN-313` [⬜ NOT VERIFIED] Check logcat for secret/private-data leakage.  
  **Closure evidence:** Signed artifact/static analysis/device evidence
- [ ] `OPEN-314` [⬜ NOT VERIFIED] Test app link handling.  
  **Closure evidence:** Signed artifact/static analysis/device evidence
- [ ] `OPEN-315` [⬜ NOT VERIFIED] Test malicious bridge messages using controlled test tooling.  
  **Closure evidence:** Signed artifact/static analysis/device evidence
- [ ] `OPEN-316` [⬜ NOT VERIFIED] Verify no security regression from release minification/obfuscation.  
  **Closure evidence:** Signed artifact/static analysis/device evidence

**Wave 4 exit:** [ ] all Wave 4 controls have evidence and have been reclassified PASS/N/A under the original checklist rules.

## Wave 5 — DAST, production controls, monitoring, incident response and restore drill (73 controls)

### Section 29 — Production Hosting

- [ ] `OPEN-136` [⬜ NOT VERIFIED] DNS records reviewed.  
  **Closure evidence:** Code/config review plus reproducible verification evidence
- [ ] `OPEN-137` [⬜ NOT VERIFIED] No dangling subdomains.  
  **Closure evidence:** Code/config review plus reproducible verification evidence
- [ ] `OPEN-138` [⬜ NOT VERIFIED] Preview deployments containing production data/secrets are appropriately protected.  
  **Closure evidence:** Code/config review plus reproducible verification evidence
- [ ] `OPEN-139` [⬜ NOT VERIFIED] Hosting access restricted to authorized maintainers.  
  **Closure evidence:** Code/config review plus reproducible verification evidence
- [ ] `OPEN-140` [⬜ NOT VERIFIED] MFA enabled for critical hosting/provider accounts where available.  
  **Closure evidence:** Code/config review plus reproducible verification evidence

### Section 46 — Web DAST / Black-Box Testing

- [ ] `OPEN-192` [⬜ NOT VERIFIED] Crawl all public routes.  
  **Closure evidence:** Authorized DAST evidence + retest
- [ ] `OPEN-193` [⬜ NOT VERIFIED] Crawl authenticated user routes.  
  **Closure evidence:** Authorized DAST evidence + retest
- [ ] `OPEN-194` [⬜ NOT VERIFIED] Crawl admin routes using authorized account.  
  **Closure evidence:** Authorized DAST evidence + retest
- [ ] `OPEN-195` [⬜ NOT VERIFIED] Proxy/browser test all API calls.  
  **Closure evidence:** Authorized DAST evidence + retest
- [ ] `OPEN-196` [⬜ NOT VERIFIED] Run OWASP ZAP/Burp-style passive scan.  
  **Closure evidence:** Authorized DAST evidence + retest
- [ ] `OPEN-197` [⬜ NOT VERIFIED] Run controlled active scan against staging.  
  **Closure evidence:** Authorized DAST evidence + retest
- [ ] `OPEN-198` [⬜ NOT VERIFIED] Test XSS.  
  **Closure evidence:** Authorized DAST evidence + retest
- [ ] `OPEN-199` [⬜ NOT VERIFIED] Test SQL/injection.  
  **Closure evidence:** Authorized DAST evidence + retest
- [ ] `OPEN-200` [⬜ NOT VERIFIED] Test IDOR/BOLA.  
  **Closure evidence:** Authorized DAST evidence + retest
- [ ] `OPEN-201` [⬜ NOT VERIFIED] Test privilege escalation.  
  **Closure evidence:** Authorized DAST evidence + retest
- [ ] `OPEN-202` [⬜ NOT VERIFIED] Test CSRF.  
  **Closure evidence:** Authorized DAST evidence + retest
- [ ] `OPEN-203` [⬜ NOT VERIFIED] Test CORS.  
  **Closure evidence:** Authorized DAST evidence + retest
- [ ] `OPEN-204` [⬜ NOT VERIFIED] Test open redirects.  
  **Closure evidence:** Authorized DAST evidence + retest
- [ ] `OPEN-205` [⬜ NOT VERIFIED] Test SSRF.  
  **Closure evidence:** Authorized DAST evidence + retest
- [ ] `OPEN-206` [⬜ NOT VERIFIED] Test rate limits.  
  **Closure evidence:** Authorized DAST evidence + retest
- [ ] `OPEN-207` [⬜ NOT VERIFIED] Test malformed/oversized requests.  
  **Closure evidence:** Authorized DAST evidence + retest
- [ ] `OPEN-208` [⬜ NOT VERIFIED] Test HTTP method confusion.  
  **Closure evidence:** Authorized DAST evidence + retest
- [ ] `OPEN-209` [⬜ NOT VERIFIED] Test duplicate parameters.  
  **Closure evidence:** Authorized DAST evidence + retest
- [ ] `OPEN-210` [⬜ NOT VERIFIED] Test content-type confusion.  
  **Closure evidence:** Authorized DAST evidence + retest
- [ ] `OPEN-211` [⬜ NOT VERIFIED] Test authentication expiration/revocation.  
  **Closure evidence:** Authorized DAST evidence + retest
- [ ] `OPEN-212` [⬜ NOT VERIFIED] Test account A ↔ account B isolation.  
  **Closure evidence:** Authorized DAST evidence + retest
- [ ] `OPEN-213` [⬜ NOT VERIFIED] Test admin ↔ user isolation.  
  **Closure evidence:** Authorized DAST evidence + retest
- [ ] `OPEN-214` [⬜ NOT VERIFIED] Test cache leakage.  
  **Closure evidence:** Authorized DAST evidence + retest
- [ ] `OPEN-215` [⬜ NOT VERIFIED] Test service-worker caching.  
  **Closure evidence:** Authorized DAST evidence + retest
- [ ] `OPEN-216` [⬜ NOT VERIFIED] Test Web Push abuse.  
  **Closure evidence:** Authorized DAST evidence + retest
- [ ] `OPEN-217` [⬜ NOT VERIFIED] Verify no unexpected endpoints discovered by crawler/content discovery.  
  **Closure evidence:** Authorized DAST evidence + retest
- [ ] `OPEN-218` [⬜ NOT VERIFIED] Verify robots/sitemap/public JS do not reveal secrets.  
  **Closure evidence:** Authorized DAST evidence + retest

### Section 52 — Monitoring & Alerting

- [ ] `OPEN-249` [⬜ NOT VERIFIED] Production uptime monitoring.  
  **Closure evidence:** Documented runbook/model plus exercised evidence
- [ ] `OPEN-250` [⬜ NOT VERIFIED] Error-rate monitoring.  
  **Closure evidence:** Documented runbook/model plus exercised evidence
- [ ] `OPEN-251` [⬜ NOT VERIFIED] Authentication anomaly monitoring where feasible.  
  **Closure evidence:** Documented runbook/model plus exercised evidence
- [ ] `OPEN-252` [⬜ NOT VERIFIED] Admin-action monitoring.  
  **Closure evidence:** Documented runbook/model plus exercised evidence
- [ ] `OPEN-253` [⬜ NOT VERIFIED] Unexpected database usage/cost monitoring.  
  **Closure evidence:** Documented runbook/model plus exercised evidence
- [ ] `OPEN-254` [⬜ NOT VERIFIED] Push-volume anomaly monitoring.  
  **Closure evidence:** Documented runbook/model plus exercised evidence
- [ ] `OPEN-255` [⬜ NOT VERIFIED] Third-party API cost anomaly monitoring.  
  **Closure evidence:** Documented runbook/model plus exercised evidence
- [ ] `OPEN-256` [⬜ NOT VERIFIED] CI/release failure monitoring.  
  **Closure evidence:** Documented runbook/model plus exercised evidence
- [ ] `OPEN-257` [⬜ NOT VERIFIED] Dependency vulnerability alerting.  
  **Closure evidence:** Documented runbook/model plus exercised evidence
- [ ] `OPEN-258` [⬜ NOT VERIFIED] Domain/TLS certificate monitoring.  
  **Closure evidence:** Documented runbook/model plus exercised evidence
- [ ] `OPEN-259` [⬜ NOT VERIFIED] Supabase security/advisor alerts reviewed.  
  **Closure evidence:** Documented runbook/model plus exercised evidence
- [ ] `OPEN-260` [⬜ NOT VERIFIED] Alerts have an owner and escalation path.  
  **Closure evidence:** Documented runbook/model plus exercised evidence
- [ ] `OPEN-261` [⬜ NOT VERIFIED] Alert thresholds are tested.  
  **Closure evidence:** Documented runbook/model plus exercised evidence

### Section 53 — Incident Response

- [ ] `OPEN-262` [⬜ NOT VERIFIED] Document how to revoke Supabase server/service credentials.  
  **Closure evidence:** Documented runbook/model plus exercised evidence
- [ ] `OPEN-263` [⬜ NOT VERIFIED] Document how to rotate VAPID keys and operational consequences.  
  **Closure evidence:** Documented runbook/model plus exercised evidence
- [ ] `OPEN-264` [⬜ NOT VERIFIED] Document how to revoke/rotate cron credentials.  
  **Closure evidence:** Documented runbook/model plus exercised evidence
- [ ] `OPEN-265` [⬜ NOT VERIFIED] Document how to rotate third-party API credentials.  
  **Closure evidence:** Documented runbook/model plus exercised evidence
- [ ] `OPEN-266` [⬜ NOT VERIFIED] Document how to disable compromised admin access.  
  **Closure evidence:** Documented runbook/model plus exercised evidence
- [ ] `OPEN-267` [⬜ NOT VERIFIED] Document emergency web rollback.  
  **Closure evidence:** Documented runbook/model plus exercised evidence
- [ ] `OPEN-268` [⬜ NOT VERIFIED] Document emergency Android publication/update procedure.  
  **Closure evidence:** Documented runbook/model plus exercised evidence
- [ ] `OPEN-269` [⬜ NOT VERIFIED] Document signing-key compromise response.  
  **Closure evidence:** Documented runbook/model plus exercised evidence
- [ ] `OPEN-270` [⬜ NOT VERIFIED] Document database data-exposure response.  
  **Closure evidence:** Documented runbook/model plus exercised evidence
- [ ] `OPEN-271` [⬜ NOT VERIFIED] Document malicious dependency/supply-chain response.  
  **Closure evidence:** Documented runbook/model plus exercised evidence
- [ ] `OPEN-272` [⬜ NOT VERIFIED] Maintain contact/owner list.  
  **Closure evidence:** Documented runbook/model plus exercised evidence
- [ ] `OPEN-273` [⬜ NOT VERIFIED] Preserve useful logs/evidence without storing excess private data.  
  **Closure evidence:** Documented runbook/model plus exercised evidence
- [ ] `OPEN-274` [⬜ NOT VERIFIED] Conduct at least a lightweight tabletop exercise before launch.  
  **Closure evidence:** Documented runbook/model plus exercised evidence

### Section 54 — Backup / Restore

- [ ] `OPEN-275` [⬜ NOT VERIFIED] Verify production database backup strategy.  
  **Closure evidence:** Documented runbook/model plus exercised evidence
- [ ] `OPEN-276` [⬜ NOT VERIFIED] Verify backup retention.  
  **Closure evidence:** Documented runbook/model plus exercised evidence
- [ ] `OPEN-277` [⬜ NOT VERIFIED] Verify backup access controls.  
  **Closure evidence:** Documented runbook/model plus exercised evidence
- [ ] `OPEN-278` [⬜ NOT VERIFIED] Verify backup encryption/provider controls.  
  **Closure evidence:** Documented runbook/model plus exercised evidence
- [ ] `OPEN-279` [⬜ NOT VERIFIED] Perform an actual restore test into isolated environment.  
  **Closure evidence:** Documented runbook/model plus exercised evidence
- [ ] `OPEN-280` [⬜ NOT VERIFIED] Verify restore preserves required RLS/policies/functions.  
  **Closure evidence:** Documented runbook/model plus exercised evidence
- [ ] `OPEN-281` [⬜ NOT VERIFIED] Verify migrations can rebuild expected schema.  
  **Closure evidence:** Documented runbook/model plus exercised evidence
- [ ] `OPEN-282` [⬜ NOT VERIFIED] Verify critical configuration is recoverable.  
  **Closure evidence:** Documented runbook/model plus exercised evidence
- [ ] `OPEN-283` [⬜ NOT VERIFIED] Verify permanent Android signing key has secure independent backup.  
  **Closure evidence:** Documented runbook/model plus exercised evidence
- [ ] `OPEN-284` [⬜ NOT VERIFIED] Verify recovery documentation does not contain secret values.  
  **Closure evidence:** Documented runbook/model plus exercised evidence
- [ ] `OPEN-285` [⬜ NOT VERIFIED] Establish RPO/RTO appropriate to the application.  
  **Closure evidence:** Documented runbook/model plus exercised evidence

### Section 58 — Production Deployment Verification

- [ ] `OPEN-293` [⬜ NOT VERIFIED] Confirm production environment variables are correct without printing values.  
  **Closure evidence:** Exact-head release evidence
- [ ] `OPEN-294` [⬜ NOT VERIFIED] Confirm account A/B isolation with safe test accounts.  
  **Closure evidence:** Exact-head release evidence
- [ ] `OPEN-295` [⬜ NOT VERIFIED] Confirm Web Push endpoint authorization.  
  **Closure evidence:** Exact-head release evidence
- [ ] `OPEN-296` [⬜ NOT VERIFIED] Confirm public Supabase access matches intended RLS.  
  **Closure evidence:** Exact-head release evidence

**Wave 5 exit:** [ ] all Wave 5 controls have evidence and have been reclassified PASS/N/A under the original checklist rules.

## Wave 6 — Exact-head re-audit and launch decision (22 controls)

### Section 0 — Audit Rules and Release Gate

- [ ] `OPEN-001` [❌ FAIL] No unresolved authentication, authorization, RLS, admin-access, secrets, signing, injection, SSRF, service-role, native-bridge, or release-integrity weakness regardless of nominal severity.  
  **Closure evidence:** Exact-head release evidence
- [ ] `OPEN-002` [⬜ NOT VERIFIED] Every externally reachable route/API is represented in the audit coverage ledger.  
  **Closure evidence:** Exact-head release evidence
- [ ] `OPEN-003` [❌ FAIL] All required security regression tests pass at the exact release commit.  
  **Closure evidence:** Exact-head release evidence
- [ ] `OPEN-004` [❌ FAIL] All security scans are run against the exact release commit/artifact.  
  **Closure evidence:** Exact-head release evidence
- [ ] `OPEN-005` [❌ FAIL] Release APK/AAB is generated from the exact approved source and verified after signing.  
  **Closure evidence:** Exact-head release evidence
- [ ] `OPEN-006` [❌ FAIL] Final production smoke/security tests pass after deployment.  
  **Closure evidence:** Exact-head release evidence
- [ ] `OPEN-007` [⬜ NOT VERIFIED] Any accepted residual risk is documented with owner, justification, compensating control, and review date.  
  **Closure evidence:** Exact-head release evidence

### Section 57 — Exact-Head Verification

- [ ] `OPEN-286` [⬜ NOT VERIFIED] If head changed, audit the diff and re-run affected security gates.  
  **Closure evidence:** Exact-head release evidence
- [ ] `OPEN-287` [❌ FAIL] Release APK/AAB build passes.  
  **Closure evidence:** Exact-head release evidence
- [ ] `OPEN-288` [❌ FAIL] SAST passes/no launch-blocking findings.  
  **Closure evidence:** Exact-head release evidence
- [ ] `OPEN-289` [⬜ NOT VERIFIED] SCA passes/no launch-blocking findings.  
  **Closure evidence:** Exact-head release evidence
- [ ] `OPEN-290` [❌ FAIL] Secret scan passes.  
  **Closure evidence:** Exact-head release evidence
- [ ] `OPEN-291` [❌ FAIL] DAST/manual penetration test has no unresolved Critical/High.  
  **Closure evidence:** Exact-head release evidence
- [ ] `OPEN-292` [⬜ NOT VERIFIED] Final artifact hashes recorded.  
  **Closure evidence:** Exact-head release evidence

### Section 62 — Final Launch Decision

- [ ] `OPEN-317` [❌ FAIL] Coverage ledger is complete.  
  **Closure evidence:** Exact-head release evidence
- [ ] `OPEN-318` [❌ FAIL] No unresolved auth/authz/RLS/admin/secrets/signing/injection/SSRF/native-bridge/release-integrity defects.  
  **Closure evidence:** Exact-head release evidence
- [ ] `OPEN-319` [❌ FAIL] Exact-head tests/scans are green.  
  **Closure evidence:** Exact-head release evidence
- [ ] `OPEN-320` [❌ FAIL] Web deployment is verified.  
  **Closure evidence:** Exact-head release evidence
- [ ] `OPEN-321` [❌ FAIL] Signed Android RC is verified.  
  **Closure evidence:** Exact-head release evidence
- [ ] `OPEN-322` [❌ FAIL] Physical-device security QA is complete.  
  **Closure evidence:** Exact-head release evidence
- [ ] `OPEN-323` [❌ FAIL] Monitoring and incident-response controls are ready.  
  **Closure evidence:** Exact-head release evidence
- [ ] `OPEN-324` [❌ FAIL] Residual risks are documented and explicitly accepted.  
  **Closure evidence:** Exact-head release evidence

**Wave 6 exit:** [ ] all Wave 6 controls have evidence and have been reclassified PASS/N/A under the original checklist rules.

## Remote / Production approval gates

- [ ] User explicitly approves Production Supabase migration/history changes before any execution.
- [ ] User explicitly approves Supabase Auth setting changes before any execution.
- [ ] User explicitly approves GitHub ruleset changes before any execution.
- [ ] User explicitly approves use of Android Production signing environment.
- [ ] User explicitly approves public Android tag/release publication.
- [ ] User explicitly approves merge to `main`.
- [ ] Final 990-item re-audit is complete before launch sign-off.
