# Masjid Display Plan 5 — Integration, Deployment, Security, and Production Certification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Integrate the Prayerapp and independent Masjid Display deliverables, make CI enforce both projects and their contract, certify prayer calculations/state/offline/Test Mode behavior, document independent deployment/rollback, and complete physical TV readiness before declaring production-ready.

**Architecture:** Production readiness is a gated certification, not merely a successful build. Automated tests prove deterministic religious-state and contract behavior; database dry-runs prove safe migration/cutover; security checks prove the display is read-only and safe; physical/soak QA proves real TV behavior. Prayerapp and Masjid Display deploy independently but remain compatible through Feed schema versioning.

**Tech Stack:** Existing GitHub Actions CI, root Next.js/Vitest/Supabase checks, nested Masjid Display Next.js/Vitest checks, Vercel independent-project deployment, manual Samsung/TV physical QA.

## Branch / prerequisite assumptions

- Continue on `feat/masjid-display` after Plans 1–4 are individually green.
- Root feed schema is v1 and TV consumer explicitly supports v1.
- Do not declare production-ready until every critical certification row below is evidenced.
- Physical TV steps may be executed by a human, but results must be recorded in-repo.

## Task 1: Add cross-project contract compatibility test

**Files:**
- Create: `scripts/verify-masjid-display-contract.mjs`
- Create: `lib/__tests__/masjid-display-cross-project-contract.test.ts`
- Reuse: `lib/masjid-display/__fixtures__/feed-v1.json`
- Reuse: `masjid-display/lib/__fixtures__/feed-v1.json`

1. Write a failing test that verifies producer and consumer golden fixtures are semantically identical and both declare schema v1.
2. Script/test must fail when required fields diverge or one side changes schema without the other acknowledging it.
3. Do not compare whitespace/key order; compare parsed semantics and validator acceptance.
4. Run `npx vitest run lib/__tests__/masjid-display-cross-project-contract.test.ts`.
5. Commit: `test: enforce display feed producer consumer contract`.

## Task 2: Extend CI to test both applications

**Files:**
- Modify: `.github/workflows/ci.yml`
- Create/modify: `lib/__tests__/masjid-display-ci-contract.test.ts`

1. First add a source/CI contract test requiring the Masjid Display checks before modifying CI.
2. Add deterministic CI steps/jobs for root:
   - install with lockfile;
   - root tests;
   - lint;
   - typecheck;
   - build;
   - existing Supabase/migration checks.
3. Add nested `masjid-display/` steps:
   - `npm ci`;
   - `npm test`;
   - `npm run lint`;
   - `npm run typecheck`;
   - `npm run build`.
4. Run the cross-project contract verifier in CI.
5. Preserve existing required checks/security workflows; do not weaken them to make the feature pass.
6. Commit: `ci: certify masjid display project`.

## Task 3: Add an automated religious-state certification suite

**Files:**
- Create: `masjid-display/lib/state/certification.test.ts`
- Reuse: state modules from Plan 4

1. Build a table-driven suite covering all five obligatory prayers and Friday with one-second boundary assertions.
2. Required cases:
   - T-10 approach;
   - exact prayer instant;
   - Iqama delay 0, 1, 2, and larger;
   - two-minute Iqama Now;
   - prayer-in-progress duration starts at original Iqama instant;
   - Sunrise creates no state;
   - midnight/day rollover;
   - Friday Dhuhr → primary Jumuah;
   - extra Jumuah manual services;
   - T-60 first Friday focus;
   - T-10 next-service focus;
   - 30-minute holds and overlap preemption;
   - wake jump over expired states.
3. Run only the certification suite and make failures human-readable with scenario/date/time labels.
4. Commit: `test: certify prayer and friday display state boundaries`.

## Task 4: Add Prayer Engine calendar/DST certification suite

**Files:**
- Create: `lib/prayer-engine/calendar-certification.test.ts`
- Reuse: `lib/prayer-engine/fixtures/degendorf-reference.ts`

1. Cover winter, summer, Europe/Berlin DST start/end, solstice-adjacent dates, leap day where relevant, December/January transition, and repeated deterministic generation.
2. Assert final ceil-to-minute behavior and per-prayer offsets.
3. Verify no code applies a hard-coded +1/+2 hour DST adjustment.
4. Fail the suite if reviewed historical/reference fixture delta is unexplained and >1 minute.
5. Commit: `test: certify prayer engine calendar behavior`.

## Task 5: Perform historical calibration sign-off

**Files:**
- Create: `docs/masjid-display/prayer-engine-calibration.md`

1. In a non-production/local/staging environment, run Admin Calibration against representative existing published historical schedule rows.
2. Record:
   - exact coordinates/profile values;
   - library version;
   - date ranges sampled;
   - per-prayer delta summary;
   - each >1-minute delta and its explanation/resolution.
3. Do not adjust offsets solely to make one isolated day match; profile changes require evidence across representative periods.
4. The document must end with either `PASS` plus evidence or `BLOCKED` plus unresolved discrepancies. Never fabricate a PASS.
5. Commit the evidence only after review: `docs: record prayer engine calibration evidence`.

## Task 6: Dry-run database migrations and destructive Iqama cutover

**Files:**
- Create: `docs/masjid-display/migration-certification.md`
- Review all new `supabase/migrations/20260915*.sql`

1. Create/reset a local database from the entire migration chain.
2. Seed/restore a production-like snapshot containing historical prayer rows and Maghrib Program fields.
3. Apply additive settings/content/test migrations and verify row counts/data.
4. Verify root code has zero active references to legacy absolute-Iqama fields before applying the drop migration.
5. Apply the drop migration and prove:
   - six daily prayer schedule values unchanged;
   - history unchanged;
   - Maghrib Program retained;
   - Jumuah retained;
   - new delay settings remain canonical.
6. Record commands, row counts, checksums/sample comparisons, and PASS/BLOCKED result.
7. Commit: `docs: certify masjid display database migration`.

## Task 7: Add Feed/LKG/offline end-to-end certification tests

**Files:**
- Create: `masjid-display/lib/runtime/offline-certification.test.tsx`
- Create: `app/api/public/masjid-display/route.integration.test.ts` if the repo's route-test harness supports it

1. Test full chain with controlled responses:
   - initial 200 accepted;
   - 304 retains LKG;
   - timeout/5xx retains LKG;
   - malformed 200 rejected;
   - unsupported schema rejected;
   - corrupt local cache discarded;
   - reconnect refresh;
   - wake/visibility refresh;
   - local expiration of announcement/event/campaign/urgent while offline;
   - prayer horizon valid;
   - prayer horizon exhausted → no guessed prayer state + warning.
2. Assert rejected responses never overwrite LKG.
3. Commit: `test: certify display offline recovery behavior`.

## Task 8: Add real-TV Test Mode integration certification

**Files:**
- Create: `masjid-display/lib/runtime/test-mode-certification.test.tsx`
- Create: `docs/masjid-display/test-mode-demo.md`

1. Automated tests:
   - Admin state active → TV test endpoint/proxy → override within next ~2-second poll;
   - synthetic countdown ticks;
   - production LKG is unchanged;
   - Test Mode badge present;
   - persistent Prayerapp QR remains;
   - Stop returns to freshly resolved real state;
   - 15-minute auto-expiry returns to real state;
   - Extend +15 changes expiry only.
2. Manual demo checklist lists every Admin scenario and expected TV presentation so the university demo can be rehearsed without real data.
3. Explicitly state synthetic data is expected in this mode and must never be saved into prayer/content production tables.
4. Commit: `test: certify admin controlled tv test mode`.

## Task 9: Security boundary review

**Files:**
- Create: `docs/masjid-display/security-review.md`
- Add/modify: security tests under `lib/__tests__/` and `masjid-display/lib/__tests__/` as findings require

1. Review from an attacker perspective:
   - TV public domain has no Admin/login/mutation surface;
   - TV browser bundle contains no Supabase service/anon dependency unless explicitly harmless and needed (design target: none);
   - public feed/test endpoints expose only allowlisted display data;
   - Admin Test Mode writes require existing Admin authorization;
   - direct database policy cannot be used to mutate test/settings tables anonymously;
   - proxy cannot be turned into arbitrary SSRF by user-controlled upstream URL;
   - URLs rendered into QR are treated as data, not HTML;
   - dynamic content is React-escaped/no unsafe HTML sink;
   - diagnostics exposes no secrets.
2. Reuse existing security-hardening conventions instead of weakening CSP/headers.
3. Record findings and residual risks. Fix confirmed defects with regression tests before PASS.
4. Commit: `docs: certify masjid display security boundary`.

## Task 10: Add deployment and rollback documentation

**Files:**
- Create: `masjid-display/README.md`
- Create: `docs/masjid-display/deployment.md`
- Modify: `.env.example` only if root feed/deployment settings require documented variables
- Review: `masjid-display/.env.example`

1. Document two separate Vercel projects:
   - Prayerapp root directory `/`;
   - Masjid Display root directory `masjid-display/`.
2. Document display server env for Prayerapp upstream origin; browser must not receive a secret.
3. Document feed schema compatibility/deploy order: backward-compatible v1 producer changes first; breaking changes require new schema support before producer switch.
4. Document independent rollback for root and TV projects.
5. Document first boot, cache behavior, network outage behavior, and diagnostics access.
6. Commit: `docs: document masjid display deployment and rollback`.

## Task 11: Responsive/physical readability certification matrix

**Files:**
- Create: `docs/masjid-display/physical-tv-certification.md`

1. Record test devices/viewports, at minimum:
   - 32-inch 1080p reference/minimum QA target;
   - at least one larger 16:9 TV/display;
   - 4K viewport/device if available.
2. For each, verify:
   - no hard-coded 32-inch assumptions;
   - fluid scaling and adaptive one/two-card composition;
   - Arabic shaping/RTL correct;
   - German text does not clip;
   - Prayer strip readable;
   - main clock/prayer/countdown readable at practical mosque distance;
   - safe area survives TV/browser overscan;
   - persistent Prayerapp QR scans from practical distance;
   - Campaign QR scans when displayed;
   - Urgent bar readable;
   - long AR/DE test scenario remains usable;
   - pixel shift is not visually distracting and does not clip content.
3. Record screenshots/photos only where repository policy/privacy permits; the written result must still identify PASS/BLOCKED per item.
4. Do not shrink essential text below the chosen responsive minimum merely to force two cards.
5. Commit actual QA evidence: `docs: record physical tv readability certification`.

## Task 12: Samsung/browser wake and long-duration soak certification

**Files:**
- Create: `docs/masjid-display/soak-test.md`

1. Run the display continuously for an initial 24-hour test; extend to 72 hours before final production sign-off when practical.
2. Exercise:
   - idle for hours;
   - TV/browser sleep and wake;
   - visibility/background timer throttling;
   - network disconnect/reconnect;
   - Prayer/Friday synthetic Test Mode transitions;
   - repeated 60-second feed polls and ~2-second test-control polls while Test Mode is active;
   - memory stability/no progressive UI slowdown;
   - watchdog does not cause normal periodic reloads.
3. Record start/end versions, device/browser, failures/recoveries, and PASS/BLOCKED.
4. Any black-screen, stale-transient replay, timer-based incorrect prayer state, or uncontrolled reload is release-blocking.
5. Commit evidence when completed.

## Task 13: Add final production certification checklist

**Files:**
- Create: `docs/masjid-display/production-certification.md`

1. Create a table with evidence links/status for:
   - Prayer Engine calibration — PASS required;
   - DB migration dry-run — PASS required;
   - root unit/integration tests — PASS;
   - TV state-machine tests — PASS;
   - Feed contract/security tests — PASS;
   - offline/LKG tests — PASS;
   - Admin/Test Mode tests — PASS;
   - browser wake/recovery tests — PASS;
   - responsive/32-inch reference physical QA — PASS;
   - larger/4K adaptive QA — PASS or explicitly documented available-device limitation before release decision;
   - QR scan tests — PASS;
   - 24–72h soak — PASS;
   - security review — PASS.
2. Do not mark any row PASS without linked evidence or executed command/result.
3. Release status is `BLOCKED` if any critical row is unresolved.
4. Commit: `docs: add masjid display production certification gate`.

## Task 14: Final repository verification

1. Root: `npm ci && npm test && npm run lint && npx tsc --noEmit && npm run build`.
2. TV: `cd masjid-display && npm ci && npm test && npm run lint && npm run typecheck && npm run build`.
3. Database: `supabase db reset` and migration certification checks.
4. Run `node scripts/verify-masjid-display-contract.mjs`.
5. Grep forbidden final-state patterns:
   - legacy absolute Iqama fields in active application code;
   - audio imports/components under `masjid-display/`;
   - Supabase client imports under `masjid-display/`;
   - direct TV mutation APIs.
6. Verify Admin Test Mode can be stopped and production display immediately resolves current real state.
7. Verify production Feed stays v1-compatible with deployed TV build.
8. If anything fails, fix through TDD and rerun the entire affected certification gate; do not waive failures.

## Completion standard

The Masjid Display feature is production-ready only when the automated suite is green **and** the certification evidence records critical manual gates as PASS. A green build alone is insufficient. The system must demonstrate accurate/calibrated prayer generation, correct deterministic state transitions, safe delay-derived Iqama, robust offline/wake recovery, safe public/read-only boundaries, reliable Admin-driven Test Mode, persistent app QR behavior, and readable responsive TV presentation.

## Execution order across all five plans

1. `2026-09-15-masjid-display-plan-1-prayer-engine-db.md`
2. `2026-09-15-masjid-display-plan-2-admin-test-control.md`
3. `2026-09-15-masjid-display-plan-3-display-feed.md`
4. `2026-09-15-masjid-display-plan-4-tv-runtime-ui.md`
5. This integration/certification plan.

Do not start a later plan with prerequisite failures outstanding.