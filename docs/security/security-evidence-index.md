# Prayerapp Security Evidence Index

Date: 2026-09-03

## Current security candidate

- Approved baseline `main`: `b18430b360313148fc76baaeda9d96844ed508a5`
- Technical implementation head with authenticated DAST fix: `753b539675639ef46522964840382329404f30b9`
- Security branch: `security/prelaunch-remediation-2026-09-02`
- Pull request: #105, Draft, open, unmerged
- Machine-readable reassessment: `docs/security/prelaunch/2026-09-03/final-990-control-reassessment.json`
- Current reassessment: **822 PASS / 19 FAIL / 135 NOT VERIFIED / 14 N/A = 990**
- Open-control subset: **169 PASS / 19 FAIL / 135 NOT VERIFIED / 1 N/A = 324**

The approved source authority remains the original 324-control matrix and remediation plan. Controls requiring provider, authenticated-runtime, signed-artifact, physical-device, restore, alert-delivery or other dynamic evidence are not closed from source inspection alone.

## Exact-head verification on `753b539…`

### CI

- Run `33761020357`
- Job `100667063403`
- Result: **SUCCESS**
- Binding authority hashes: PASS
- `git diff --check`: PASS
- production dependency audit: 0 vulnerabilities
- lint: 0 errors / 11 warnings
- Vitest: **125 files / 561 tests PASS**
- clean Supabase bootstrap: PASS
- Production-schema semantic verifier against clean bootstrap: PASS
- schema reconciliation idempotence/data preservation: PASS
- incompatible partial-state rejection: PASS
- admin-audit idempotence/data preservation: PASS
- non-empty legacy audit fail-closed proof: PASS
- production build: PASS, 45/45 pages generated

### Security scanners and DAST

- Run `33761020425`
- Result: **SUCCESS**
- CodeQL JavaScript/TypeScript: PASS
- Gitleaks full-history scan: PASS
- OSV dependency scan: PASS
- SBOM/Android dependency evidence: PASS
- safe isolated exact-head runtime DAST: PASS
- safe deployed-Production DAST: PASS against the currently deployed old baseline
- authenticated local DAST job `100667064180`: PASS

Authenticated DAST used real local Supabase Auth identities/JWTs and no Production test users or Production data. It verified normal-user admin denial, account-A/account-B push ownership isolation, BOLA denial, cross-origin account deletion denial, invalid/deleted/logged-out session rejection, durable push rate limiting with `Retry-After`, and own-account deletion. This evidence directly closes `OPEN-200`, `OPEN-201`, `OPEN-206`, `OPEN-211`, `OPEN-212` and `OPEN-216`.

### Android exact-head unsigned RC

- Android workflow run `33761020400`: **SUCCESS**
- unsigned build/provenance job `100667377658`: PASS
- API 23 instrumentation job `100668595108`: PASS
- API 37 instrumentation job `100668595122`: PASS
- protected Production signing job `100667378655`: SKIPPED by workflow condition
- artifact `9895627733`, GitHub archive digest `sha256:4fec75b98cfae93b816b0c8f6e03ce1ff217012f5f4522f2ca6dba01c838fa91`
- APK SHA-256 `bf4e0de0b8bb0bff17bbf39538dfe8a8c8ba423c86d1658e59ac18742273eb47`
- AAB SHA-256 `b16bd14780960d74bc83f36e7150a4242147851cb9c2ff1d61cb17cc31ac8dea`
- source metadata SHA-256 `2d71c0d0e3921827e8b47dde1ed0a064da3ed55de47b567cd5de922251239a9e`
- package `de.donaumoschee.app`
- versionName `1.0.4`
- versionCode `7`
- compile/target/min SDK `37/37/23`
- source SHA `753b539675639ef46522964840382329404f30b9`

The candidate remains unsigned. The reviewed signing workflow requires `workflow_dispatch` plus the exact successful unsigned run ID, exact source SHA and confirmation token. The connected GitHub surface does not expose workflow dispatch; the signing workflow was not weakened or bypassed. Public Android remains `android-v1.0.3`.

## Production Supabase

Project: `dbqbzvkleqzbgufllgca`.

Authorized security migrations already applied:

- `20260902211847_prelaunch_schema_reconciliation`
- `20260902223939_admin_audit_hardening`

The read-only Production semantic verifier has passed after these migrations. Live reconciliation evidence included native receipt cleanup `404 → 204` and native-authority new-column lookup `400 → 200`.

Fresh semantic equivalence was also proven for all four historical repository migrations whose version identities remain absent from Production metadata:

- `20260823104600_native_delivery_receipts`
- `20260826160500_friday_v2_khutbahs`
- `20260831080500_security_rate_limits`
- `20260901223000_atomic_push_account_registration`

No historical SQL was replayed. Metadata-only history repair was authorized, but the connected Supabase management surface exposes no supported `repair` / `mark-applied` operation. Direct manual editing of Supabase migration metadata was deliberately not performed.

Supabase Security Advisor continues to show intentional server-only RLS/no-policy INFO notices plus `auth_leaked_password_protection` WARN. Leaked-password protection remains disabled by explicit accepted-risk direction and is not counted as technically fixed.

## Production web / Vercel

- Project `prj_I24w8AtVfUYdOp0rvbqKiJOZ2CcZ`
- Team `team_crjtVtp1aygpixnb7GHtnIdi`
- Current Production deployment `dpl_39vKk5vWuBkmQrDza3FQuSU2tr8j`
- Current Production Git SHA `b18430b360313148fc76baaeda9d96844ed508a5`

The nonce-CSP remediation is source-fixed and passes isolated exact-head DAST, but is **not deployed to Production**. The available Vercel deployment interface cannot bind a deployment to the reviewed Git SHA/ref, and no exact-head preview deployment exists to promote. An unbound/raw-file deployment was not attempted.

Current old Production has had `DEP0169 url.parse()` warnings observed on `/api/cron/prayer-reminders`; PA-SEC-007 therefore remains open pending exact remediation deployment and post-deploy retest.

## Repository governance

Active `Protect main` ruleset:

- strict required CI/Android status checks preserved;
- required review-thread resolution preserved;
- squash-only merge preserved;
- no bypass actors;
- `required_approving_review_count: 0` remains unchanged.

The requested change to one genuine independent approval is authorized but cannot be executed through the connected GitHub ruleset interface, which is read-only. No self-approval or fabricated review has been created.

## Recovery and monitoring evidence

- Clean local database reconstruction from migrations: verified.
- Migration idempotence/data-preservation/fail-closed recovery proofs: verified.
- Provider backup inventory, PITR status, retention and isolated provider restore drill: **NOT VERIFIED** because the current Supabase surface does not expose those capabilities.
- Destructive Production restore: not performed.
- GitHub/Vercel/Supabase detection/log visibility: verified for exercised signals.
- Provider automated alert-delivery and on-call paging delivery: **NOT VERIFIED**.

See `docs/security/backup-recovery.md`, `docs/security/monitoring-alerting.md`, `docs/security/incident-response.md` and `docs/security/residual-risks.md`.

## Production mutations performed

Only the two reviewed Supabase security migrations listed above were applied during this remediation.

No leaked-password-protection enablement, no historical migration SQL replay, no migration-metadata manipulation, no GitHub ruleset mutation, no Production Android signing/publication, no merge, no destructive Production restore, and no destructive/invasive Production DAST has been performed.

## Launch disposition

Current launch verdict: **NO-GO** until the remaining genuine external release/provider gates are satisfied or independently accepted under the approved release decision process. PR #105 remains Draft and unmerged.
