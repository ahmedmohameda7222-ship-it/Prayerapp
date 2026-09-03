# Prayerapp Security Evidence Index

Date: 2026-09-03

- Substantive implementation/security head: `cf62e28f6d03d77bfd41e447dc78d2689df77753`
- Evidence-only PR head: the commit containing this index and the reconciled canonical 990 evidence; it is a documentation-only descendant of the substantive head and contains no new substantive application/security implementation.
- Exact evidence-only head SHA and its fresh CI / Security Scanners / Android TWA run IDs are recorded in PR #105 after the evidence commit, because a commit cannot embed its own SHA without creating a second commit.
- Security branch: `security/prelaunch-remediation-2026-09-02`
- PR #105: Draft, open, unmerged
- Current reassessment: **823 PASS / 18 FAIL / 134 NOT VERIFIED / 15 N/A = 990**

## Manual owner follow-up

The owner follow-up review accepts the three manual findings as technically closed on substantive implementation head `cf62e28f6d03d77bfd41e447dc78d2689df77753`:

1. expected-object JSON routes perform runtime object validation before property dereference;
2. privileged Server Action booleans use strict runtime parsing instead of truthiness coercion;
3. terminal audit-completion failure preserves an already-committed mutation result and exposes bounded `auditIncomplete` state instead of falsely reporting mutation failure.

`OPEN-072` is the only control transition in this evidence reconciliation: **NOT VERIFIED → PASS**. The closure is backed by the wrong-shape runtime regression matrix plus isolated exact-head DAST proving controlled 400 handling for `null`, arrays, strings, numbers, booleans and malformed JSON, while a valid object crosses into field validation.

## Substantive implementation verification

Accepted fresh verification for `cf62e28f6d03d77bfd41e447dc78d2689df77753`:

- CI `33785329141`: SUCCESS
- Security Scanners `33785329229`: SUCCESS
- Android TWA `33785329418`: SUCCESS
- API 23 instrumentation: SUCCESS
- API 37 instrumentation: SUCCESS
- protected signing job: SKIPPED on the ordinary PR event, as designed

Unsigned implementation-head candidate: package `de.donaumoschee.app`, versionName `1.0.4`, versionCode `7`, artifact `9905332667`; APK SHA-256 `bf4e0de0b8bb0bff17bbf39538dfe8a8c8ba423c86d1658e59ac18742273eb47`; AAB SHA-256 `b16bd14780960d74bc83f36e7150a4242147851cb9c2ff1d61cb17cc31ac8dea`; source metadata SHA-256 `d90182bcef6d4677c3e8998c2447f46fe5ddabd18f3598059e919e2c7e2d380d`.

The evidence-only head must receive a fresh CI, Security Scanners and Android TWA run after this documentation commit. The final Android run must produce an unsigned candidate whose `sourceSha` equals that evidence-only PR head. Those exact final run/artifact identifiers are recorded in the PR description after the workflows complete.

## Admin audit consistency model

Privileged audit flow is explicitly non-transactional across the mutation and terminal audit append:

- a durable audit `attempt` is written before mutation;
- authorization remains independently enforced and there is no unaudited authorization path;
- once the privileged mutation commits, its mutation result is authoritative;
- if terminal audit completion fails, the action preserves that result and returns bounded `auditIncomplete: true` state/warning;
- bounded correlation identifiers are emitted for monitoring/reconciliation so operators do not retry a mutation that already succeeded.

PA-SEC-006 remains FIXED under this explicit consistency model.

## Server-side admin input boundary

PA-SEC-005 remains FIXED only with the follow-up boundary evidence: existing length/numeric bounds plus strict runtime parsing of privileged Server Action boolean inputs. The boolean variant regressions reject arbitrary strings, numbers, null, arrays and objects instead of allowing unintended `Boolean(value)` coercion.

## Android release architecture

`.github/workflows/android-twa.yml` already contains a protected isolated **pre-merge sign-only** `workflow_dispatch` path. It requires:

- a successful unsigned Android TWA PR `run_id`;
- the exact PR `source_sha`;
- confirmation `SIGN_ANDROID_RC`.

The isolated job downloads the exact unsigned candidate without executing PR code, validates hashes/provenance/package/version/SDK metadata, reconstructs the Production keystore, verifies the permanent Production certificate fingerprint, signs and cryptographically verifies APK+AAB, generates hashes, and uploads the signed RC artifact.

That sign-only job **does not create the public Android release**. Public Production release remains a separate post-merge/current-main-gated workflow.

The next intended gate after the evidence-only head is fully GREEN is the owner-dispatched protected pre-merge sign-only RC operation using the final Android TWA run ID and exact evidence-only `source_sha`.

## Governance

Governance model: **single-maintainer governance / manual owner review**.

The sole owner/maintainer explicitly does not require a second human reviewer, independent GitHub approving account or `required_approving_review_count: 1`. This is not independent human review.

The active `Protect main` ruleset remains unchanged: strict required CI/Android checks, review-thread resolution, deletion/non-fast-forward protections, squash-only merges and zero bypass actors are preserved. `required_approving_review_count: 0` is retained by design.

`OPEN-135` remains **N/A** for this repository model and is not a launch blocker. PR #105 remains separately merge-gated; no merge is authorized by this evidence reconciliation.

## Remaining release/provider gates

Production Vercel still serves `b18430b360313148fc76baaeda9d96844ed508a5`, so the nonce CSP is not Production-deployed. Android 1.0.4 remains unsigned/unpublished until the protected pre-merge sign-only RC gate is executed. Historical Supabase migration metadata repair, provider backup/PITR/restore evidence, physical-device/upgrade evidence where unavailable, and provider alert delivery remain unresolved as documented in the residual-risk register.

Supabase leaked-password protection remains disabled by explicit accepted-risk direction and is not a launch blocker.

Current launch verdict remains **NO-GO** because of unresolved Production deployment, signed Android artifact/device gates and provider evidence—not because of the accepted single-maintainer governance model or the three now-closed manual findings.
