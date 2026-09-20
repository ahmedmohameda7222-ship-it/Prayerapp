# Masjid Display Plan 6 — Live Preview, Settings Control, and End-to-End Verification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task in the current ChatGPT session. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deploy the existing Masjid Display as an independent live Vercel TV project, make all mosque-specific Prayer Engine/Iqama/Display tuning operator-controlled through Settings rather than hard-coded release gates, and verify the complete Admin → Feed → TV flow live.

**Architecture:** Keep Prayerapp and `masjid-display/` as independent Next.js applications in the same repository. Root Prayerapp remains the only Supabase/Admin/Prayer Engine authority; TV remains a read-only browser app that reaches root only through its server-side same-origin proxy using server-only `PRAYERAPP_ORIGIN`. Plan 6 removes the obsolete hard-coded historical-calibration approval gate from schedule commit actions while retaining preview, revision, stale-preview, auth, audit, and future-only safety.

**Tech Stack:** Next.js 16.3.3, React 19.2.8, TypeScript, Vitest, Supabase/Postgres, GitHub Actions, Vercel.

**Spec:** `docs/superpowers/specs/2026-09-21-masjid-display-plan-6-live-preview-design.md`

## Global Constraints

- Repository: `ahmedmohameda7222-ship-it/Prayerapp`.
- Branch: `feat/masjid-display`.
- Plan 6 BASE: `1bc8d6c205608d8086d334aa8ffe1300e6dda77e` (Plan 6 design commit; Plan 5 implementation HEAD before design was `7b53384f372ac4b5aacf71a09bc5d0e84a5c7880`).
- Existing PR: #108; keep Draft, open, unmerged; do not retarget.
- Do not create Plan 7 work inside Plan 6.
- Do not perform destructive real-target removal of legacy absolute-Iqama columns in Plan 6.
- Do not require historical timetable matching within ±1 minute for Plan 6 completion.
- Prayer calculation, Iqama, and Display tuning that belongs to mosque operation must be editable from Admin Settings; do not replace it with hard-coded mosque-specific values.
- Saving Prayer Engine settings must not silently mutate canonical schedule rows.
- Recalculation/extension must retain preview/confirm/revision/auth/audit/future-only safety.
- TV must not gain Supabase browser/runtime access, prayer calculation runtime, audio, or browser secrets.
- `PRAYERAPP_ORIGIN` is server-only, origin-only, and must not become `NEXT_PUBLIC_*`.
- Physical TV QA, physical QR scanning, and 24/72-hour soak are operational follow-ups and do not block Plan 6 completion; never falsely mark them executed.
- Use connected `@GitHub` and `@Vercel` capabilities. Do not claim local terminal commands were run unless actual execution evidence exists.
- If Vercel requires a user OAuth/authorization click, request only that click and resume immediately afterward; do not stop the implementation for design/review questions already decided here.

## Review Focus

- Removing the old production-profile gate must not weaken stale-preview/revision/auth/audit/future-only protections around schedule writes.
- TV Vercel configuration must never expose upstream origin as a browser secret or permit request-controlled SSRF.
- Admin Settings values must actually propagate into generated Feed/runtime behavior instead of only rendering in a form.
- Live Test Mode must never poison production Feed or LKG and Stop/expiry must return to the current real state.
- A live root with incomplete production data must produce the designed safe state; Plan 6 must not fabricate production rows merely to make the TV visually busy.

---

### Task 1: Replace the obsolete hard-coded Prayer Engine approval gate with operator-controlled preview/commit safety

**Files:**
- Modify: `lib/prayer-engine/production-approval.ts`
- Modify: `app/admin/prayer-engine/PrayerEngineAdmin.tsx`
- Modify: `app/admin/prayer-engine/actions.ts`
- Modify/Test: `app/admin/prayer-engine/__tests__/page.test.tsx`
- Modify/Test: `app/admin/prayer-engine/actions.test.tsx` if present; otherwise create focused action regression coverage in the existing prayer-engine test location.
- Modify/Test: `lib/prayer-engine/calendar-certification.test.ts`
- Modify: `docs/masjid-display/prayer-engine-calibration.md`
- Modify: `docs/masjid-display/production-certification.md`

**Interfaces:**
- Consumes: existing `PrayerCalculationSettings`, preview DTOs, revision checks, `commitScheduleExtension`, `commitFutureRecalculation`, Admin auth/audit.
- Produces: schedule extension/recalculation that is allowed after operator preview/confirmation without a compile-time `PRODUCTION_PRAYER_PROFILE_APPROVED=false` blocker.

- [ ] **Step 1: Write regression tests for the new policy**

Pin these behaviors:
- saving Prayer Engine settings remains separate from schedule mutation;
- schedule preview still works;
- commit does not fail merely because a hard-coded production-profile boolean is false/absent;
- stale preview/revision mismatch still fails;
- unauthorized commit still fails;
- recalculation remains future-only;
- UI no longer shows historical ±1-minute approval as a production blocker.

- [ ] **Step 2: Verify RED through the existing root test workflow**

Use the repository's existing Vitest/CI path for the focused tests. If direct execution is available, run the focused tests first. Otherwise push the failing tests and use GitHub Actions evidence. Expected: the new “no hard-coded calibration gate” assertion fails against current code.

- [ ] **Step 3: Remove only the obsolete hard-coded approval dependency**

Update `PrayerEngineAdmin.tsx` and the server actions so operator preview/confirmation is the release control. Do not remove:
- validation;
- auth;
- audit;
- settings revision checks;
- stale-preview checks;
- future-only recalculation rules;
- explicit confirmation in UI.

Keep historical calibration available as an optional comparison tool if useful, but change copy/docs so it is not a mandatory release gate.

- [ ] **Step 4: Update certification documentation without rewriting history**

In Plan 5 evidence docs, preserve the historical fact that the old certification was BLOCKED under the old rule, then add a clearly dated Plan 6 policy note:
- historical matching is optional reference;
- mosque approves the operational profile through Settings;
- physical/soak items remain not executed where applicable;
- these old rows no longer block Plan 6 completion.

Do not relabel historical unexecuted evidence as PASS.

- [ ] **Step 5: Verify GREEN and commit**

Expected: focused prayer-engine tests pass; root CI later confirms full safety.

Commit example:
`feat: make prayer calibration operator controlled`

---

### Task 2: Audit every mosque-specific runtime setting end-to-end and close real wiring gaps only

**Files:**
- Inspect/modify as needed: `app/admin/prayer-engine/PrayerEngineAdmin.tsx`
- Inspect/modify as needed: `app/admin/prayer-engine/actions.ts`
- Inspect/modify as needed: `lib/data/prayer-settings.ts`
- Inspect/modify as needed: `lib/prayer-engine/types.ts`
- Inspect/modify as needed: `lib/prayer-engine/validate-settings.ts`
- Inspect/modify as needed: `app/admin/masjid-display/page.tsx`
- Inspect/modify as needed: `app/admin/masjid-display/actions.ts`
- Inspect/modify as needed: `lib/data/masjid-display-settings.ts`
- Inspect/modify as needed: `lib/masjid-display/build-feed.ts`
- Inspect/modify as needed: `lib/data/mosque-settings.ts`
- Tests: existing prayer-settings, Admin Masjid Display, Feed contract/build tests.

**Interfaces:**
- Consumes: Admin forms/actions and database singleton settings.
- Produces: proven data path Settings → persisted root data → Feed v1 → TV runtime for all existing supported knobs.

- [ ] **Step 1: Build a settings matrix in tests/documentation**

Audit these fields:
- latitude, longitude, timezone;
- Fajr angle;
- Isha rule + angle/fixed minutes;
- Asr factor;
- high-latitude rule;
- six prayer offsets;
- five Iqama delays;
- five prayer in-progress durations;
- Azkar playlist;
- Prayerapp public URL.

For each, record the exact Admin field, persistence field, Feed/runtime consumer, and test proving propagation.

- [ ] **Step 2: Add failing propagation tests for any actual gap**

Do not add duplicate settings. Only create RED tests where a field is present in UI/storage but does not reach the correct runtime consumer, or where a required field from the approved design is genuinely missing.

- [ ] **Step 3: Implement the minimum missing wiring**

Reuse existing tables/types/actions. Do not create a second settings subsystem.

- [ ] **Step 4: Verify Iqama authority**

Assert:
`Iqama = stored final prayer start + configured delay`

Assert that legacy absolute-Iqama fields are not reintroduced as active app/TV authority.

- [ ] **Step 5: Verify GREEN and commit**

Commit example:
`test: certify settings driven masjid runtime`
or, if a real gap is fixed:
`fix: wire masjid settings through display runtime`

---

### Task 3: Prepare the TV package for an independent Vercel live-preview project

**Files:**
- Verify/modify: `masjid-display/.env.example`
- Verify/modify: `masjid-display/README.md`
- Verify/modify: `docs/masjid-display/deployment.md`
- Test: `masjid-display/lib/security-boundary.test.ts`
- Test: `masjid-display/app/api/display-feed/route.test.ts`
- Test: `masjid-display/app/api/test-control/route.test.ts`
- Test: `masjid-display/lib/upstream.ts` via existing route/security tests.

**Interfaces:**
- Consumes: server-only `PRAYERAPP_ORIGIN`.
- Produces: fixed allow-listed upstream calls for Feed and Test Control.

- [ ] **Step 1: Lock deployment configuration in tests/docs**

Required live-preview settings:
- project name: prefer `donaumoschee-tv` unless that name already exists;
- repository: `ahmedmohameda7222-ship-it/Prayerapp`;
- root directory: `masjid-display`;
- framework: Next.js;
- candidate branch: `feat/masjid-display`;
- `PRAYERAPP_ORIGIN=https://donaumoschee.vercel.app`.

- [ ] **Step 2: Re-run upstream security tests**

Prove:
- missing env fails closed;
- path/query/fragment/credentials in origin are rejected;
- request input cannot select another origin;
- only the two approved upstream paths are callable;
- no `NEXT_PUBLIC_PRAYERAPP_ORIGIN`.

- [ ] **Step 3: Update deployment documentation for Plan 6 preview**

Document preview deployment, branch, server env, rollback independence, and that destructive DB migration is not part of Plan 6.

- [ ] **Step 4: Commit**

Commit example:
`docs: prepare live masjid display deployment`

---

### Task 4: Create/configure the independent Vercel TV project and deploy the candidate

**External configuration:**
- Vercel team: `Ahmed's projects`
- Root Prayerapp project: `donaumoschee`
- Root production origin: `https://donaumoschee.vercel.app`
- TV project: `donaumoschee-tv` unless an existing correct TV project is discovered.

**Interfaces:**
- Consumes: Git repository and `masjid-display/` package.
- Produces: a READY Vercel deployment URL for the exact Plan 6 candidate commit.

- [ ] **Step 1: Inspect Vercel before creating anything**

Confirm whether a dedicated TV project already exists. Reuse it only if its Git repo/root directory/environment are correct.

- [ ] **Step 2: Create or correct the TV project**

Use connected Vercel write capability if available. Configure:
- Git repo `ahmedmohameda7222-ship-it/Prayerapp`;
- root directory `masjid-display`;
- Next.js detection;
- Git branch preview for `feat/masjid-display`.

If Vercel itself requires a user OAuth/authorization click, request that single click and continue immediately afterward. Do not turn it into a design blocker.

- [ ] **Step 3: Set server-only environment**

Set:
`PRAYERAPP_ORIGIN=https://donaumoschee.vercel.app`

Apply to the environment used by the candidate preview. Never expose the value under a `NEXT_PUBLIC_` key.

- [ ] **Step 4: Deploy exact current HEAD**

Record:
- exact commit SHA;
- Vercel project ID/name;
- deployment ID;
- preview URL;
- READY/ERROR status;
- build logs if failed.

- [ ] **Step 5: Fix any deployment defect by TDD/regression test, redeploy, and commit**

Do not weaken build/security checks to make Vercel green.

---

### Task 5: Live browser verification of the deployed TV and real root proxy

**Files:**
- Modify only if a real defect is found.
- Add targeted regression tests beside the failing runtime/component when needed.
- Create/update: `docs/masjid-display/plan6-live-preview-verification.md`

**Interfaces:**
- Consumes: deployed TV URL and real root origin.
- Produces: recorded live-preview evidence.

- [ ] **Step 1: Verify same-origin TV Feed proxy**

Request deployed:
- `/api/display-feed`
- `/api/test-control`

Record status, content type, Date/ETag behavior where present, and schema validation result. The browser must not call Supabase directly.

- [ ] **Step 2: Verify main TV page**

Use browser verification on the deployed URL:
- no fatal console errors;
- shell renders;
- logical clock advances;
- Prayer Strip renders when Feed provides valid schedule;
- safe stale/empty behavior appears instead of guessed prayer data if production data is incomplete;
- persistent Prayerapp QR is present when configured.

- [ ] **Step 3: Verify responsive viewports**

At minimum:
- 1920×1080;
- 2560×1440 or 3840×2160.

Check Arabic/German layout smoke behavior, clipping, prayer strip, urgent area, Test Mode badge, and QR composition.

These are browser checks only; do not call them physical-TV certification.

- [ ] **Step 4: Verify diagnostics**

Open `?diagnostics=1` and confirm only non-sensitive operational data is shown.

- [ ] **Step 5: Commit evidence/fixes**

Commit example:
`test: verify live masjid display preview`

---

### Task 6: Prove real Admin Test Mode → deployed TV end-to-end

**Files:**
- Inspect/modify if defective: `app/admin/masjid-display-test/page.tsx`
- Inspect/modify if defective: `app/admin/masjid-display-test/actions.ts`
- Inspect/modify if defective: `app/api/public/masjid-display-test-control/route.ts`
- Inspect/modify if defective: `masjid-display/lib/runtime/use-test-control.ts`
- Tests: existing Test Mode integration/certification suites.
- Update: `docs/masjid-display/plan6-live-preview-verification.md`

**Interfaces:**
- Consumes: authenticated root Admin mutation path and public sanitized Test Control.
- Produces: visible deployed-TV scenario transitions without production Feed/LKG contamination.

- [ ] **Step 1: Start a safe Test Mode scenario through the real Admin path**

Use an existing deterministic scenario. Do not write synthetic data into prayer/content production tables.

- [ ] **Step 2: Confirm deployed TV switches within the existing polling target**

Verify badge/scenario/UI transition.

- [ ] **Step 3: Switch scenarios**

Verify the deployed TV follows the current revision and does not revert because of a slower stale poll.

- [ ] **Step 4: Stop Test Mode**

Verify TV recomputes current real state using current logical time and current real snapshot.

- [ ] **Step 5: Verify isolation**

Prove synthetic Test payload did not enter production Feed or LKG.

- [ ] **Step 6: Fix any defect with focused regression coverage and commit**

Commit example:
`fix: harden deployed test mode flow`

---

### Task 7: Final Plan 6 verification, documentation, and Codex review

**Files:**
- Update: `docs/masjid-display/plan6-live-preview-verification.md`
- Update: `docs/masjid-display/production-certification.md`
- Update: PR #108 title/body if needed to include Plan 6 while remaining Draft.

**Interfaces:**
- Consumes: final repository HEAD, Vercel deployment evidence, GitHub Actions.
- Produces: auditable Plan 6 completion report ready for Plan 7 planning.

- [ ] **Step 1: Run/observe full automated gates on final HEAD**

Required evidence:
- root CI;
- Masjid Display Verification;
- Plan 3 Feed Verification where triggered/relevant;
- Security Scanners;
- TV tests/lint/typecheck/build;
- producer/consumer contract;
- live two-app integration.

Record Android TWA separately if the known SDK setup issue persists; do not falsely state “all workflows green.”

- [ ] **Step 2: Run final forbidden-boundary checks**

Prove:
- TV has no Supabase runtime;
- no `new Audio`/`<audio>`;
- no prayer calculation runtime in TV;
- no browser secret/upstream env exposure;
- no active application consumer of legacy absolute Iqama fields;
- no hard-coded historical calibration approval gate blocking operator schedule commit.

- [ ] **Step 3: Update Plan 6 verification record**

Record:
- Vercel project/deployment/URL;
- exact final HEAD;
- root origin;
- Settings audit result;
- live Feed result;
- Test Mode result;
- viewport/browser result;
- all CI/security run IDs;
- any operational follow-ups not executed.

Plan 6 completion must not depend on physical TV/QR/soak or destructive production cutover.

- [ ] **Step 4: Request actual GitHub Codex Review on PR #108**

Comment `@codex review` and state:
- Plan 6 BASE `1bc8d6c205608d8086d334aa8ffe1300e6dda77e`;
- exact final HEAD;
- review against the Plan 6 spec and plan;
- focus on correctness, security, settings propagation, upstream boundary, live-deploy regressions, Test Mode/LKG isolation, and removal of the obsolete calibration gate without weakening schedule-write safety.

- [ ] **Step 5: Read actual Codex findings and fix every legitimate Critical/Important/security/correctness issue**

Repeat CI + Codex review until clean. Do not rely on a summary that is not tied to exact final HEAD.

- [ ] **Step 6: Confirm PR state and stop**

PR #108 must remain Draft/open/unmerged unless the user explicitly instructs otherwise.

Final state should be:

`PLAN 6 COMPLETE — LIVE PREVIEW + SETTINGS CONTROL VERIFIED`

Operational follow-ups may remain explicitly `NOT EXECUTED` without blocking Plan 6:
- destructive production DB cutover;
- physical TV QA;
- physical QR scans;
- 24/72-hour soak.

Do not implement Plan 7. Stop and report the final evidence so the user can start Plan 7 separately.
