# Plan 7 — Live TV Certification Evidence

Status: IN PROGRESS — NOT RELEASE CERTIFIED

This document records only evidence that was actually observed. `NOT EXECUTED`, `PENDING`, and `BLOCKED` are never equivalent to PASS.

## Candidate identity

| Evidence | Result |
| --- | --- |
| Repository | `ahmedmohameda7222-ship-it/Prayerapp` |
| Branch | `feat/masjid-display-plan-7` |
| Plan 7 Draft PR | #109 — open, Draft, unmerged |
| Candidate HEAD at this checkpoint | `3bacefc16ddec4028bbea4b373ab2fa5c0638785` |
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
| Plan 7 Preview deployment ID | BLOCKED — no automatic feature-branch Preview exists and the connected deployment action is unavailable |
| Plan 7 Preview URL | BLOCKED |
| Preview attached exact Plan 7 SHA | BLOCKED |

Production was not replaced or promoted during Plan 7 development.

### Production-path health observed while Preview is blocked

These checks prove only the stable merged production path; they do **not** certify the Plan 7 UI candidate.

- `https://donaumoschee-tv.vercel.app/api/display-feed` → HTTP 200 on 2026-09-26; schema v1 payload returned from real Prayerapp production with canonical Prayerapp QR URL `https://donaumoschee.vercel.app`.
- `https://donaumoschee-tv.vercel.app/api/test-control` → HTTP 200 with `{"active":false}`.
- Vercel runtime error clusters for the TV project over the checked one-hour window: none.
- Production warning/error runtime-log query over the checked one-hour window: no matching logs.

## Current exact-head CI evidence

For checkpoint HEAD `3bacefc16ddec4028bbea4b373ab2fa5c0638785`:

| Gate / run | Result |
| --- | --- |
| Masjid Display Verification — run `36239830626`, `verify-tv-package` | PASS |
| Masjid Display Verification — run `36239830626`, two-app integration | PENDING at evidence capture |
| Root CI — run `36239830632` | PENDING at evidence capture |
| Security Scanners — run `36239830631` | CodeQL JS/TS PASS; Gitleaks PASS; OSV PASS; SBOM PASS; exact-head DAST PASS; deployed-production DAST PASS; authenticated local DAST PASS |
| Android TWA — run `36239830608` | Build candidate PASS; API 23/API 37 instrumentation PENDING at evidence capture |
| GitHub CodeQL check | PASS |

No claim that all exact-head checks are green is made while any required run is pending.

## Live browser / Admin Test Mode / physical evidence

| Required evidence | Result |
| --- | --- |
| Exact Plan 7 Preview responds | BLOCKED by missing Preview deployment |
| Preview `/api/display-feed` | BLOCKED |
| Preview `/api/test-control` | BLOCKED |
| Runtime/log inspection on Preview | BLOCKED |
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

Not requested. Per the approved Plan 7 order, Codex review is deferred until all implementation, live Vercel/browser verification, required physical/user checks, documentation, and self-review are complete.

## Operational follow-up

24/72-hour soak remains a non-blocking operational follow-up unless the user explicitly changes that rule.
