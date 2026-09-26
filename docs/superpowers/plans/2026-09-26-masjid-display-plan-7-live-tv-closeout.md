# Masjid Display Plan 7 — Cross-Browser Fullscreen, Physical TV Certification, and Release Closeout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to execute this plan task-by-task. Do not re-brainstorm the approved architecture.

**Goal:** Finish the real big-screen release path for Masjid Display by adding browser-generic fullscreen presentation mode, fixing Prayer Strip Iqama readability, verifying the exact candidate on deployed infrastructure and real TV hardware, and producing a clean final review package for independent Planner approval.

**Architecture:** Keep the existing root Prayerapp and `masjid-display/` Next.js apps unchanged in authority boundaries. Root Prayerapp remains the sole Supabase/Admin/Prayer Engine authority. TV remains read-only and talks to root only through its same-origin server proxy using server-only `PRAYERAPP_ORIGIN`. Fullscreen uses standards-based feature detection, not vendor detection. Plan 7 is a presentation/live-certification closeout, not a Prayer Engine or Feed redesign.

**Tech Stack:** Next.js 16.3.3, React 19.2.8, TypeScript, Vitest, GitHub Actions, Vercel, Supabase/Postgres only if a real defect requires it.

**Spec:** `docs/superpowers/specs/2026-09-26-masjid-display-plan-7-live-tv-closeout-design.md`

## Starting State

- Repository: `ahmedmohameda7222-ship-it/Prayerapp`
- Branch: `feat/masjid-display-plan-7`
- Main / Plans 1–6 squash commit: `a38cc86c57e9955720b18d4707c69dadc1d11e0b`
- Plan 7 design commit: `16b7be1e5306881aa5cb5215e81ad86adf35b7df`
- PR #108: already squash-merged and closed; never reuse it for Plan 7.
- Root Vercel project: `donaumoschee`
- Root production origin: `https://donaumoschee.vercel.app`
- TV Vercel project: `donaumoschee-tv`
- TV project ID: `prj_6oqEYWPnfn1kMRo798M21swUl2w2`
- TV production origin: `https://donaumoschee-tv.vercel.app`
- TV Root Directory: `masjid-display`
- TV server-only env: `PRAYERAPP_ORIGIN=https://donaumoschee.vercel.app`
- Current production TV deployment from merged main is READY and its real `/api/display-feed` and `/api/test-control` endpoints return 200.
- First physical-TV evidence at 100% browser zoom confirms the real display renders on a television. It also confirms two Plan 7 findings: browser chrome must be removable through a presentation/fullscreen control, and Iqama text needs better visual separation/readability.

## Global Constraints

- Work only on `feat/masjid-display-plan-7`.
- Do not modify `main` directly.
- Create a new Draft PR against `main` for Plan 7 after the first implementation commit if one does not already exist.
- Do not merge the Plan 7 PR. The independent Planner owns final approval and squash merge.
- Do not create Plan 8 work.
- Do not rebuild existing Feed/Test Mode/Prayer Engine behavior unless live evidence exposes a real defect.
- Do not add Samsung-, Amazon-, Fire-TV-, Silk-, Chrome-, or other vendor-specific logic merely by user-agent string.
- Prefer standards-based feature detection and graceful degradation.
- Do not add TV-side Supabase access, secrets, prayer calculation runtime, audio, or adhan playback.
- Keep `PRAYERAPP_ORIGIN` server-only. Never create `NEXT_PUBLIC_PRAYERAPP_ORIGIN`.
- Legacy absolute-Iqama columns remain compatibility-only. Do not perform their destructive removal in Plan 7 without a new explicit user authorization for that destructive migration.
- If Plan 7 legitimately introduces any new non-destructive SQL/Supabase migration, do not leave it unapplied: test/review it, apply it to the real Prayerapp Supabase target in the same task, then verify and record the exact applied migration/state.
- Never fabricate command, browser, Vercel, Supabase, QR-scan, physical-TV, or CI evidence.
- Use connected GitHub/Vercel/Supabase capabilities that actually exist. If a physical/browser/admin interaction requires the user, ask for the smallest exact action and resume from the same checkpoint after the user replies.
- 24/72-hour soak remains an operational follow-up and does not block Plan 7 unless the user explicitly promotes it to a release gate.

## Review Policy

**Do not run Codex Review after each task.**

Finish the entire implementation and live verification first. Run Codex only in the final task on the final exact HEAD.

When Codex returns findings:

- inspect **all findings**, regardless of severity/rank;
- validate each finding technically;
- fix every legitimate issue at the root cause;
- add regression coverage where appropriate;
- rerun the relevant verification;
- request another Codex Review on the new exact HEAD;
- repeat until the final exact-head review has no legitimate unresolved findings.

Do not use labels such as P0/P1/P2/B0/B1/B2 as a filter for what gets investigated.

## Approved deployment-policy override — 2026-09-26

The user explicitly requires Vercel to deploy **`main` only** and to create **no PR/feature-branch Preview deployment**.

The repository already enforces this in `vercel.json`:

- `git.deploymentEnabled["**"] = false`
- `git.deploymentEnabled.main = true`

This ruling supersedes any instruction below that requires a Vercel Preview for Plan 7.

Operational consequence:

1. Tasks 1–3 remain unchanged.
2. Task 4 becomes verification/preservation of the main-only Vercel policy and stable existing production while the PR is open.
3. Exact-head CI/security/source-boundary checks and final pre-merge code review run on the feature branch.
4. The independent Planner remains the only actor allowed to approve/squash-merge the PR.
5. Only after that merge does Vercel deploy Plan 7 from `main`.
6. Deployed browser/fullscreen/diagnostics, real Admin Test Mode, and physical TV/QR/network/wake checks execute against the merged `main` production deployment.
7. Plan 7 is not fully release-certified until those post-merge checks pass.
8. Any live defect found post-merge must be handled through rollback or a new reviewed fix; do not bypass the main-only policy.

**Codex sequencing ruling:** because the original requirement to finish deployed/physical checks before the final pre-merge review is no longer achievable without violating main-only deployment, the final Codex loop becomes the last **pre-merge** engineering gate after exact-head CI/security/docs/self-review. Post-merge live/physical certification still remains mandatory before the overall Plan 7 release is called complete.

Cost if this ruling is wrong: a defect observable only on the deployed TV/runtime may be discovered after merge rather than before it, increasing reliance on rollback/follow-up readiness.

---

### Task 1: Add standards-based cross-browser fullscreen presentation mode

**Files:**
- Create: `masjid-display/components/PresentationModeControl.tsx`
- Modify: `masjid-display/components/DisplayShell.tsx`
- Modify: `masjid-display/app/page.tsx` only if fullscreen state belongs at page/runtime level
- Modify: `masjid-display/app/globals.css`
- Create/Modify tests under `masjid-display/components/__tests__/` and/or `masjid-display/app/page.test.tsx`

**Required behavior:**
- standard Fullscreen API;
- feature detection;
- real user gesture;
- keyboard/remote activation through normal button semantics;
- hide control in fullscreen;
- show again after exit;
- concise unsupported/denied fallback;
- no vendor UA sniffing;
- no automatic fullscreen on load.

- [ ] **Step 1: Write RED tests**

Cover at minimum:
- control appears when not fullscreen;
- control is absent while fullscreen is active;
- activation calls `requestFullscreen` only from user interaction;
- `fullscreenchange` updates state;
- rejected fullscreen request does not crash the display;
- unsupported API renders a safe instruction/fallback;
- no Samsung/Amazon/Silk UA branching is introduced.

- [ ] **Step 2: Implement the smallest reusable control**

Use a normal accessible `button` so mouse, keyboard Enter/Space, and TV-browser remote activation can use native interaction.

Prefer:
`document.documentElement.requestFullscreen({ navigationUI: "hide" })`
when supported by the browser/type surface, with a standards-safe fallback to `requestFullscreen()`.

Do not make unsupported optional arguments a hard requirement.

- [ ] **Step 3: Integrate without disturbing display states**

The control must not:
- participate in normal content rotation;
- obscure urgent content;
- cover Prayer Strip or QR;
- remain visible in fullscreen;
- alter logical clock, Test Mode, LKG, or prayer state.

- [ ] **Step 4: Verify focused tests GREEN and commit**

Commit example:
`feat: add cross-browser TV fullscreen mode`

---

### Task 2: Fix Prayer Strip Iqama readability on real TV layouts

**Files:**
- Modify: `masjid-display/components/PrayerStrip.tsx`
- Modify: `masjid-display/app/globals.css`
- Modify/Test: `masjid-display/components/__tests__/OperationalUi.test.tsx`
- Add a focused Prayer Strip test if existing coverage cannot express the layout contract.

**Required behavior:**
- prayer time remains dominant;
- Iqama delay becomes its own visually separated line/block;
- no time/Iqama collision;
- Sunrise remains without Iqama;
- Friday Dhuhr/Jumuah remains without normal Dhuhr Iqama;
- six-card row remains viable at 1920×1080;
- responsive behavior remains adaptive for larger and narrower layouts.

- [ ] **Step 1: Add semantic regression coverage**

Pin:
- Iqama delay exists for the five normal prayers when configured;
- Sunrise has none;
- Friday Dhuhr/Jumuah has none;
- Iqama text is a distinct DOM element/row rather than an inline suffix to the prayer time.

- [ ] **Step 2: Implement presentation-only markup/CSS**

Do not change Iqama calculation or Feed shape.

Use responsive CSS (`clamp`, grid/flex, relative units) rather than a hard-coded TV-specific pixel layout.

- [ ] **Step 3: Verify 1920×1080 and larger browser viewport rendering**

At minimum:
- 1920×1080;
- 2560×1440 or 3840×2160.

Record that all six cells remain readable and unclipped.

- [ ] **Step 4: Commit**

Commit example:
`fix: improve TV iqama readability`

---

### Task 3: Lock browser-generic presentation and physical-TV certification contracts

**Files:**
- Modify: `docs/masjid-display/physical-tv-certification.md`
- Modify: `docs/masjid-display/deployment.md`
- Modify: `docs/masjid-display/test-mode-demo.md`
- Add/modify source-tree or UI contract tests if needed.

- [ ] **Step 1: Replace Samsung-specific assumptions in certification language**

Certification must record:
- hardware/display;
- browser/runtime;
- resolution;
- zoom/scaling;
- viewing distance;
- fullscreen behavior.

Amazon Fire TV / Silk is a primary real deployment target but not a code branch.

Existing Samsung evidence may be recorded as secondary compatibility evidence.

- [ ] **Step 2: Document fullscreen operating procedure**

Document:
- open display;
- activate `Vollbild / ملء الشاشة` using pointer or remote;
- verify browser chrome disappears if the browser permits;
- verify control disappears while fullscreen;
- verify safe fallback if browser denies/does not support API;
- verify exiting fullscreen restores the control.

- [ ] **Step 3: Add source-tree guard against vendor sniffing if appropriate**

If useful, add a focused test ensuring the new fullscreen implementation does not inspect `navigator.userAgent` for vendor routing.

Do not create an overbroad lint rule that breaks unrelated legitimate code.

- [ ] **Step 4: Commit**

Commit example:
`docs: define cross-browser TV certification`

---

### Task 4: Preserve and verify the main-only Vercel deployment policy

**External configuration:**
- Project: `donaumoschee-tv`
- Project ID: `prj_6oqEYWPnfn1kMRo798M21swUl2w2`
- Root: `masjid-display`
- Feature branch: `feat/masjid-display-plan-7`
- Upstream: `https://donaumoschee.vercel.app`

- [ ] **Step 1: Confirm exact branch HEAD and open/update a Draft PR to `main`**

Do not reuse PR #108.

Record the new PR number.

- [ ] **Step 2: Verify Preview deployments remain disabled**

Confirm the repository/project policy continues to deploy `main` only and does not create a PR/feature-branch Preview.

Record:
- exact feature-branch HEAD;
- current stable production deployment ID/state;
- current production attached `main` SHA;
- the main-only `vercel.json` policy.

Do not create a Preview and do not replace/promote production while the PR is open.

- [ ] **Step 3: Reconfirm server-only boundary in source and stable production**

Before merge:
- confirm no direct browser Supabase dependency;
- confirm no `NEXT_PUBLIC_PRAYERAPP_ORIGIN`;
- confirm stable production `/api/display-feed` and `/api/test-control` remain healthy as baseline evidence only.

After Planner merge:
- verify the new `main` production deployment is attached to the merged Plan 7 commit;
- verify `/api/display-feed` and `/api/test-control` against that deployment.

- [ ] **Step 4: Inspect runtime errors/logs after the merged `main` deployment**

No unexplained 5xx/runtime error cluster may remain on the deployed Plan 7 production release.

If production deployment fails, use rollback/follow-up repair; never enable PR Preview as a workaround.

---

### Task 5: Browser/live UI verification of fullscreen, diagnostics, and layout

**Timing under the main-only ruling:** execute deployed evidence after the Planner squash-merges Plan 7 and Vercel deploys the resulting `main` commit. Pre-merge semantic/unit/CSS evidence remains useful but does not substitute for this post-merge deployed check.

**Files:**
- Modify only if a real defect is discovered.
- Create/update: `docs/masjid-display/plan7-live-tv-certification.md`

- [ ] **Step 1: Verify normal deployed rendering at 100% zoom**

Record:
- mosque identity;
- date/Hijri;
- logical clock;
- content rotation;
- six-prayer strip;
- persistent Prayerapp QR;
- no stale overlay when current coverage exists.

- [ ] **Step 2: Verify fullscreen presentation mode**

On a real browser:
- activate with user gesture;
- browser chrome disappears when supported;
- control disappears;
- display uses the available screen;
- exit fullscreen;
- control returns;
- denied/unsupported path remains usable.

- [ ] **Step 3: Verify responsive browser viewports**

Required:
- 1920×1080;
- 2560×1440 or 3840×2160.

Check:
- no critical clipping;
- Arabic/German shaping;
- Prayer Strip readability;
- QR safe area;
- urgent/status overlays;
- fullscreen control placement before activation.

- [ ] **Step 4: Verify `?diagnostics=1`**

Confirm useful operational values and absence of secrets/private data.

- [ ] **Step 5: Record evidence and fix any actual defects**

Every code fix receives focused regression coverage before final certification.

---

### Task 6: Run real Admin Test Mode end-to-end against the deployed Plan 7 TV

**Timing under the main-only ruling:** execute against the merged Plan 7 `main` production deployment. No PR Preview is expected or permitted.

**Files:**
- Modify root/Test Mode/TV code only if a real defect is reproduced.
- Update: `docs/masjid-display/plan7-live-tv-certification.md`
- Update: `docs/masjid-display/test-mode-demo.md` with actual evidence only.

- [ ] **Step 1: Use the real authenticated Admin Test Mode**

Do not synthesize production-table content manually.

Verify representative state families:
- normal content;
- prayer approaching;
- prayer time now;
- waiting for Iqama;
- Iqama now;
- prayer in progress;
- first/additional Friday countdown;
- Jumuah now;
- urgent;
- special display;
- event;
- campaign with QR;
- campaign without QR;
- Azkar;
- offline visual;
- stale schedule;
- missing settings;
- long bilingual.

Execute all existing deterministic scenarios when practical.

- [ ] **Step 2: Verify live revision switching**

Switch directly between active scenarios and verify the latest state wins within the expected polling cadence.

- [ ] **Step 3: Verify Stop**

TV must return to the current real state, not replay the state from before Test Mode.

- [ ] **Step 4: Verify expiry**

Allow one scenario to expire and verify the same return-to-current-real-state behavior.

- [ ] **Step 5: Verify isolation**

Prove synthetic Test Mode data did not enter:
- production Feed;
- production content/prayer tables;
- TV LKG.

If a defect is found, reproduce it in automated coverage before fixing.

---

### Task 7: Perform physical target, QR, and network/wake certification

**Timing under the main-only ruling:** execute against the merged Plan 7 `main` production deployment after the independent Planner performs the approved squash merge.

**Files:**
- Update: `docs/masjid-display/physical-tv-certification.md`
- Update: `docs/masjid-display/plan7-live-tv-certification.md`

**Required physical release target:**
Amazon Fire TV / Silk or the actual browser/runtime used at the university.

Existing Samsung-TV evidence is secondary compatibility evidence.

- [ ] **Step 1: Record target hardware/runtime**

Capture:
- TV/display model if known;
- Fire TV device/runtime if used;
- browser name/version if available;
- resolution;
- browser zoom/scaling (target 100%);
- viewing distance.

- [ ] **Step 2: Verify fullscreen physically**

Use the remote/browser interaction to enter fullscreen/presentation mode.

Record whether browser chrome is fully removed. If the browser does not permit programmatic fullscreen, verify the documented fallback workflow.

A vendor-specific code workaround may be added only if the target hardware demonstrates a standards incompatibility and the workaround is narrowly isolated and regression-tested.

- [ ] **Step 3: Verify practical-distance readability**

Check:
- mosque/header;
- Arabic/German;
- clock;
- content;
- Prayer Strip;
- separated Iqama line;
- urgent/status overlays;
- QR safe area;
- pixel-shift does not clip essential content.

- [ ] **Step 4: Perform real QR scans**

Scan persistent Prayerapp QR with a phone/camera and confirm it resolves to:
`https://donaumoschee.vercel.app`

Run a safe HTTPS Campaign Test Mode scenario and scan its Campaign QR. Confirm the expected target.

Do not mark PASS from visual inspection alone.

- [ ] **Step 5: Perform real temporary network interruption**

After a valid snapshot/LKG exists:
- interrupt network;
- verify safe continued display/LKG behavior;
- restore network;
- verify automatic refresh/recovery;
- verify no stale countdown/test-state replay.

- [ ] **Step 6: Perform wake/visibility check**

Background/sleep the browser/device where possible, return it to visible state, and verify logical time/state refresh correctly.

- [ ] **Step 7: Record only actually executed PASS rows**

Anything not physically executed stays `NOT EXECUTED`; do not infer it from unit tests.

---

### Task 8: Final Plan 7 automated verification, Codex loop, and handoff

**Files:**
- Update: `docs/masjid-display/plan7-live-tv-certification.md`
- Update: `docs/masjid-display/production-certification.md`
- Update Plan 7 PR body with exact evidence.

- [ ] **Step 1: Run/observe final exact-head automated gates**

Required:
- root CI;
- Masjid Display Verification;
- Plan 3 Feed Verification if triggered/relevant;
- Security Scanners;
- Android TWA if triggered;
- TV tests;
- TV lint;
- TV typecheck;
- TV build;
- producer/consumer contract;
- existing two-app integration.

Do not claim green until the exact-head runs have completed successfully.

- [ ] **Step 2: Re-check forbidden boundaries**

Prove final source has:
- no TV Supabase runtime/client;
- no browser secrets;
- no TV prayer calculation runtime;
- no audio/adhan path;
- no vendor-UA fullscreen routing;
- no active legacy absolute-Iqama authority;
- no synthetic Test Mode → production Feed/LKG leak.

- [ ] **Step 3: Finish evidence docs**

Record:
- exact final HEAD;
- Plan 7 PR number;
- Vercel Preview deployment ID/URL;
- root production origin;
- TV project ID;
- browser viewport results;
- physical target/runtime evidence;
- fullscreen result;
- Prayer Strip readability result;
- Test Mode result;
- diagnostics result;
- QR scan result;
- offline/wake result;
- CI/security run IDs;
- any non-blocking operational follow-ups.

- [ ] **Step 4: Request the ONE end-of-plan GitHub Codex Review**

Only now, after every Plan 7 implementation and verification task is otherwise complete, request:
`@codex review`

Tell Codex to review the exact final HEAD against the Plan 7 design and implementation plan, with focus on:
- Fullscreen API correctness/security;
- cross-browser graceful degradation;
- keyboard/remote accessibility;
- Prayer Strip regressions;
- state/Test Mode/LKG isolation;
- diagnostics information exposure;
- deployment boundary/security;
- reliability of any fixes found during live testing.

- [ ] **Step 5: Inspect ALL Codex findings**

Do not filter by severity.

For each finding:
- validate it;
- fix legitimate root causes;
- add regression coverage where appropriate;
- rerun the affected verification.

Then request Codex Review again on the new exact HEAD.

Repeat until no legitimate finding remains.

- [ ] **Step 6: Final exact-head verification after the last Codex fix**

All required gates must correspond to the final HEAD.

- [ ] **Step 7: Stop before merge**

Keep Plan 7 PR open and unmerged.

Return the true final report to the independent Planner.

The Planner will independently inspect:
- exact HEAD;
- all Codex findings and how each was resolved;
- CI;
- Vercel evidence;
- live/physical evidence;
- long-term reliability of fixes.

Only the Planner decides APPROVED vs NOT APPROVED and performs any squash merge.

## 25-Minute / Checkpoint Reporting Rule

A session execution-window interruption is **not** Plan completion.

If ANY Plan 7 work remains, including implementation, tests, deployment, physical/user verification, documentation, Codex review, Codex fixes, or final exact-head checks, return:

`PLAN 7 NOT COMPLETE — CONTINUE REQUIRED`

Then report:
1. exact current HEAD;
2. completed Tasks/Steps;
3. current Task/Step;
4. work currently in progress;
5. latest verified CI/tests/Vercel evidence;
6. Codex status, if reached;
7. exact remaining work;
8. precise next action.

End with:

`Reply "continue" and I will resume from this exact checkpoint.`

Do not restart completed work after `continue`.
Do not re-plan.
Do not re-brainstorm.
Resume from the recorded checkpoint.

If only finalization remains, use:

`PLAN 7 NOT COMPLETE — FINALIZATION REMAINS`

and still request `continue`.

## True Final Report Rule

Only after every approved Plan 7 task is complete, all required verification is complete, the end-of-plan Codex loop is complete, every legitimate finding is resolved, and the final exact-head checks are green, return:

`PLAN 7 COMPLETE — FINAL REPORT`

This phrase must not be used earlier.

At the end of the true final report write:

`Copy this complete final report and send it to the Planner for independent approval review.`

Do not merge the PR yourself.
