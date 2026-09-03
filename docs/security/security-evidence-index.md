# Prayerapp Security Evidence Index

Date: 2026-09-03

- Final fully verified technical/security candidate: `48d3fdbac34b255dde7bf574dd0127d7513cc9d4`
- Security branch: `security/prelaunch-remediation-2026-09-02`
- PR #105: Draft, open, unmerged
- Current reassessment: **822 PASS / 18 FAIL / 135 NOT VERIFIED / 15 N/A = 990**

## Governance

Governance model: **single-maintainer governance / manual owner review**.

The sole owner/maintainer explicitly does not require a second human reviewer, independent GitHub approving account or `required_approving_review_count: 1`. This is not independent human review.

The active `Protect main` ruleset remains unchanged: strict required CI/Android checks, review-thread resolution, deletion/non-fast-forward protections, squash-only merges and zero bypass actors are preserved. `required_approving_review_count: 0` is retained by design for this repository model.

`OPEN-135` is **N/A** for this explicit single-maintainer governance model and is not a launch blocker. The owner will personally perform the final manual owner review of PR #105 before separately authorizing merge. No fabricated reviewer, self-approval or second account will be created.

## Exact technical verification

- CI `33763676446`: SUCCESS
- Security Scanners `33763676284`: SUCCESS
- Android TWA `33763676349`: SUCCESS
- API 23 instrumentation: PASS
- API 37 instrumentation: PASS
- protected Production signing job: SKIPPED by workflow condition

Exact unsigned Android candidate: package `de.donaumoschee.app`, versionName `1.0.4`, versionCode `7`, artifact `9896718407`; APK SHA-256 `bf4e0de0b8bb0bff17bbf39538dfe8a8c8ba423c86d1658e59ac18742273eb47`; AAB SHA-256 `b16bd14780960d74bc83f36e7150a4242147851cb9c2ff1d61cb17cc31ac8dea`.

## Remaining release/provider gates

Production Vercel still serves `b18430b360313148fc76baaeda9d96844ed508a5`, so the nonce CSP is not Production-deployed. Android 1.0.4 remains unsigned/unpublished because the protected release workflow requires `workflow_dispatch`, unavailable through the connected GitHub surface. Historical Supabase migration metadata repair, provider backup/PITR/restore evidence and provider alert delivery remain externally unavailable/not verified as documented in the residual-risk register.

Supabase leaked-password protection remains disabled by explicit accepted-risk direction and is not a launch blocker.

Current launch verdict remains **NO-GO** because of the unresolved Production deployment, signed Android release chain and provider evidence—not because of the single-maintainer review model.
