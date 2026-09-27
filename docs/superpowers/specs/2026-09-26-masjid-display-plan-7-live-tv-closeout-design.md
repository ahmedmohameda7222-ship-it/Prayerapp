# Masjid Display Plan 7 — Cross-Browser TV Presentation and Live Certification Design

**Status:** Implementation complete for the pre-merge code path; post-merge `main` live/physical certification pending.

**Repository:** `ahmedmohameda7222-ship-it/Prayerapp`

**Plan 7 branch:** `feat/masjid-display-plan-7`

**Plan 7 base / current `main`:** `a38cc86c57e9955720b18d4707c69dadc1d11e0b`

## Context

Plans 1–6 were squash-merged to `main` in PR #108. The root Prayerapp production project and the separate TV project are now live from the same merged commit.

Current production topology:

- Root Prayerapp project: `donaumoschee`
- Root production origin: `https://donaumoschee.vercel.app`
- TV project: `donaumoschee-tv`
- TV production origin: `https://donaumoschee-tv.vercel.app`
- TV project root directory: `masjid-display`
- TV server-only upstream configuration: `PRAYERAPP_ORIGIN=https://donaumoschee.vercel.app`
- TV production deployment is already proven to return the real Feed v1 and Test Control endpoints.

A first real physical-TV check also proved that the TV renderer works on a television browser at 100% zoom. That check exposed two real presentation issues:

1. browser chrome/tab/address-bar remains visible in ordinary browser mode;
2. the derived Iqama line in the Prayer Strip is visually cramped against the prayer time at real TV viewing scale.

Plan 7 is the final live-TV presentation/certification plan. It is not a redesign of the Prayer Engine, Feed, or TV state machine.

## Goal

Make the existing Masjid Display practical for unattended big-screen use across modern TV/browser environments, then certify the real Admin → Feed/Test Control → TV path on deployed infrastructure and physical hardware.

The implementation must remain browser-generic. Amazon Fire TV / Silk is an important real target because it is expected to be used at the university, but no behavior may be hard-coded to Amazon, Samsung, or a specific TV vendor.

## Architectural Decisions

### 1. Cross-browser fullscreen uses standards and feature detection

The TV app will expose a small presentation-mode control only while the page is not fullscreen.

The control:

- is activated by a real user gesture such as click, Enter, or remote selection;
- calls the standard Fullscreen API on the display root/document element when supported;
- requests hidden navigation UI when the browser supports that option;
- listens to `fullscreenchange` and `fullscreenerror`;
- disappears while fullscreen is active;
- reappears when fullscreen exits;
- shows a concise fallback instruction when the browser does not expose or allow Fullscreen API.

The implementation must not:

- auto-enter fullscreen on page load;
- use user-agent sniffing for Samsung/Amazon/Chrome;
- assume a vendor-prefixed API unless a narrowly scoped compatibility fallback is actually required by tested target hardware;
- trap the user in fullscreen;
- interfere with content rotation, Test Mode, QR, prayer states, keyboard/remote focus, or diagnostics.

Browser fullscreen is a presentation enhancement. The core display must remain fully functional when fullscreen is unavailable.

### 2. Remote-friendly operation is part of the fullscreen control

The presentation control must be reachable with ordinary focus navigation and must work with:

- mouse/touch click;
- keyboard Enter/Space;
- TV remote activation as exposed by the browser.

Do not introduce a custom remote-key framework just for fullscreen.

The control should be visually obvious during setup but unobtrusive during normal use. It must not become part of the rotating content scheduler.

### 3. Prayer Strip readability is corrected without changing prayer authority

The current runtime authority remains:

`Iqama = stored final prayer start + configured delay`

Plan 7 changes only presentation.

For Fajr, Dhuhr on non-Friday days, Asr, Maghrib, and Isha:

- prayer time remains the dominant number;
- Iqama delay is rendered on its own visually separated line/block;
- typography and spacing must be readable at practical TV distance;
- the layout must remain responsive and avoid clipping/overlap at 1920×1080 and larger 16:9 viewports.

Sunrise remains informational and has no Iqama.

Friday Dhuhr/Jumuah behavior must remain unchanged.

No legacy absolute-Iqama database field may be reintroduced as a runtime source.

### 4. Vercel deploys `main` only; Plan 7 uses a two-stage certification flow

Plan 7 development happens on `feat/masjid-display-plan-7`, based on the current merged `main`.

**User-approved deployment policy (2026-09-26): Vercel must not create PR/feature-branch Preview deployments. Only `main` may deploy.** The repository-level `vercel.json` already enforces this with `"**": false` and `"main": true`.

Therefore the Plan 7 certification flow is intentionally split:

1. implement Plan 7 on the feature branch;
2. keep Vercel production unchanged while the PR is open;
3. complete exact-head automated CI/security, source-boundary verification, documentation, and final pre-merge code review on the feature branch;
4. return a pre-merge report to the independent Planner;
5. only the Planner may approve and squash-merge the PR to `main`;
6. allow the normal Vercel `main` deployment to produce the Plan 7 production candidate;
7. verify that deployed `main` SHA, Feed/Test Control, runtime logs, browser/fullscreen/diagnostics, Admin Test Mode, and physical TV/QR/network/wake behavior;
8. fix any post-merge defect through a new reviewed change rather than bypassing the main-only policy.

No PR Preview is expected, required, or permitted for Plan 7 under this policy. No browser Supabase access or secret is introduced.

**Ruling:** the original preview-before-merge sequence is superseded because it conflicts with the explicit main-only deployment policy. Cost if wrong: live defects can only be discovered after the Planner merges to `main`, so rollback/follow-up readiness is mandatory.

### 5. Physical target matrix is generic

Certification must describe browser/runtime, resolution, zoom/scaling, and hardware rather than relying on brand-specific code.

Required software/browser targets:

- desktop Chromium-family browser at 1920×1080;
- one larger 16:9 viewport, preferably 2560×1440 or 3840×2160.

Required physical target for final university release:

- Amazon Fire TV / Silk or the actual browser/runtime that will be used on the university display.

Existing Samsung-browser evidence may be retained as secondary compatibility evidence, not as the implementation target.

### 6. Test Mode is the live state-machine certification tool

Plan 7 reuses the existing Admin Test Mode. It does not create a second test harness.

Live verification must prove representative prayer, Friday, content, failure, and long-bilingual states on the deployed TV. The implementation should execute all existing deterministic scenarios when practical; at minimum, every distinct rendering/state family must be physically or browser-verified.

Required behavioral invariants:

- Test Mode badge is visible only while active;
- scenario changes follow the latest revision;
- Stop returns to the current real state;
- expiry returns to the current real state;
- synthetic payload never enters production Feed or LKG;
- persistent Prayerapp QR remains independent from Campaign QR;
- offline/stale/missing-settings scenarios remain fail-safe.

### 7. QR verification is real, not inferred

The persistent Prayerapp QR must be scanned with a real phone/camera and resolve to the configured Prayerapp URL.

A Campaign QR must also be verified using a safe Test Mode campaign with an HTTPS URL.

A rendered QR or unit test is not enough evidence for physical scan certification.

### 8. Offline/wake/reconnect is verified on the deployed TV

Plan 7 must verify:

- valid cached/LKG content survives a temporary network interruption;
- no guessed prayer state is invented when coverage is unavailable;
- reconnect triggers refresh;
- visibility/wake resumes logical time and refreshes current state;
- no replay of expired Test Mode or old religious-state countdown occurs.

Use Test Mode for deterministic visuals, but include at least one real browser/network interruption check on the target TV/runtime when practical.

### 9. Diagnostics remain maintenance-only and non-sensitive

`?diagnostics=1` remains an opt-in maintenance view.

It may show operational fields such as schema version, snapshot revision, generated time, last sync, clock offset, state, coverage, LKG/offline/Test flags, and validation status.

It must not expose:

- Supabase keys;
- admin/session data;
- service-role credentials;
- upstream secrets;
- user data;
- Prayer Engine private configuration not already intended for public display.

### 10. Plan 7 does not perform the destructive legacy-Iqama cutover

The five legacy absolute-Iqama columns remain compatibility-only and are not runtime authority.

Their destructive removal is not required to certify the TV presentation layer and is excluded from Plan 7 unless the user separately gives explicit destructive-migration authorization.

Do not invent a Plan 8 merely because those columns remain. They can be treated as a later maintenance migration when explicitly approved.

### 11. New Supabase SQL must never be left unapplied

Plan 7 is not expected to need database changes.

If a legitimate Plan 7 defect requires a new non-destructive Supabase migration:

- write regression evidence first;
- create the migration;
- apply it to the real Prayerapp Supabase target during the same implementation task;
- verify the exact applied migration/state;
- record evidence.

Do not leave new required SQL only in the repository.

Any destructive migration still requires explicit authorization before execution.

## Completion Standard

Plan 7 is complete only when:

- generic fullscreen/presentation mode is implemented and verified;
- Prayer Strip Iqama readability is corrected;
- exact-head automated checks are green;
- the main-only Vercel deployment policy is preserved before merge, and the post-merge `main` TV deployment/endpoints are healthy;
- diagnostics are safe;
- Test Mode end-to-end behavior is verified;
- physical target evidence is recorded for the actual release browser/runtime;
- persistent Prayerapp QR and Campaign QR have real scan evidence;
- offline/reconnect/wake behavior is verified;
- all legitimate end-of-plan Codex findings are resolved and the final exact-head review is clean;
- a pre-merge authorization report is ready for independent Planner review, and after the Planner merge the final production-certification report is completed.

A 24/72-hour soak remains an operational reliability follow-up and is not a Plan 7 completion blocker unless the user explicitly promotes it to a release gate.

## Non-Goals

Plan 7 must not:

- rebuild the TV app;
- redesign Prayer Engine calculations;
- change Feed v1 without a demonstrated defect;
- add audio/adhan playback;
- add direct Supabase access to the TV browser;
- add vendor-specific Samsung or Fire TV code without demonstrated necessity;
- remove legacy absolute-Iqama columns destructively;
- merge its own PR;
- start a new plan automatically.
