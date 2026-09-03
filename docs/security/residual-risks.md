# Prayerapp Residual Security Risks and Release Gates

Date: 2026-09-03
Review date: 2026-10-03, or earlier before any Production launch/release decision.
Owner unless otherwise stated: Prayerapp Production/repository maintainer.

This register distinguishes accepted risk from unresolved release gates and evidence gaps. An entry here is not evidence that the underlying control is technically fixed.

## RR-001 — Supabase leaked-password protection disabled

- Related finding: PA-SEC-002.
- State: **ACCEPTED RISK / NOT TECHNICALLY FIXED**.
- Evidence: Production Supabase Security Advisor continues to report `auth_leaked_password_protection` WARN.
- Acceptance: the user explicitly directed that leaked-password protection remain disabled and that this accepted condition not be treated as a launch blocker.
- Risk: a password known from public compromise corpora is not rejected by Supabase's leaked-password check.
- Compensating controls: application authentication remains Supabase-managed; privileged admin authorization is separately enforced; durable abuse controls/security logging are part of the remediation; no password value is stored in repository evidence.
- Revisit trigger: authentication incident, change in account-risk posture, or before materially expanding privileged user population.

## RR-002 — Historical Supabase migration metadata does not mirror repository identities

- Related finding: PA-SEC-001.
- State: **SEMANTIC PRODUCTION SCHEMA RECONCILED; HISTORICAL METADATA DRIFT REMAINS**.
- Evidence: Production contains the applied remediation migrations `20260902211847_prelaunch_schema_reconciliation` and `20260902223939_admin_audit_hardening`; historical repository migration versions that were previously applied manually/equivalently are not retroactively present in Production history.
- Risk: operators could misinterpret historical migration identity even though the verified Production semantic schema matches the required security contract.
- Compensating controls: read-only semantic verifier, clean local migration bootstrap, fail-closed reconciliation migrations, documented equivalence record and forward-fix recovery rule.
- Gate: migration-history metadata repair remains separately approval-gated and has not been performed.

## RR-003 — Hardened Android 1.0.4 is not the public signed release

- Related finding: PA-SEC-003.
- State: **OPEN RELEASE GATE; NOT ACCEPTED AS FIXED**.
- Evidence: source RC is versionCode 7 / versionName 1.0.4; latest public release remains `android-v1.0.3` targeting older source.
- Risk: users downloading the current public APK do not receive every hardening change present in the remediation branch, including the current hardened credential-storage implementation.
- Compensating controls: public 1.0.3 retains the previously verified permanent signing certificate and update path; signing/publication workflows verify package, certificate, digest and monotonic version; the 1.0.4 candidate is built unsigned by ordinary PR CI.
- Gate: Production signing, signed-artifact verification, public tag/release and physical-device final QA require explicit approval and have not been performed.

## RR-004 — Nonce CSP is not yet the Production web policy

- Related finding: PA-SEC-004.
- State: **OPEN DEPLOYMENT GATE; SOURCE FIX IMPLEMENTED**.
- Evidence: remediation source builds a per-request nonce CSP with `strict-dynamic` and no `unsafe-inline`/`unsafe-eval` in `script-src`; current Production deployment remains main `b18430b360313148fc76baaeda9d96844ed508a5`.
- Risk: Production retains the pre-remediation CSP until the approved branch is merged/deployed.
- Compensating controls: existing Production headers and same-origin/authz/input-validation controls remain active; non-destructive Production DAST continues to run; exact-head isolated DAST validates the pending strict CSP.
- Gate: merge/deployment and post-deployment CSP smoke verification require explicit approval.

## RR-005 — Repository human approval count is zero

- Related control: OPEN-135 / repository review governance.
- State: **OPEN GOVERNANCE GAP; NOT SILENTLY WAIVED**.
- Evidence: active `Protect main` ruleset requires PR flow, strict CI/Android checks, resolved review threads, extra approval for unattributed changes, squash-only merge, Copilot review on push/draft, and has no bypass actors; `required_approving_review_count` is `0`.
- Risk: repository policy does not universally require one human approval before merge.
- Compensating controls: required exact status checks, no bypass actors, unresolved-thread gate, unattributed-change approval and explicit user merge gate for this remediation.
- Gate: changing the GitHub ruleset is separately approval-gated and has not been performed.

## RR-006 — Provider backup configuration and real isolated restore drill are not verified

- Related controls: OPEN-277 through OPEN-282 and restore-drill requirements.
- State: **OPEN EVIDENCE GAP**.
- Evidence: recovery/migration procedures are documented and clean local schema reconstruction is exercised, but available management tooling does not expose verified Production backup/PITR configuration or an isolated provider restore operation.
- Risk: recovery time/data-loss assumptions cannot be validated against a real provider backup until a restore drill is executed.
- Compensating controls: migrations are source-controlled; clean bootstrap and semantic schema verification are exercised; destructive Production restore is prohibited; forward-fix/recovery process is documented.
- Gate: obtain provider backup configuration evidence and perform a safe isolated restore before marking restore controls PASS.

## RR-007 — Android signing-key backup/access and physical-device final security QA are not verified for this RC

- Related controls: signing-key protection and Wave 4/6 signed-device gates.
- State: **OPEN EVIDENCE GAP / RELEASE GATE**.
- Risk: final source-to-signed-artifact provenance and device behavior cannot be claimed for version 1.0.4 without exercising the protected signing environment and device QA.
- Compensating controls: repository contains no signing keystore; production signing secrets are isolated from automatic PR CI; signing workflow verifies certificate and artifact integrity.
- Gate: requires separately approved Production signing plus controlled physical-device verification. No signing operation has been performed during this remediation.

## RR-008 — Provider alert notification delivery is not fully verified

- Related controls: monitoring/alerting readiness.
- State: **OPEN EVIDENCE GAP**.
- Evidence: Vercel/Supabase/GitHub detection signals and security CI gates are observable and have been exercised; provider-side paging/email configuration for every threshold in `docs/security/monitoring-alerting.md` is not available through current tooling.
- Risk: an event may be present in logs without generating a timely external notification.
- Compensating controls: pre-release manual review cadence, fail-closed GitHub security gates, incident-response runbook and directly queryable Production logs/advisors.
- Gate: verify provider alert destinations/test delivery before marking automated-alert controls PASS.

## Residual-risk decision rule

Only RR-001 is explicitly accepted by user direction as a non-launch-blocking technical risk. The other entries are documentation of residual state, approval gates, or evidence gaps; they must not be converted to PASS merely because they are documented here.
