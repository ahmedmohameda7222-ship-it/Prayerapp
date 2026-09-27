# Plan 7 — Live TV Certification Evidence

Status: IN PROGRESS — NOT RELEASE CERTIFIED

This document records only evidence that was actually observed. `NOT EXECUTED`, `PENDING`, and `BLOCKED` are never equivalent to PASS.

## Candidate identity

| Evidence | Result |
| --- | --- |
| Repository | `ahmedmohameda7222-ship-it/Prayerapp` |
| Branch | `feat/masjid-display-plan-7` |
| Plan 7 Draft PR | #109 — open, Draft, unmerged |
| Candidate HEAD at this checkpoint | `89f101ae8dc9ab1307f698d74630a1a7cfb4dbc5` before this evidence refresh |
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

## Current exact-head CI evidence

For exact documentation/policy checkpoint HEAD `89f101ae8dc9ab1307f698d74630a1a7cfb4dbc5`:

| Gate / run | Result |
| --- | --- |
| Root `verify` | PASS — run `36243095605`, job `108407190798` |
| Masjid Display `verify-tv-package` | PASS — run `36243095602`, job `108407184886` |
| Masjid Display two-app integration | PASS — run `36243095602`, job `108407326199` |
| CodeQL JavaScript/TypeScript | PASS — run `36243095614`, job `108407192290` |
| GitHub CodeQL | PASS — check `108407351709` |
| Gitleaks full-history scan | PASS — run `36243095614`, job `108407192196` |
| OSV dependency scan | PASS — run `36243095614`, job `108407192244` |
| SBOM generation | PASS — run `36243095614`, job `108407192085` |
| Safe exact-head runtime DAST | PASS — run `36243095614`, job `108407192226` |
| Safe authenticated local DAST | PASS — run `36243095614`, job `108407192198` |
| Safe deployed-production DAST | PASS — run `36243095614`, job `108407192220` |
| Android build candidate | PASS — run `36243095626`, job `108407189091` |
| Android instrumentation API 23 | PASS — run `36243095626`, job `108407700529` |
| Android instrumentation API 37 | PASS — run `36243095626`, job `108407700527` |
| Release signing | SKIPPED as expected — no approved release/merge action |

All triggered required automated gates for `89f101ae8dc9ab1307f698d74630a1a7cfb4dbc5` completed successfully. Source-boundary recheck also found no TV Supabase runtime/client, no `NEXT_PUBLIC_PRAYERAPP_ORIGIN`, no prayer-calculation/audio path, and no production vendor/user-agent fullscreen routing.

This evidence refresh itself creates a newer documentation-only HEAD. To avoid an infinite evidence-commit loop, the final exact-head workflow IDs and final Codex closure after this refresh are recorded in PR #109 metadata/conversation.

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

The final pre-merge Codex review was requested on exact documentation HEAD `e568e8b30dd9190810a60228ccff3e436498ddc3` with the approved main-only Vercel ruling explicitly included. The Codex connector did **not** perform a review: it returned a usage-limit message, so there were no findings to accept, reject, or resolve.

Two later commits through `89f101ae8dc9ab1307f698d74630a1a7cfb4dbc5` are documentation-only (`production-certification.md` and the Plan 7 design) and their exact-head CI is green as recorded above.

A fresh Codex request is required on the final documentation HEAD after this evidence refresh. If quota remains unavailable, that is an external review-service blocker and must be reported truthfully; it is not equivalent to a clean Codex review.

## Operational follow-up

24/72-hour soak remains a non-blocking operational follow-up unless the user explicitly changes that rule.
