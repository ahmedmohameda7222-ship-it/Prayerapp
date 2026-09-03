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

- CI `33763676446`: **SUCCESS**
- Security Scanners `33763676284`: **SUCCESS**
- Android TWA `33763676349`: **SUCCESS**
- API 23 instrumentation: PASS
- API 37 instrumentation: PASS
- protected Production signing job: SKIPPED by workflow condition

The exact unsigned Android candidate is package `de.donaumoschee.app`, versionName `1.0.4`, versionCode `7`, artifact `9896718407`; APK SHA-256 is `bf4e0de0b8bb0bff17bbf39538dfe8a8c8ba423c86d1658e59ac18742273eb47` and AAB SHA-256 is `b16bd14780960d74bc83f36e7150a4242147851cb9c2ff1d61cb17cc31ac8dea`.

Authenticated DAST used real local Supabase Auth identities/JWTs and no Production test users or Production data. It verified normal-user admin denial, account-A/account-B ownership isolation, BOLA denial, cross-origin account deletion denial, invalid/deleted/logged-out session rejection, durable push rate limiting and own-account deletion. This evidence directly closes `OPEN-200`, `OPEN-201`, `OPEN-206`, `OPEN-211`, `OPEN-212` and `OPEN-216`.

## Production Supabase

Project: `dbqbzvkleqzbgufllgca`.

Authorized security migrations already applied:

- `20260902211847_prelaunch_schema_reconciliation`
- `20260902223939_admin_audit_hardening`

The read-only Production semantic verifier passes. Complete semantic equivalence was re-proven for historical repository migrations `20260823104600`, `20260826160500`, `20260831080500` and `20260901223000`; their version identities remain absent from Production metadata because the connected Supabase surface exposes no supported metadata-only `repair` / `mark-applied` operation. No historical SQL was replayed and migration metadata was not manually edited.

Supabase leaked-password protection remains disabled by explicit accepted-risk direction and is not a launch blocker.

## Production web / Vercel

Production remains deployment `dpl_39vKk5vWuBkmQrDza3FQuSU2tr8j` from `main` SHA `b18430b360313148fc76baaeda9d96844ed508a5`. The nonce-CSP remediation is source-fixed but not Production-deployed. No exact-head preview exists and the connected Vercel surface cannot safely bind a new deployment to the reviewed Git SHA/ref.

## Repository governance

Governance model: **single-maintainer governance / manual owner review**.

The sole owner/maintainer explicitly does not require a second human reviewer, independent GitHub approving account or `required_approving_review_count: 1`. This is not independent human review.

The active `Protect main` ruleset remains unchanged: strict required CI/Android checks, review-thread resolution, deletion/non-fast-forward protections, squash-only merges and zero bypass actors are preserved. `required_approving_review_count: 0` is retained by design for this repository model.

`OPEN-135` is classified **N/A**. The owner will personally perform the final manual owner review of PR #105 before separately authorizing merge. No fabricated reviewer, self-approval or second account will be created.

## Recovery and monitoring evidence

Provider backup inventory, PITR status, retention, isolated provider restore and automated alert/on-call delivery remain **NOT VERIFIED** because those provider capabilities are not exposed by the connected surfaces. Destructive Production restore was not performed.

## Launch disposition

Current launch verdict remains **NO-GO** because Production web deployment, signed Android release-chain evidence and remaining provider/recovery evidence are unresolved. The absence of a second reviewer is explicitly not a launch blocker. PR #105 remains Draft and unmerged pending the owner's manual review and separate merge authorization.
