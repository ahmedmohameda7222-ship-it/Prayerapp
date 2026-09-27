# Plan 7 — Live TV Certification Evidence

Status: IN PROGRESS — NOT RELEASE CERTIFIED

This document records only evidence that was actually observed. `NOT EXECUTED`, `PENDING`, and `BLOCKED` are never equivalent to PASS.

## Candidate identity

| Evidence | Result |
| --- | --- |
| Repository | `ahmedmohameda7222-ship-it/Prayerapp` |
| Branch | `feat/masjid-display-plan-7` |
| Plan 7 Draft PR | #109 — open, Draft, unmerged |
| Candidate HEAD at this checkpoint | `31bebed70505ae385b1e272258aa14be0b81c6d7` before this evidence refresh |
| Approved main / Plans 1–6 base | `a38cc86c57e9955720b18d4707c69dadc1d11e0b` |
| Final exact HEAD | NOT FINAL |
| Supabase / SQL | No Plan 7 SQL or migration created so far |

## Implementation evidence

### Fullscreen / presentation mode

- Standard Fullscreen API only; no `navigator.userAgent`, Samsung, Amazon, or Silk branch.
- Native **Vollbild / ملء الشاشة** button is rendered when the API is available and the document is not fullscreen.
- Fullscreen is requested only from button activation.
- The implementation first requests `requestFullscreen({ navigationUI: "hide" })` and safely retries `requestFullscreen()` when the optional argument is rejected as unsupported.
- `fullscreenchange` hides/restores the control and `fullscreenerror`/promise rejection produce browser-level fallback guidance.
- Automated regression suite passed after the TDD RED gate.
- Real browser fullscreen/chrome behavior: NOT EXECUTED.

### Prayer Strip / Iqama presentation

- Five normal prayers render stored shared-delay Iqama information in a dedicated `.prayer-iqama` row separate from the dominant `.prayer-time`.
- Sunrise remains informational with no Iqama.
- Friday Dhuhr renders Jumuah semantics with no normal Dhuhr Iqama.
- Feed/runtime authority was not changed.
- Automated semantic regression passed after the TDD RED gate.
- Practical TV-distance readability: NOT EXECUTED.
- 1920×1080 viewport: NOT EXECUTED.
- Larger required viewport: NOT EXECUTED.

## TDD / automated evidence

### Task 1 RED

- Commit: `d7b829524044fd30d8826a45a10a387cfc6797c5`
- GitHub Actions run: `36239179382`
- Job: `verify-tv-package` / `108396361542`
- Expected failure: `PresentationModeControl.test.tsx` could not resolve the not-yet-created `PresentationModeControl`.
- Existing suite at RED point: 179 passed, 4 skipped.

### Task 1 GREEN

- Exact implementation/test checkpoint: `87101f0e575c4bb1cddc22eb663be7210b174483`
- TV tests, lint, typecheck, build, and forbidden TV runtime/dependency checks: PASS.

### Task 2 RED

- Commit: `1bf437e9c1aa29819cc99eb62c5293bb2942a89f`
- Expected failure: `DisplayShell.test.tsx` could not find `data-testid="prayer-iqama-fajr"` because the old markup kept Iqama inline after the prayer time.

### Task 2 GREEN

- Exact implementation checkpoint: `94590267c2014835d8b54fa52d45575ce1387f68`
- TV tests, lint, typecheck, build, and forbidden TV runtime/dependency checks: PASS.

## Vercel evidence

| Evidence | Result |
| --- | --- |
| Team | `Ahmed's projects` / `team_crjtVtp1aygpixnb7GHtnIdi` |
| TV project | `donaumoschee-tv` |
| TV project ID | `prj_6oqEYWPnfn1kMRo798M21swUl2w2` |
| Root production origin | `https://donaumoschee.vercel.app` |
| Current TV production deployment | `dpl_3JoLiEfwaeM6kyRcuJ9PESb7SsZe` — READY |
| Current TV production Git SHA | `a38cc86c57e9955720b18d4707c69dadc1d11e0b` (`main`) |
| Vercel PR/feature-branch Preview | NOT REQUIRED / MUST NOT BE CREATED — user-approved main-only policy |
| Repository deployment policy | PASS — `vercel.json` has `"**": false` and `"main": true` |
| Plan 7 production deployment | POST-MERGE GATE — only after Planner squash-merges to `main` |

Production was not replaced or promoted during Plan 7 development.

**Deployment-policy ruling (2026-09-26):** Vercel must deploy `main` only and must not create PR/feature-branch Preview deployments. The earlier Preview requirement is superseded. Pre-merge certification covers exact-head code/CI/security/review evidence; Vercel live/Admin/physical certification moves to the merged `main` production deployment. Cost if wrong: a live-only defect is discovered after merge and must be handled by rollback or a follow-up reviewed fix.

### Stable production baseline observed during pre-merge work

These checks prove only the stable merged production path; they do **not** certify the Plan 7 UI candidate.

- `https://donaumoschee-tv.vercel.app/api/display-feed` → HTTP 200 on 2026-09-26; schema v1 payload returned from real Prayerapp production with canonical Prayerapp QR URL `https://donaumoschee.vercel.app`.
- `https://donaumoschee-tv.vercel.app/api/test-control` → HTTP 200 with `{"active":false}`.
- Vercel runtime error clusters for the TV project over the checked one-hour window: none.
- Production warning/error runtime-log query over the checked one-hour window: no matching logs.

## Production baseline outage found and remediated in branch — 2026-09-27

During the required stable-production baseline check, both the TV proxy `/api/display-feed` and the root Prayerapp `/api/public/masjid-display` returned HTTP 503, while Test Control remained HTTP 200. Vercel root runtime evidence reported `DisplayFeedBuildError` on `/api/public/masjid-display`.

Read-only production Supabase investigation found:

- published prayer coverage ends at `2026-10-31`;
- on `2026-09-27`, the Feed requests its approximate operational window from `2026-09-26` through `2026-11-01`;
- the only missing required-window date was the trailing future day `2026-11-01`;
- there is no prayer row after `2026-10-31`;
- Prayer Engine `profile_configured=false`, so generating the missing religious schedule day automatically would be unauthorized/invented data.

No production prayer row, calculation profile, SQL schema, or migration was modified.

The approved Masjid Display design describes the future horizon as **approximately 35 days** and already requires the TV to degrade safely when the current day is missing. The branch therefore repairs the availability cliff without weakening religious-data safety: a shorter trailing future horizon is accepted only when the schedule still starts at the required previous-day boundary, is contiguous, and covers the current mosque-local day. Internal gaps and loss of current-day coverage still fail closed.

TDD evidence:

- RED commit: `4e296314c8d90660c7387564467e961ae46b3c24`;
- RED Plan 3 run/job: `36298947203` / `108562884529`;
- RED result: exactly the new trailing-horizon regression failed with `DisplayFeedBuildError: Published prayer schedule is incomplete for the display window`; 91 focused tests passed;
- GREEN implementation commit: `31bebed70505ae385b1e272258aa14be0b81c6d7`;
- focused Plan 3 run/job: `36299034087` / `108563123662` — PASS;
- the regression also proves a schedule that no longer covers the current day still throws `DisplayFeedBuildError`.

Because the user requires Vercel to deploy `main` only, stable production remains on pre-Plan-7 `main` and this repair is not deployed before Planner approval. Post-merge certification must first verify both root and TV Feed endpoints return 200 from the merged Plan 7 `main` deployment.

## Current exact-head CI evidence

For implementation HEAD `31bebed70505ae385b1e272258aa14be0b81c6d7`:

| Gate / run | Result |
| --- | --- |
| Root `verify` | PASS — run `36299034161`, job `108563162328` |
| Plan 3 Feed Verification | PASS — run `36299034087`, job `108563123662` |
| Masjid Display `verify-tv-package` | PASS — run `36299034095`, job `108563123784` |
| Masjid Display two-app integration | PASS — run `36299034095`, job `108563271018` |
| GitHub CodeQL | PASS — check `108563295688` |
| CodeQL JavaScript/TypeScript | PASS — run `36299034101`, job `108563160635` |
| Gitleaks full-history scan | PASS — run `36299034101`, job `108563160526` |
| OSV dependency scan | PASS — run `36299034101`, job `108563160619` |
| SBOM generation | PASS — run `36299034101`, job `108563160645` |
| Safe exact-head runtime DAST | PASS — run `36299034101`, job `108563160697` |
| Safe authenticated local DAST | PASS — run `36299034101`, job `108563160607` |
| Safe deployed-production DAST | PASS — run `36299034101`, job `108563160622` |
| Android build candidate | PASS — run `36299034088`, job `108563159177` |
| Android instrumentation API 23 | PASS — run `36299034088`, job `108563655935` |
| Android instrumentation API 37 | PASS — run `36299034088`, job `108563655918` |
| Release signing | SKIPPED as expected — no approved release/merge action |

Root `verify` also passed clean migration bootstrap, legacy-Iqama migration-safety certification, reconciliation/data-preservation checks, admin-audit checks, producer/consumer contract, root/TV tests, lint, typecheck, and builds.

This evidence refresh creates a newer documentation-only HEAD. To avoid recursive evidence commits, the final documentation-head workflow IDs and final Codex closure are recorded in PR #109 metadata/conversation.

## Live browser / Admin Test Mode / physical evidence

| Required evidence | Result |
| --- | --- |
| Vercel PR Preview | NOT APPLICABLE — deliberately disabled |
| Merged `main` production responds with Plan 7 SHA | POST-MERGE |
| Production `/api/display-feed` on merged Plan 7 | POST-MERGE |
| Production `/api/test-control` on merged Plan 7 | POST-MERGE |
| Runtime/log inspection on merged Plan 7 | POST-MERGE |
| 1920×1080 browser viewport | NOT EXECUTED |
| 2560×1440 or 3840×2160 browser viewport | NOT EXECUTED |
| Real fullscreen entry/exit | NOT EXECUTED |
| Browser chrome removal/fallback | NOT EXECUTED |
| Prayer Strip/Iqama live readability | NOT EXECUTED |
| Diagnostics live verification | NOT EXECUTED |
| Deterministic Admin Test Mode scenarios | NOT EXECUTED |
| Direct scenario switching / latest revision wins | NOT EXECUTED |
| Stop → CURRENT | NOT EXECUTED |
| Expiry → CURRENT | NOT EXECUTED |
| Actual target hardware/runtime | NOT EXECUTED |
| Real Prayerapp QR scan | NOT EXECUTED |
| Real Campaign QR scan | NOT EXECUTED |
| Offline/reconnect | NOT EXECUTED |
| Wake/visibility | NOT EXECUTED |

## Codex review

The first final pre-merge Codex request on `e568e8b30dd9190810a60228ccff3e436498ddc3` was not executed because the Codex connector reported a code-review usage limit; it produced no findings and is not treated as a clean review.

After that attempt, a real production-baseline Feed availability defect was discovered and fixed with RED→GREEN coverage through implementation HEAD `31bebed70505ae385b1e272258aa14be0b81c6d7`. Therefore a fresh Codex review is mandatory on the final documentation HEAD created by this evidence refresh.

If the service again refuses the review due quota, that remains an external pre-merge review-service blocker and must be reported as such. It is never equivalent to a clean Codex review.

## Operational follow-up

24/72-hour soak remains a non-blocking operational follow-up unless the user explicitly changes that rule.
