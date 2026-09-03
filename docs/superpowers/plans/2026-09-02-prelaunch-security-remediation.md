# Prayerapp Pre-Launch Security Remediation — Binding Implementation Plan

**Plan date:** 2026-09-02  
**Repository:** `ahmedmohameda7222-ship-it/Prayerapp`  
**Binding baseline:** `b18430b360313148fc76baaeda9d96844ed508a5`  
**Production Supabase:** `dbqbzvkleqzbgufllgca`  
**Production web origin:** `https://donaumoschee.vercel.app`  
**Current public Android release:** `android-v1.0.3` → `a8a1adc929f9fc9eda094693f5cfa6202735e4ca`  
**Audit state to close:** 54 FAIL + 270 NOT VERIFIED = **324 open controls**  
**Objective:** reach a defensible **GO** state by converting every applicable open checklist item to PASS, without weakening functionality/tests or hiding residual risk.

## 1. Execution authority and non-negotiable constraints

This plan authorizes **planning only** until the user separately approves implementation.

When implementation is approved:

- Start from the exact current `origin/main`; if it has moved from `b18430b360313148fc76baaeda9d96844ed508a5`, stop and re-baseline the security delta before editing.
- Use one isolated branch: `security/prelaunch-remediation-2026-09-02`.
- Store this plan in-repo at `docs/superpowers/plans/2026-09-02-prelaunch-security-remediation.md`.
- Create one Draft PR after the first meaningful RED→GREEN commit.
- Do not merge without explicit user approval.
- Do not mutate Production Supabase, auth settings, GitHub rulesets, signing environments, release tags, or public Android assets without a separate explicit production-change approval.
- Do not redesign UI, remove working features, weaken tests, reduce security gates, or make unrelated refactors.
- Every code fix uses TDD: reproduce/encode the security requirement first, observe RED, implement the minimum safe fix, observe GREEN, run broader regressions, then commit.
- A checklist item closes only with the evidence its wording requires. “Looks safe in source” is not a substitute for DAST, signed-artifact, device, restore, or operational evidence.

## 2. Architecture and sequencing decision

Use seven dependency-ordered waves. **Database convergence is first among mutable systems.** The signed Android RC and final DAST must not be treated as release evidence while the backend schema is known to differ from the audited source.

### Wave 0 — Evidence freeze, threat model and data classification

**Goal:** convert the remaining inventory/model assumptions into explicit security authority before changing behavior.

**Create**
- `docs/security/prelaunch/2026-09-02/baseline.md`
- `docs/security/threat-model.md`
- `docs/security/data-classification.md`
- `docs/security/attack-surface-inventory.md`
- `docs/security/security-evidence-index.md`

**Tasks**
1. Re-fetch `origin/main`, open PRs and security branches. If `main` moved, compare from `b18430b360313148fc76baaeda9d96844ed508a5` and preserve all compatible work.
2. Record exact repo SHA, Vercel deployment ID/SHA, Supabase project ref, production migration history, auth configuration, Android version metadata, release fingerprint and current public release.
3. Complete the 21 threat-model controls: trust boundaries, attacker capabilities, privileged assets, abuse cases, Web↔Supabase↔Push↔Android flows, signing/release supply chain and recovery paths.
4. Complete the 16 sensitive-data controls: credentials, auth tokens, push endpoint/key material, account identifiers, admin data, native authority credential, logs, release/signing material and retention.
5. Freeze the 324-row open-control matrix as the closure ledger.

**Gate W0:** no implementation starts until the threat/data models identify an owner and required evidence for every open control.

---

### Wave 1 — Supabase convergence, auth/admin auditability and native backend integrity

This wave closes the highest-confidence production inconsistency first.

#### Task 1.1 — Build a migration-equivalence ledger before touching Production

Production history currently stops at `20260822201832`, while the repository continues with:

- `supabase/migrations/20260823104600_native_delivery_receipts.sql`
- `supabase/migrations/20260826160500_friday_v2_khutbahs.sql`
- `supabase/migrations/20260831080500_security_rate_limits.sql`
- `supabase/migrations/20260901223000_atomic_push_account_registration.sql`

Some later objects are already live while the native-delivery-receipt schema is not. Therefore **never blindly replay all “pending” migrations.**

**Create**
- `docs/security/prelaunch/2026-09-02/supabase-migration-equivalence.md`
- `scripts/security/verify-production-schema.sql`

For every post-`20260822201832` migration:
- compare tables, columns, constraints, indexes, policies, grants, functions, `search_path`, function EXECUTE privileges and cron/Vault dependencies;
- classify it as `exactly applied`, `not applied`, or `partially applied`;
- only use migration-history repair for a version after proving exact semantic equivalence.

**RED evidence:** schema-verification script must currently fail on missing `native_prayer_delivery_receipts`, `receipt_v2`, and `account_generation`.

#### Task 1.2 — Reconcile native-delivery v2 safely

**Existing authority**
- `supabase/migrations/20260823104600_native_delivery_receipts.sql`
- `app/api/android/native-authority/enroll/route.ts`
- `app/api/android/native-authority/heartbeat/route.ts`
- `app/api/android/native-authority/receipt/route.ts`
- `app/api/cron/prayer-reminders/route.ts`
- `lib/__tests__/android-native-authority-generation.test.ts`

**Create only if production drift requires a corrective migration rather than a clean application of the existing migration**
- `supabase/migrations/20260902170000_prelaunch_schema_reconciliation.sql`

The reconciliation must be idempotent and must preserve existing production rows. Required end state:
- `native_prayer_installations.receipt_v2 boolean not null default false`
- `native_prayer_installations.account_generation integer not null default 0` with nonnegative constraint
- `native_prayer_delivery_receipts` exists with expected PK/FKs/checks/indexes
- RLS enabled
- no `anon`/`authenticated` direct privileges
- `service_role` is the only direct application role with required access
- all current native-authority APIs and cron selects/deletes succeed against the schema.

**Tests first**
- extend `lib/__tests__/android-native-authority-generation.test.ts`
- add `lib/__tests__/supabase-production-schema-contract.test.ts` if the existing test harness supports source/migration contract assertions
- extend `.github/workflows/ci.yml` clean-bootstrap SQL assertions for the receipt table and new columns.

**Local GREEN commands**
```bash
supabase start
supabase db reset --local --no-seed
npm ci
npm test
npm run lint
npm run build
```

**Production gate:** require explicit approval before applying/repairing migrations. Before that change, capture backup/recovery evidence and the exact SQL diff. Afterward verify Supabase logs no longer show the known recurring receipt-table `404` / native-installation `400` pattern.

#### Task 1.3 — Repair migration history only where equivalence is proven

Use Supabase migration-history repair only for versions proven exactly present. Do not mark a partial migration as applied.

Acceptance:
- remote migration history is truthful;
- a fresh local reset recreates the intended schema;
- remote schema diff contains no unexplained security-relevant drift.

#### Task 1.4 — Enable leaked-password protection

This is a Supabase Auth project setting, not a code-only checkbox.

Before changing it:
- encode login/signup/reset regression tests where practical;
- verify normal login, password reset and existing sessions;
- document expected user-facing behavior for compromised-password rejection.

**Production gate:** require explicit approval, then enable leaked-password protection and rerun Supabase Security Advisor. The launch-blocking warning must disappear.

#### Task 1.5 — Add durable admin audit logging

**Create**
- `lib/security/admin-audit.ts`
- `lib/__tests__/admin-audit.test.ts`
- `supabase/migrations/20260902171000_admin_audit_hardening.sql`

**Modify every privileged mutation surface**
- `app/admin/announcements/actions.ts`
- `app/admin/donations/actions.ts`
- `app/admin/events/actions.ts`
- `app/admin/jumuah/actions.ts`
- `app/admin/jumuah/khutbah-actions.ts`
- `app/admin/prayer-times/actions.ts`
- `app/admin/ramadan/actions.ts`
- `app/admin/settings/actions.ts`

Audit events must contain only safe metadata:
- verified actor user ID and normalized verified email;
- action name;
- entity type and identifier;
- outcome;
- timestamp;
- bounded metadata needed for investigation;
- no bearer tokens, passwords, service-role credentials, VAPID private material, native credentials or full sensitive request payloads.

Harden `public.audit_logs` as append-oriented, deny public/client writes, and restrict reads appropriately. Prefer a service-role-only `SECURITY DEFINER` append function with fixed `search_path` if that creates a clearer privilege boundary than direct table INSERT.

For high-impact publish/delete/settings operations, the implementation must define and test the audit-write failure mode. Do not silently claim success when the action cannot produce the checklist-required audit evidence.

**RED→GREEN test cases**
- unauthorized caller cannot create an audit record;
- authenticated non-admin cannot create an admin audit record;
- successful admin create/update/publish/delete produces exactly the expected durable event;
- secret-like values are excluded/redacted;
- overlong metadata is rejected or bounded;
- failed mutation is distinguishable from successful mutation.

#### Task 1.6 — Re-verify native authority fallback after schema convergence

Extend tests around:
- device/account association;
- concurrent devices;
- account-generation changes;
- stale/revoked authority;
- receipt v2;
- Web Push fail-open fallback;
- no permanent suppression from stale readiness.

**Gate W1:** production-equivalent schema is coherent locally; after separately approved Production convergence, live schema/history/advisor/log evidence is clean before Android RC work is accepted as release evidence.

---

### Wave 2 — Web/API input validation, CSP/XSS and abuse hardening

#### Task 2.1 — Centralize server-side admin input validation

**Create**
- `lib/security/admin-input.ts`
- `lib/__tests__/admin-input.test.ts`

**Modify**
- all eight admin action files listed in Task 1.5.

Validation helpers must enforce, per field semantics:
- required/optional state;
- trimming/canonicalization;
- maximum and minimum string length;
- finite numbers only;
- explicit lower/upper numeric bounds;
- enums/booleans;
- strict dates/times;
- URL scheme/host constraints where URLs are accepted;
- bounded arrays/counts where applicable.

Do not invent arbitrary limits. Derive limits from current product semantics, DB column/check constraints and existing production-sized content, then encode boundary tests at `max-1`, `max`, and `max+1`.

**RED tests**
- oversized localized title/body/note variants;
- `Infinity`, `-Infinity`, `NaN`, extreme integer/decimal inputs;
- malformed date/time;
- invalid enum/URL;
- duplicate/ambiguous fields where relevant.

#### Task 2.2 — Replace unsafe-inline CSP with a tested nonce/hash design

**Create**
- `lib/security/csp.ts`
- `lib/__tests__/csp.test.ts`
- `proxy.ts` if the validated Next.js 16 nonce mechanism requires a request-level proxy.

**Modify**
- `next.config.ts`
- root layout/script integration only where required by the framework.

Requirements:
- remove `script-src 'unsafe-inline'`;
- remove `style-src 'unsafe-inline'` rather than silently retaining it;
- unique cryptographically strong nonce per document request if nonce strategy is used;
- preserve `object-src 'none'`, `base-uri`, `form-action`, `frame-ancestors`, HSTS, nosniff, Referrer-Policy and Permissions-Policy;
- no wildcard source expansion;
- keep service-worker CSP appropriately narrow;
- do not break hydration, localization, PWA installability, admin pages, account pages or static/media loading.

Because nonce CSP may affect Next.js caching/rendering, measure and document the behavior. If current Next.js cannot safely nonce a specific inline style path, refactor the app-owned inline use or use an exact hash. Do **not** mark the checklist PASS while `unsafe-inline` remains.

**RED→GREEN**
- unit/contract test initially detects `unsafe-inline`;
- production build succeeds;
- rendered HTML contains only nonce/hash-authorized inline execution;
- live response CSP contains no `unsafe-inline`;
- browser smoke has no CSP violations required for normal app behavior.

#### Task 2.3 — Close remaining active API attack tests

Against a controlled deployment, test:
- SQL/command/template/header/log/path injection;
- malformed/oversized JSON;
- prototype-pollution style keys;
- duplicate parameters;
- CSRF/cross-origin state changes;
- IDOR/BOLA/BFLA;
- bearer-token manipulation;
- return/open redirects;
- rate-limit burst and automation behavior;
- push-test/subscription abuse.

Every confirmed defect returns to RED→GREEN code work before proceeding.

#### Task 2.4 — Identify the Node `url.parse` warning owner

Trace the Vercel runtime warning to app code or dependency. If app-owned, replace it with WHATWG `URL`; if dependency-owned, update to a safe compatible version when available and rerun all tests. This INFO item does not override higher release gates.

**Gate W2:** all source-level validation/CSP regressions green and controlled black-box checks show no unresolved exploit path.

---

### Wave 3 — CI, SAST, secret scanning, SBOM and repository governance

#### Task 3.1 — Add CodeQL

**Create**
- `.github/workflows/codeql.yml`

Languages: JavaScript/TypeScript and Java where supported by the project.

Rules:
- read-only/minimum permissions;
- immutable SHA-pinned Actions;
- PR and protected-main coverage;
- no Production/signing secrets;
- CodeQL result becomes a required security gate once stable.

#### Task 3.2 — Add a dedicated full-history secret scan

**Create**
- `.github/workflows/security-scan.yml`
- `.gitleaks.toml` or equivalent only if a narrowly justified scanner configuration is required.

Requirements:
- scan full Git history, not only the PR diff;
- scanner/action/binary is pinned immutably;
- no blanket allowlist that hides real credentials;
- any real historical secret is rotated, not merely ignored;
- sanitized evidence is stored without exposing the secret itself.

#### Task 3.3 — Generate SBOMs

**Create/modify**
- `.github/workflows/security-scan.yml`
- `android-twa/app/build.gradle` only if a pinned Gradle SBOM plugin is required.

Generate:
- npm CycloneDX/SPDX SBOM from the lockfile/resolved dependency tree;
- Android/Gradle CycloneDX/SPDX SBOM including resolved transitive dependencies.

Release-candidate CI must upload both SBOMs and fail if generation fails.

#### Task 3.4 — Strengthen repository review policy

Current main ruleset has strict CI/no bypass but requires zero approving reviews.

To make the checklist PASS:
- require at least one approving trusted human reviewer;
- retain required-thread resolution, strict checks, no force-push/deletion and no bypass;
- ensure a second trusted reviewer exists so the rule does not make the repository impossible to maintain.

**Remote-config gate:** do not alter the ruleset without explicit approval.

#### Task 3.5 — Preserve supply-chain isolation

Re-verify after workflow edits:
- all third-party Actions pinned by full commit SHA;
- PR jobs have no signing/Production secrets;
- signing jobs do not execute untrusted PR source;
- artifacts carry exact source SHA and SHA-256;
- temporary signing material is deleted;
- no `pull_request_target` trust inversion.

**Gate W3:** CodeQL, full-history secret scan, npm/Gradle SBOM generation, existing npm audit, lint/tests/build and Android CI all green on the same candidate SHA.

---

### Wave 4 — Android hardened release candidate

Do this only after Waves 1–3 are green.

#### Task 4.1 — Bump Android release identity

**Modify**
- `android-twa/twa-manifest.json`

If no intervening Android release exists at execution time:
- `versionCode`: `6` → `7`
- `versionName`: `1.0.3` → `1.0.4`

If an intervening release exists, derive the next strictly higher production version instead.

Update any exact-version contract tests as required. Do not change package ID or permanent signing fingerprint.

#### Task 4.2 — Add credential-migration regression coverage

**Modify/add**
- Android instrumentation tests under `android-twa/app/src/androidTest/java/de/donaumoschee/app/storage/`
- current native-authority tests as appropriate.

Prove upgrade behavior from v1.0.3-style plaintext private SharedPreferences:
- legacy `credential` is read once;
- encrypted Android Keystore AES-GCM representation is persisted;
- legacy plaintext key is removed;
- credential remains stable across process restart;
- corruption/missing Keystore fails safely;
- account-generation/revocation behavior remains correct.

#### Task 4.3 — Build exact-head unsigned candidate

Use existing `.github/workflows/android-twa.yml`.

Required green evidence:
- release unit tests;
- release lint;
- unsigned APK and AAB;
- API 23 instrumentation;
- API 37 instrumentation;
- exact source metadata and SHA-256.

#### Task 4.4 — Static-analyze the exact candidate

Run against the actual candidate:
- secret/string scan;
- MobSF or equivalent Android static analysis;
- JADX/apktool/aapt/apksigner inspection;
- merged manifest review;
- exported components;
- permissions;
- `debuggable=false`;
- cleartext disabled;
- FileProvider paths;
- deep/app links;
- package/version/min/target SDK;
- no unintended server/admin/signing secrets.

Any actionable finding returns to TDD implementation.

#### Task 4.5 — Sign in the isolated protected workflow

Use existing isolated signing/release architecture. Signing requires explicit approval and exact successful upstream run/SHA.

After signing:
- verify APK with `apksigner`;
- verify AAB with `jarsigner`/certificate tooling;
- verify permanent certificate SHA-256;
- verify package/version/SDK;
- generate signed APK/AAB SHA-256;
- bind artifacts to exact source SHA.

#### Task 4.6 — Physical-device release-candidate QA

Install **the exact signed RC**, not a debug APK.

Minimum evidence set:
- upgrade from public v1.0.3 without data/security regression;
- clean install;
- login/logout/account switch;
- TWA verified origin/app links;
- notification permission allow/deny;
- exact-alarm allow/deny;
- Adhan + reminder delivery;
- native enroll/heartbeat/receipt/revoke;
- Web Push fallback;
- multiple devices/account-generation behavior;
- reboot;
- time/timezone change;
- offline/reconnect;
- cache integrity;
- no plaintext native credential in accessible app-private preference data during authorized test inspection;
- no unexpected exported component behavior.

**Gate W4:** exact signed RC is fully verified and still unpublished.

---

### Wave 5 — DAST, production controls and operational readiness

#### Task 5.1 — Authorized DAST / manual penetration pass

Prefer a production-equivalent controlled deployment for invasive tests. Use Production only for low-impact checks explicitly approved.

Cover all 27 DAST controls:
- crawl/public surface;
- authenticated/account surface;
- admin surface;
- auth/session manipulation;
- IDOR/BOLA/BFLA;
- CSRF;
- stored/reflected/DOM XSS;
- SQL/template/command/header/path injection;
- SSRF/open redirect;
- malformed bodies/parameter pollution;
- rate-limit/DoS-safe abuse checks;
- cache/header/CORS behavior.

Use Burp/ZAP or equivalent with saved evidence. Critical/High findings block immediately; every lower finding that maps to a checklist requirement must also be fixed or explicitly handled before “all PASS” can be claimed.

#### Task 5.2 — Production/provider access controls

Evidence, without exposing credentials:
- GitHub access/MFA and trusted reviewers;
- Supabase project access/MFA;
- Vercel project/team access/MFA;
- protected Production/signing environments;
- least-privilege membership;
- preview deployment security;
- DNS/domain ownership and no dangling subdomains.

#### Task 5.3 — Monitoring and alerting

**Create**
- `docs/security/monitoring-alerting.md`

Define and exercise alerts for:
- auth anomaly/failure spikes;
- admin auth failures;
- admin mutations and audit-log failures;
- cron auth/5xx;
- native-authority 4xx/5xx;
- receipt ingestion/fallback anomalies;
- push delivery failures;
- Supabase advisor/security changes;
- Vercel deployment/runtime failures;
- Android release/download verification failure.

Every alert needs threshold, owner, escalation path and test evidence.

#### Task 5.4 — Incident response

**Create**
- `docs/security/incident-response.md`

Run a tabletop for:
- service-role leak;
- admin account takeover;
- VAPID/private credential leak;
- Android signing-key exposure/loss;
- malicious/bad Android release;
- Supabase corruption/data loss;
- compromised third-party dependency;
- push abuse.

Record containment, rotation/revocation, recovery and communication steps.

#### Task 5.5 — Backup/restore drill

**Create**
- `docs/security/backup-restore-runbook.md`
- `docs/security/prelaunch/2026-09-02/restore-drill-evidence.md`

Define RPO/RTO and perform a real restore into an isolated non-production project/database. Verify:
- critical tables/data;
- auth-linked foreign keys where applicable;
- RLS/policies/grants;
- SECURITY DEFINER functions/search paths;
- cron/Vault dependencies are safely reconstructed;
- migration history;
- application can read restored public data;
- no Production mutation occurs during the drill.

#### Task 5.6 — Privacy/Data Safety reconciliation

**Create**
- `docs/security/android-privacy-data-safety.md`

Map actual runtime collection/storage/transmission to Play Data Safety/privacy disclosures. Verify logs do not collect unnecessary sensitive data.

#### Task 5.7 — Production smoke after approved deployment

After code is merged/deployed only with explicit approval:
- exact deployment SHA;
- security headers/no `unsafe-inline`;
- health;
- unauthorized admin/cron behavior;
- Supabase schema/advisor;
- service worker;
- asset links;
- native backend;
- monitoring receives test events.

**Gate W5:** DAST clear, restore drill successful, monitoring/IR/privacy/provider controls evidenced.

---

### Wave 6 — Exact-head re-audit and launch decision

#### Task 6.1 — Freeze the release candidate

Record together:
- Git commit SHA;
- Vercel deployment ID/SHA;
- production Supabase migration list and schema-verification hash/output;
- Supabase advisor status;
- signed APK SHA-256;
- signed AAB SHA-256;
- Android package/version/SDK;
- signing certificate SHA-256;
- SBOM hashes;
- CodeQL/secret/SCA/DAST run IDs;
- physical-device evidence;
- restore/monitoring/IR evidence.

#### Task 6.2 — Re-run the same 990-item checklist

Do not create a smaller “security checklist.” Reuse the original 990 controls.

Target:
- all applicable controls PASS;
- only genuinely non-applicable controls may remain N/A with written rationale;
- **zero FAIL**;
- **zero mandatory NOT VERIFIED**;
- no unresolved Critical/High;
- no unresolved auth/authz/RLS/admin/secrets/signing/injection/SSRF/native-bridge/release-integrity defect.

#### Task 6.3 — Final GO/NO-GO

GO is allowed only when:
1. exact-head CI/tests/builds/scans are green;
2. Production Supabase matches intended source and migration history is truthful;
3. leaked-password protection/advisor gate is clean;
4. CSP/input/audit fixes are live and verified;
5. signed Android RC is bound to the approved source and passes static + physical-device QA;
6. DAST has no unresolved launch-blocking finding;
7. monitoring/IR/restore/provider controls are evidenced;
8. the 990-control closure ledger is complete;
9. residual risks, if any, are documented and explicitly accepted;
10. user explicitly approves merge/release.

## 3. Planned commit structure

Keep commits reviewable and security-focused:

1. `test(security): encode production schema and native receipt contracts`
2. `fix(supabase): reconcile native delivery v2 schema`
3. `test(security): encode admin audit requirements`
4. `feat(security): add durable admin audit events`
5. `test(security): add bounded admin input contracts`
6. `fix(security): enforce admin input bounds`
7. `test(security): require strict nonce/hash CSP`
8. `fix(security): remove unsafe-inline CSP`
9. `ci(security): add CodeQL secret scan and SBOM gates`
10. `chore(security): strengthen protected review policy` — remote config evidence, not merged code
11. `test(android): cover secure credential upgrade`
12. `chore(android): bump hardened release candidate version`
13. `docs(security): add monitoring IR backup privacy evidence`
14. `test(security): close exact-head prelaunch verification`

Do not squash away evidence while the PR is under security review; final merge method follows repository policy.

## 4. Verification command set

Run at each relevant checkpoint, and again at final candidate:

```bash
git diff --check origin/main...HEAD
npm ci
npm audit --omit=dev
npm run lint
npm test
npm run build

supabase start
supabase db reset --local --no-seed
# Run the security schema/privilege assertions.
supabase stop --no-backup

cd android-twa
./gradlew --no-daemon \
  :app:testDebugUnitTest \
  :app:testReleaseUnitTest \
  :app:lintDebug \
  :app:lintRelease \
  :app:assembleDebug \
  :app:assembleRelease \
  :app:bundleRelease \
  --stacktrace
```

Instrumentation remains the existing API 23 + API 37 CI matrix. The signed RC additionally requires platform signature/package checks, static-analysis evidence and physical-device evidence.

## 5. Stop conditions

Stop and return a blocker report instead of improvising if:
- `main` advances incompatibly;
- live schema cannot be mapped exactly to repository migrations;
- a migration-history repair would require falsely marking partial state as applied;
- a CSP design requires unacceptable functional breakage or undocumented weakening;
- an admin-audit design cannot reliably attribute the verified actor;
- a security scanner identifies a real leaked Production secret;
- signing fingerprint differs from the established permanent certificate;
- physical-device upgrade behavior risks user data/notification loss;
- any Critical/High is discovered;
- production mutation/release is needed but not explicitly approved.

## 6. Definition of done

This remediation is not complete because code was merged. It is complete only when the **same 990-item pre-launch checklist** is re-run against the exact release state and the user receives an evidence-backed final GO/NO-GO report.
