# Prayerapp Residual Security Risks and Release Gates

Date: 2026-09-03
Review date: 2026-10-03, or earlier before any Production launch/release decision.
Owner unless otherwise stated: Prayerapp Production/repository maintainer.

This register distinguishes accepted risk, accepted governance decisions, unresolved release gates and external evidence limitations. Documentation alone does not convert an unresolved technical control to PASS.

Evidence-head terminology for this register:

- substantive implementation/security head: `cf62e28f6d03d77bfd41e447dc78d2689df77753`;
- evidence-only PR head: the documentation-only descendant containing the reconciled canonical 990 evidence. Its exact SHA/fresh workflow IDs are recorded in PR #105 after the commit and do not represent new substantive security implementation.

The owner follow-up review accepts the prior expected-object JSON, strict Server Action boolean, and truthful terminal-audit-completion findings as technically closed on the substantive implementation head. The final 990 reassessment changes only `OPEN-072` from NOT VERIFIED to PASS.

## RR-001 — Supabase leaked-password protection disabled

- Related finding: PA-SEC-002.
- State: **ACCEPTED RISK / NOT TECHNICALLY FIXED / NON-BLOCKING BY EXPLICIT USER DECISION**.
- Evidence: Production Supabase Security Advisor continues to report `auth_leaked_password_protection` WARN.
- Acceptance: leaked-password protection must remain disabled and this accepted condition must not be treated as a launch blocker.
- Risk: a password known from public compromise corpora is not rejected by Supabase's leaked-password check.
- Compensating controls: Supabase-managed authentication, separate admin authorization, durable abuse controls, security logging and no password values in repository evidence.
- Revisit trigger: authentication incident, material account-risk change or substantial expansion of privileged users.

## RR-002 — Historical Supabase migration metadata does not mirror repository identities

- Related finding: PA-SEC-001.
- State: **SEMANTIC PRODUCTION SCHEMA RECONCILED; EXTERNAL METADATA-REPAIR LIMITATION**.
- Evidence: Production contains `20260902211847_prelaunch_schema_reconciliation` and `20260902223939_admin_audit_hardening`. Fresh read-only verification re-proved the complete semantic state represented by historical repository versions `20260823104600`, `20260826160500`, `20260831080500` and `20260901223000`.
- Risk: operators can misread migration provenance even though the security-critical semantic schema is correct.
- Compensating controls: read-only semantic verifier, clean migration bootstrap, fail-closed migrations, equivalence record and forward-fix recovery rule.
- Gate state: metadata-only repair is explicitly authorized, but the connected Supabase management surface exposes no supported `repair` / `mark-applied` primitive. Historical SQL was not replayed and migration metadata was not manually edited.

## RR-003 — Hardened Android 1.0.4 is not yet the public signed release

- Related finding: PA-SEC-003.
- State: **OPEN PROTECTED SIGNED-RC / PUBLIC-RELEASE GATE; NOT ACCEPTED AS FIXED**.
- Evidence: substantive implementation head `cf62e28f6d03d77bfd41e447dc78d2689df77753` produced package `de.donaumoschee.app`, versionName `1.0.4`, versionCode `7`; Android workflow `33785329418` passed unsigned build plus API 23/37 instrumentation; artifact `9905332667`; public release remains `android-v1.0.3`.
- Exact unsigned implementation-head hashes: APK `bf4e0de0b8bb0bff17bbf39538dfe8a8c8ba423c86d1658e59ac18742273eb47`; AAB `b16bd14780960d74bc83f36e7150a4242147851cb9c2ff1d61cb17cc31ac8dea`.
- Architecture: `.github/workflows/android-twa.yml` contains a protected isolated pre-merge sign-only `workflow_dispatch` path using successful unsigned PR `run_id`, exact PR `source_sha`, and confirmation `SIGN_ANDROID_RC`. It signs/verifies the exact artifact and uploads a signed RC; it does not create the public Android release.
- Risk: current public users do not receive every hardening change present in the 1.0.4 candidate.
- Compensating controls: the sign-only job verifies exact source/artifact provenance, package/version/SDK metadata, permanent signer certificate and final signed hashes; signing secrets remain isolated from ordinary PR CI.
- Gate state: after the evidence-only head is fresh GREEN, the owner may manually dispatch the protected pre-merge sign-only RC operation for that exact head. Public release remains separately post-merge/current-main gated.

## RR-004 — Nonce CSP is not yet the Production web policy

- Related finding: PA-SEC-004.
- State: **OPEN EXTERNAL DEPLOYMENT GATE; SOURCE FIX IMPLEMENTED**.
- Evidence: exact remediation source passes isolated CSP/DAST verification; Production deployment `dpl_39vKk5vWuBkmQrDza3FQuSU2tr8j` still serves `b18430b360313148fc76baaeda9d96844ed508a5`.
- Risk: Production retains the pre-remediation web policy until the exact reviewed remediation source is deployed.
- Compensating controls: existing Production security headers/authz/input validation remain active; non-destructive Production DAST continues to run; isolated DAST validates the pending strict CSP.
- Gate state: exact-head Production deployment remains separately gated. No unbound deployment was attempted. Merge remains separately gated.

## RR-005 — Single-maintainer governance / manual owner review

- Related control: OPEN-135.
- State: **ACCEPTED GOVERNANCE DECISION / NON-BLOCKING / CONTROL N/A FOR THIS REPOSITORY MODEL**.
- Governance model: the repository has one owner/maintainer. A second human reviewer, independent GitHub approving account and `required_approving_review_count: 1` are explicitly not required.
- Evidence: active `Protect main` ruleset preserves strict required CI/Android checks, review-thread resolution, squash-only merge, deletion/non-fast-forward protections and no bypass actors; `required_approving_review_count` remains `0` by design.
- Required review: the owner follow-up has accepted the three manual security findings, while merge authorization remains a separate explicit owner decision.
- Accuracy rule: this must be described as **single-maintainer governance / manual owner review**, never as independent human review.
- Gate state: this governance decision is explicitly accepted and is not a Prayerapp launch blocker. No ruleset mutation is required for this purpose, and no fabricated/self/second-account approval will be created.

## RR-006 — Provider backup/PITR configuration and isolated restore drill are not verified

- Related controls: OPEN-277 through OPEN-282 and restore-drill requirements.
- State: **OPEN PROVIDER EVIDENCE GAP**.
- Evidence: clean local migration reconstruction and migration preservation/fail-closed proofs are exercised. The connected Supabase surface does not expose Production backup inventory, PITR status, retention, restore points or a safe isolated backup restore operation.
- Risk: recovery-time/data-loss assumptions cannot be validated against real provider backup state.
- Compensating controls: source-controlled migrations, clean bootstrap, semantic verification and documented forward-fix/recovery procedure.
- Gate state: a safe isolated/non-Production provider restore is authorized if supported; no such primitive is exposed. A destructive restore against healthy Production is prohibited and was not attempted.

## RR-007 — Android signing-key access/recovery and exact signed-device QA remain unverified

- Related controls: signing-key protection and Wave 4/6 signed-device gates.
- State: **OPEN EXTERNAL EVIDENCE / SIGNED-RC DEVICE GATE**.
- Evidence: the repository contains no Production keystore; the protected sign-only workflow expects permanent certificate SHA-256 `E9:98:4B:DB:36:FF:2F:8F:A5:58:29:5C:5C:06:6F:BA:ED:3A:BD:BD:CC:80:1C:83:5D:AE:1B:DD:4C:D7:0E:92` and keeps signing secrets out of ordinary PR execution.
- Risk: final source-to-signed-artifact provenance, upgrade behavior and physical-device security behavior cannot be claimed for 1.0.4 until the protected pre-merge sign-only RC is executed and signed-RC QA is completed.
- Gate state: use the final evidence-only head's successful Android TWA `run_id` and exact `source_sha` to manually dispatch the protected sign-only RC. Physical-device-specific controls remain NOT VERIFIED where no real device evidence is available. Public release remains post-merge/current-main gated.

## RR-008 — Provider alert notification delivery is not fully verified

- Related controls: monitoring/alerting readiness.
- State: **OPEN PROVIDER EVIDENCE GAP**.
- Evidence: GitHub security gates, safe DAST, authenticated local DAST, Supabase logs/advisors and Vercel runtime signals are observable and have been exercised. Provider paging/email configuration and test delivery are not exposed by current connectors.
- Risk: an event can be present in logs without producing a timely external notification.
- Compensating controls: fail-closed GitHub security gates, manual pre-release review, incident-response runbook and directly queryable provider logs/advisors.
- Gate state: safe monitoring/alert test events are authorized where supported; automated provider alert delivery/on-call delivery remains NOT VERIFIED.

## RR-009 — Current Production still needs PA-SEC-007 post-deploy retest

- Related finding: PA-SEC-007.
- State: **OPEN ON CURRENT OLD PRODUCTION DEPLOYMENT**.
- Evidence: `DEP0169 url.parse()` warnings were observed on `/api/cron/prayer-reminders` while Production still serves the old baseline. A separate `DEP0169` warning is also reproducible in GitHub Actions setup-node tooling, so attribution must be determined by post-deploy retest rather than inference.
- Risk: the current Production runtime may retain a deprecated URL parsing path until the exact remediation source is deployed and exercised.
- Gate: deploy only the exact reviewed remediation source, then inspect the cron/native runtime and Vercel/Supabase logs before closing PA-SEC-007.

## Residual-risk decision rule

RR-001 is an explicitly accepted non-blocking technical risk. RR-005 is an explicitly accepted non-blocking governance decision and makes the second-reviewer requirement inapplicable to this single-maintainer repository. RR-002, RR-003, RR-004 and RR-006 through RR-009 remain unresolved release/provider/evidence states and must not be converted to PASS merely because authorization exists or the limitation is documented.
