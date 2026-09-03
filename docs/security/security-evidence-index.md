# Prayerapp Security Evidence Index

Date: 2026-09-03

## Current security candidate

- Approved baseline `main`: `b18430b360313148fc76baaeda9d96844ed508a5`
- Final fully verified technical/security candidate: `48d3fdbac34b255dde7bf574dd0127d7513cc9d4`
- Security branch: `security/prelaunch-remediation-2026-09-02`
- Pull request: #105, Draft, open, unmerged
- Machine-readable reassessment: `docs/security/prelaunch/2026-09-03/final-990-control-reassessment.json`
- Current reassessment after the explicit single-maintainer governance decision: **822 PASS / 18 FAIL / 135 NOT VERIFIED / 15 N/A = 990**
- Open-control subset: **169 PASS / 18 FAIL / 135 NOT VERIFIED / 2 N/A = 324**

The approved source authority remains the original 324-control matrix and remediation plan. Controls requiring provider, authenticated-runtime, signed-artifact, physical-device, restore, alert-delivery or other dynamic evidence are not closed from source inspection alone. The second-reviewer control is N/A only because the sole owner explicitly changed its applicability under a single-maintainer governance model; it is not represented as a technical ruleset fix.

## Exact-head verification on `48d3fdba…`

### CI

- Run `33763676446`
- Result: **SUCCESS**
- Binding authority hashes: PASS
- `git diff --check`: PASS
- production dependency audit: PASS
- lint: PASS
- full Vitest suite: PASS
- clean Supabase bootstrap: PASS
- Production-schema semantic verifier against clean bootstrap: PASS
- schema reconciliation idempotence/data preservation: PASS
- incompatible partial-state rejection: PASS
- admin-audit idempotence/data preservation: PASS
- non-empty legacy audit fail-closed proof: PASS
- production build: PASS

### Security scanners and DAST

- Run `33763676284`
- Result: **SUCCESS**
- CodeQL JavaScript/TypeScript: PASS
- Gitleaks full-history scan: PASS
- OSV dependency scan: PASS
- SBOM/Android dependency evidence: PASS
- safe isolated exact-head runtime DAST: PASS
- safe deployed-Production DAST: PASS against the currently deployed old baseline
- authenticated local DAST: PASS

Authenticated DAST used real local Supabase Auth identities/JWTs and no Production test users or Production data. It verified normal-user admin denial, account-A/account-B push ownership isolation, BOLA denial, cross-origin account deletion denial, invalid/deleted/logged-out session rejection, durable push rate limiting with `Retry-After`, and own-account deletion. This evidence directly closes `OPEN-200`, `OPEN-201`, `OPEN-206`, `OPEN-211`, `OPEN-212` and `OPEN-216`.

### Android exact-head unsigned RC

- Android workflow run `33763676349`: **SUCCESS**
- unsigned build/provenance job `100676118728`: PASS
- API 23 instrumentation job `100677417329`: PASS
- API 37 instrumentation job `100677417288`: PASS
- protected Production signing job `100676120493`: SKIPPED by workflow condition
- artifact `9896718407`, GitHub archive digest `sha256:e69064e813161f740a0e39271901e53f0ab6e4f8de3071d80ffbba883157339b`
- APK SHA-256 `bf4e0de0b8bb0bff17bbf39538dfe8a8c8ba423c86d1658e59ac18742273eb47`
- AAB SHA-256 `b16bd14780960d74bc83f36e7150a4242147851cb9c2ff1d61cb17cc31ac8dea`
- source metadata SHA-256 `46f5a3711e20b9815bd87bed56fa0bc32b61f3a2c9b7348eaf6b141297c56724`
- package `de.donaumoschee.app`
- versionName `1.0.4`
- versionCode `7`
- compile/target/min SDK `37/37/23`
- source SHA `48d3fdbac34b255dde7bf574dd0127d7513cc9d4`

The candidate remains unsigned. The protected Production release workflow requires `workflow_dispatch`, current `main`, a successful Android TWA run for that exact `main` SHA, the permanent signer and publication confirmation. The connected GitHub surface does not expose workflow dispatch; the workflow was not weakened or bypassed. Public Android remains `android-v1.0.3`.

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

Governance model: **single-maintainer governance / manual owner review**.

The sole owner/maintainer explicitly does not require a second human reviewer, independent GitHub approving account or `required_approving_review_count: 1`. This is not described as independent human review.

Active `Protect main` ruleset remains unchanged:

- strict required CI/Android status checks preserved;
- required review-thread resolution preserved;
- deletion and non-fast-forward protections preserved;
- squash-only merge preserved;
- no bypass actors;
- `required_approving_review_count: 0` retained by design for this repository model.

`OPEN-135` is therefore classified **N/A** for this explicit single-maintainer governance model. The decision is non-blocking. The owner will personally perform the final manual owner review of PR #105 before separately authorizing merge. No fabricated reviewer, self-approval or second account will be created.

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

Current launch verdict remains **NO-GO** because Production web deployment, signed Android release-chain evidence and remaining provider/recovery evidence are unresolved. The absence of a second reviewer is explicitly not a launch blocker. PR #105 remains Draft and unmerged pending the owner's manual review and separate merge authorization.
