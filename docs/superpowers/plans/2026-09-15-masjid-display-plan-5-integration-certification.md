# Masjid Display Plan 5 — Integration, Deployment, Security, and Production Certification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate Prayerapp and the independent Masjid Display, enforce their contract in CI, certify prayer calculation/state/offline/Test Mode/security behavior, document independent deployment/rollback, and record physical TV/QR/soak evidence before any production-ready claim.

**Architecture:** Production readiness is an evidence gate, not a successful build. Automated tests prove deterministic cross-project contracts and religious/runtime boundaries; local/staging database and calibration exercises prove migration/calculation safety; security review proves read-only public boundaries; physical TV and soak testing prove actual browser/display behavior. Root Prayerapp and `masjid-display/` deploy independently but stay compatible through Feed schema versioning.

**Tech Stack:** Existing GitHub Actions, root Next.js/Vitest/Supabase toolchain, nested Masjid Display Next.js/Vitest toolchain, Vercel separate-project deployment, physical Samsung/TV browser QA.

**Spec:** `docs/superpowers/specs/2026-09-15-masjid-display-design.md`

## Global Constraints

- Do not weaken existing required CI/security checks.
- Feed producer and consumer both support schema version `1` before deployment.
- Root and TV projects remain independently deployable/rollbackable.
- No production-ready claim without recorded Prayer Engine calibration and database migration evidence.
- Any unexplained prayer-calculation delta greater than one minute is release-blocking.
- Any black screen, stale transient prayer replay, guessed prayer time, uncontrolled reload loop, or Test Mode leakage into production LKG is release-blocking.
- Physical UI must be responsive/adaptive/fluid; 32-inch 1080p is a minimum/reference QA target, not a hard-coded target.
- Persistent Prayerapp QR and Campaign QR must be physically scanned in QA.
- Initial soak is at least 24 hours; extend to 72 hours before final release when practical.
- Manual evidence documents begin `BLOCKED` until the corresponding check is actually executed and recorded; never fabricate PASS.

---

### Task 1: Enforce producer/consumer Feed v1 compatibility and both builds in CI

**Files:**
- Create: `scripts/verify-masjid-display-contract.mjs`
- Create: `lib/__tests__/masjid-display-cross-project-contract.test.ts`
- Modify: `.github/workflows/ci.yml`
- Create: `lib/__tests__/masjid-display-ci-contract.test.ts`

**Interfaces:**
- Consumes: root golden `lib/masjid-display/__fixtures__/feed-v1.json`, TV golden `masjid-display/lib/__fixtures__/feed-v1.json`.
- Produces: `node scripts/verify-masjid-display-contract.mjs` exit 0 only when semantic fixtures/schema match; CI checks both projects.

- [ ] **Step 1: Write the failing cross-project contract test**

```ts
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const readJson = (path: string) => JSON.parse(readFileSync(path, "utf8"));

describe("Masjid Display producer/consumer contract", () => {
  it("keeps Feed v1 golden fixtures semantically identical", () => {
    const producer = readJson("lib/masjid-display/__fixtures__/feed-v1.json");
    const consumer = readJson("masjid-display/lib/__fixtures__/feed-v1.json");
    expect(producer.schemaVersion).toBe(1);
    expect(consumer.schemaVersion).toBe(1);
    expect(consumer).toEqual(producer);
  });
});
```

- [ ] **Step 2: Create the verifier script**

```js
import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";

const producer = JSON.parse(await readFile("lib/masjid-display/__fixtures__/feed-v1.json", "utf8"));
const consumer = JSON.parse(await readFile("masjid-display/lib/__fixtures__/feed-v1.json", "utf8"));
assert.equal(producer.schemaVersion, 1);
assert.equal(consumer.schemaVersion, 1);
assert.deepEqual(consumer, producer);
console.log("Masjid Display Feed v1 producer/consumer contract: PASS");
```

- [ ] **Step 3: Write a failing CI-source contract test before editing CI**

```ts
it("CI verifies root, TV, and cross-project contract", () => {
  const yaml = readFileSync(".github/workflows/ci.yml", "utf8");
  expect(yaml).toContain("scripts/verify-masjid-display-contract.mjs");
  expect(yaml).toContain("working-directory: masjid-display");
  expect(yaml).toContain("npm run typecheck");
});
```

Run: `npx vitest run lib/__tests__/masjid-display-cross-project-contract.test.ts lib/__tests__/masjid-display-ci-contract.test.ts`

Expected: cross-project test may PASS if fixtures already match; CI contract FAILS until workflow is changed.

- [ ] **Step 4: Extend CI without weakening existing jobs**

Add nested-project commands equivalent to:

```yaml
- name: Install Masjid Display
  working-directory: masjid-display
  run: npm ci
- name: Test Masjid Display
  working-directory: masjid-display
  run: npm test
- name: Lint Masjid Display
  working-directory: masjid-display
  run: npm run lint
- name: Typecheck Masjid Display
  working-directory: masjid-display
  run: npm run typecheck
- name: Build Masjid Display
  working-directory: masjid-display
  run: npm run build
- name: Verify Masjid Display contract
  run: node scripts/verify-masjid-display-contract.mjs
```

Preserve all existing root/security/Supabase checks and permissions.

- [ ] **Step 5: Run and commit**

Run: `node scripts/verify-masjid-display-contract.mjs && npx vitest run lib/__tests__/masjid-display-cross-project-contract.test.ts lib/__tests__/masjid-display-ci-contract.test.ts`

Expected: PASS.

```bash
git add scripts/verify-masjid-display-contract.mjs lib/__tests__/masjid-display-cross-project-contract.test.ts lib/__tests__/masjid-display-ci-contract.test.ts .github/workflows/ci.yml
git commit -m "ci: certify masjid display producer consumer contract"
```

### Task 2: Add automated Prayer Engine and display-state certification suites

**Files:**
- Create: `lib/prayer-engine/calendar-certification.test.ts`
- Create: `masjid-display/lib/state/certification.test.ts`

**Interfaces:**
- Consumes: reviewed Prayer Engine fixtures/settings and final state resolver.
- Produces: explicit release-gate suites for calendar/DST/rounding and prayer/Friday boundaries.

- [ ] **Step 1: Write the Prayer Engine calendar certification table**

```ts
const cases = [
  ["winter", "2026-01-15"],
  ["dst-start-before", "2026-03-28"],
  ["dst-start-after", "2026-03-29"],
  ["summer", "2026-06-21"],
  ["dst-end-before", "2026-10-24"],
  ["dst-end-after", "2026-10-25"],
  ["winter-solstice", "2026-12-21"],
  ["year-end", "2026-12-31"],
] as const;

it.each(cases)("certifies %s on %s", (_name, date) => {
  const fixture = fixtureFor(date);
  expect(calculatePrayerTimes(date, fixture.settings)).toEqual({ date, ...fixture.expected });
});
```

Include leap-day fixture when the reviewed reference set contains one, and explicitly test ceiling/offset behavior. Add a source-level assertion that the engine does not contain manual `+ 60 * 60`/`+ 2 * 60 * 60` DST patches.

- [ ] **Step 2: Write the display-state certification matrix**

```ts
it.each([
  ["T-10", "17:50:00", "PRAYER_APPROACHING"],
  ["prayer", "18:00:00", "PRAYER_TIME_NOW"],
  ["iqama", "18:10:00", "IQAMA_NOW"],
  ["in-progress", "18:12:00", "PRAYER_IN_PROGRESS"],
])("certifies %s boundary", (_label, time, expected) => {
  expect(resolveDisplayState(certFeed, local(time)).state.kind).toBe(expected);
});
```

Extend the table to every obligatory prayer, delay 0/1/2/larger, Sunrise none, midnight rollover, in-progress end from original Iqama, Friday T-60, additional T-10, 30m hold, overlap preemption, multiple additional services, and wake jump across expired states.

- [ ] **Step 3: Run both suites**

Run:

```bash
npx vitest run lib/prayer-engine/calendar-certification.test.ts
cd masjid-display && npx vitest run lib/state/certification.test.ts
```

Expected: PASS. Any >1-minute fixture mismatch or wrong state boundary blocks progression.

- [ ] **Step 4: Commit**

```bash
git add lib/prayer-engine/calendar-certification.test.ts masjid-display/lib/state/certification.test.ts
git commit -m "test: certify prayer engine and display state boundaries"
```

### Task 3: Add automated offline/LKG and Test Mode integration certification

**Files:**
- Create: `masjid-display/lib/runtime/offline-certification.test.tsx`
- Create: `masjid-display/lib/runtime/test-mode-certification.test.tsx`
- Create: `docs/masjid-display/test-mode-demo.md`

**Interfaces:**
- Consumes: final TV runtime hooks, Feed/Test proxies, synthetic fixtures.
- Produces: automated release gates proving network/wake/Test behavior plus a repeatable university demo checklist.

- [ ] **Step 1: Write offline/LKG certification tests**

```tsx
it("never poisons LKG with malformed 200 and disables prayer claims after coverage expires", async () => {
  seedLkg(validFeed);
  mockProductionFetch(jsonResponse({ schemaVersion: 99 }));
  const { result } = renderHook(() => useDisplayRuntime());
  await flushInitialFetch();
  expect(loadLkg()?.snapshot.snapshotRevision).toBe(validFeed.snapshotRevision);

  setLogicalNow(afterPrayerCoverage(validFeed));
  await tickRuntime();
  expect(result.current.prayerDataStale).toBe(true);
  expect(result.current.state.kind).toBe("PRAYER_DATA_UNAVAILABLE");
});
```

Add initial online/no cache, offline valid LKG, corrupt LKG, 304, timeout/5xx, reconnect, visibility/wake, local content expiry/activation, and no stale transient replay.

- [ ] **Step 2: Write Test Mode certification tests**

```tsx
it("applies synthetic state, keeps persistent app URL, never writes synthetic LKG, then returns to current real state", async () => {
  seedLkg(realFeed);
  mockTestSequence([activePrayerApproaching, { active: false }]);
  const { result } = renderHook(() => useDisplayRuntime());
  await vi.advanceTimersByTimeAsync(2_000);
  expect(result.current.testMode).toBe(true);
  expect(result.current.publicAppUrl).toBe(realFeed.mosque.publicAppUrl);
  expect(loadLkg()?.snapshot.snapshotRevision).toBe(realFeed.snapshotRevision);

  await vi.advanceTimersByTimeAsync(2_000);
  expect(result.current.testMode).toBe(false);
  expect(result.current.state).toEqual(resolveDisplayState(realFeed, result.current.logicalNow));
});
```

Add exact 15-minute expiry and Extend +15 behavior at the Admin/root endpoint integration boundary.

- [ ] **Step 3: Run tests**

Run: `cd masjid-display && npx vitest run lib/runtime/offline-certification.test.tsx lib/runtime/test-mode-certification.test.tsx`

Expected: PASS.

- [ ] **Step 4: Write the deterministic demo checklist**

`docs/masjid-display/test-mode-demo.md` must list each Admin Test scenario in button order, expected TV state/visible countdown, mandatory TEST MODE badge, persistent Prayerapp QR, Stop behavior, and the statement that synthetic data never enters production tables/LKG. The checklist is executable before real mosque data exists.

- [ ] **Step 5: Commit**

```bash
git add masjid-display/lib/runtime/offline-certification.test.tsx masjid-display/lib/runtime/test-mode-certification.test.tsx docs/masjid-display/test-mode-demo.md
git commit -m "test: certify display offline and test mode recovery"
```

### Task 4: Perform and record Prayer Engine calibration and database migration dry-run

**Files:**
- Create: `docs/masjid-display/prayer-engine-calibration.md`
- Create: `docs/masjid-display/migration-certification.md`

**Interfaces:**
- Consumes: actual reviewed historical Prayerapp rows, exact active calculation settings, full Supabase migration chain.
- Produces: evidence documents ending in `PASS` or `BLOCKED` based on executed results.

- [ ] **Step 1: Create the calibration document in BLOCKED state before execution**

Use this exact structure:

```md
# Prayer Engine Calibration Evidence
Status: BLOCKED
Library: adhan@4.4.6
Calculation settings: recorded below
Historical date range: recorded below

## Results
| Date | Prayer | Existing | Generated | Delta min | Explanation |
| --- | --- | --- | --- | ---: | --- |

## Decision
BLOCKED until every unexplained absolute delta > 1 minute is resolved.
```

- [ ] **Step 2: Execute calibration against real reviewed historical rows**

Use the Admin calibration/server path in a non-production or read-only context. Record exact coordinates, timezone, angles/rule, Asr/high-latitude settings, offsets, sampled dates, all >1-minute deltas and explanations. Do not tune to one isolated day without evidence across representative periods.

Expected: document becomes `PASS` only after no unexplained >1-minute delta remains; otherwise it stays `BLOCKED`.

- [ ] **Step 3: Create migration-certification document in BLOCKED state**

Record pre-migration row counts/sample hashes for `prayer_times`, Jumuah, and Maghrib Program fields; commands used; additive migration result; cutover gate; destructive drop result; post-migration counts/sample hashes.

- [ ] **Step 4: Execute local/staging production-like migration dry-run**

Run `supabase db reset`, load a production-like/reviewed snapshot using the repository-approved fixture/restore method, apply/check migrations, then verify:
- six daily prayer values unchanged;
- historical row count unchanged except intentionally generated local test rows, if any are explicitly excluded;
- Maghrib Program fields preserved;
- Jumuah preserved;
- absolute Iqama columns absent only after cutover migration;
- shared settings/delays remain canonical.

Expected: set migration evidence to PASS only with recorded comparisons.

- [ ] **Step 5: Commit evidence**

```bash
git add docs/masjid-display/prayer-engine-calibration.md docs/masjid-display/migration-certification.md
git commit -m "docs: record prayer engine and migration certification"
```

Do not make this commit claim PASS if either document remains BLOCKED.

### Task 5: Perform attacker-perspective security review and add regression tests for findings

**Files:**
- Create: `docs/masjid-display/security-review.md`
- Create/modify: `lib/__tests__/masjid-display-feed-security.test.ts`
- Create: `masjid-display/lib/security-boundary.test.ts`

**Interfaces:**
- Consumes: final root Feed/Test endpoints, Admin Test actions, TV proxy/runtime bundle/import graph.
- Produces: PASS/BLOCKED security evidence and regression tests for confirmed defects.

- [ ] **Step 1: Write automated boundary tests**

```ts
it("TV project has no Supabase or audio runtime dependency", () => {
  const pkg = JSON.parse(readFileSync("masjid-display/package.json", "utf8"));
  expect(pkg.dependencies?.["@supabase/supabase-js"]).toBeUndefined();
  expect(JSON.stringify(pkg.dependencies)).not.toMatch(/audio|howler/i);
});

it("proxy upstream cannot be selected by a request parameter", () => {
  const source = readFileSync("masjid-display/lib/upstream.ts", "utf8");
  expect(source).toContain("process.env.PRAYERAPP_ORIGIN");
  expect(source).not.toMatch(/searchParams.*url|request.*origin/i);
});
```

Also retain root tests that Feed/Test endpoints export no mutation handler and error responses leak no raw stack/Supabase object.

- [ ] **Step 2: Run automated security tests**

Run: `npx vitest run lib/__tests__/masjid-display-feed-security.test.ts && cd masjid-display && npx vitest run lib/security-boundary.test.ts`

Expected: PASS.

- [ ] **Step 3: Review manual attack boundaries and record evidence**

Document checks for: public TV domain no Admin surface; Test writes require Admin auth; RLS blocks anonymous settings/test mutations; proxy SSRF is fixed-origin; React renders content as escaped text; QR URL treated as data; diagnostics has no secrets; no browser service-role/anon dependency; public payload allowlist only.

- [ ] **Step 4: Fix any confirmed defect through a failing regression test first**

For each defect, add a failing test in the owning project, run it to fail, implement the minimal fix, rerun to pass, then update `security-review.md`. If unresolved, status remains BLOCKED.

- [ ] **Step 5: Commit**

```bash
git add docs/masjid-display/security-review.md lib/__tests__/masjid-display-feed-security.test.ts masjid-display/lib/security-boundary.test.ts
git commit -m "docs: certify masjid display security boundary"
```

### Task 6: Document independent deployment, rollback, and operations

**Files:**
- Create: `masjid-display/README.md`
- Create: `docs/masjid-display/deployment.md`
- Review/Modify: `masjid-display/.env.example`

**Interfaces:**
- Consumes: final app/environment contract.
- Produces: repeatable two-project Vercel deployment and rollback runbook.

- [ ] **Step 1: Document the two projects exactly**

Root project:
- repository root directory `/`;
- existing Prayerapp domain;
- owns Admin, Supabase access, public Feed/Test endpoints.

TV project:
- root directory `masjid-display/`;
- independent domain;
- server env `PRAYERAPP_ORIGIN=https://<actual-prayerapp-origin>` set in deployment UI;
- no browser secret.

Use the actual deployment domain value at execution time; if it is not yet assigned, the runbook instructs the operator to copy it from the Vercel project settings rather than inventing one.

- [ ] **Step 2: Document compatibility/deploy order**

For schema v1 backward-compatible additions: deploy producer first, then consumer as needed. For a future breaking schema: consumer must first support the new schema alongside old, then producer changes; never switch both atomically by assumption.

- [ ] **Step 3: Document rollback/first boot/outage/diagnostics**

Include independent root/TV Vercel rollback, LKG startup, 35-day prayer-horizon behavior, stale warning, wake/reconnect, Test Mode stop/expiry, and `?diagnostics=1` read-only usage.

- [ ] **Step 4: Commit**

```bash
git add masjid-display/README.md masjid-display/.env.example docs/masjid-display/deployment.md
git commit -m "docs: document masjid display deployment and rollback"
```

### Task 7: Execute physical responsive/QR certification and long-duration soak

**Files:**
- Create: `docs/masjid-display/physical-tv-certification.md`
- Create: `docs/masjid-display/soak-test.md`

**Interfaces:**
- Consumes: deployable TV build and Admin Test console.
- Produces: recorded physical evidence with explicit PASS/BLOCKED status.

- [ ] **Step 1: Create both evidence docs in BLOCKED state before testing**

Physical matrix rows must include at minimum:
- 32-inch 1080p reference/minimum QA device;
- at least one larger 16:9 display when available;
- 4K display/viewport when available;
- Arabic RTL/shaping;
- German clipping;
- Prayer strip/readability;
- practical-distance clock/countdown;
- safe area/overscan;
- persistent Prayerapp QR scan;
- Campaign QR scan;
- Urgent readability;
- long bilingual synthetic scenario;
- pixel-shift visibility/clipping.

- [ ] **Step 2: Execute responsive physical tests with Admin synthetic scenarios**

Use Test Mode to force Prayer Approaching, Waiting Iqama, Jumuah, Urgent, long bilingual, Event pair, Campaign+QR, and stale-data states. Record device/browser/resolution and each result. Do not mark a device PASS if essential information becomes unreadable or QR cannot scan at a practical distance.

- [ ] **Step 3: Execute 24-hour initial soak**

Record exact deployed app version/commit, device/browser, start/end timestamps. Exercise idle, sleep/wake, background timer throttling, disconnect/reconnect, Test Mode start/stop/expiry, repeated production/test polling, and memory/UI responsiveness. Any black screen/stale religious state/uncontrolled reload is BLOCKED.

- [ ] **Step 4: Extend to 72 hours before final release when practical**

If operational constraints prevent 72 hours, record the limitation explicitly; do not silently call it completed. At minimum the 24-hour test must PASS for release consideration.

- [ ] **Step 5: Commit evidence**

```bash
git add docs/masjid-display/physical-tv-certification.md docs/masjid-display/soak-test.md
git commit -m "docs: record masjid display physical and soak certification"
```

### Task 8: Build the final production certification gate and run all repository checks

**Files:**
- Create: `docs/masjid-display/production-certification.md`

**Interfaces:**
- Consumes: evidence from Tasks 1–7 and all automated suites.
- Produces: one auditable release status `PASS` or `BLOCKED`.

- [ ] **Step 1: Create the evidence table**

```md
# Masjid Display Production Certification
Status: BLOCKED

| Gate | Required | Evidence | Status |
| --- | --- | --- | --- |
| Prayer Engine calibration | Yes | prayer-engine-calibration.md | BLOCKED |
| Database migration dry-run | Yes | migration-certification.md | BLOCKED |
| Root tests/build | Yes | command output/CI | BLOCKED |
| TV tests/build | Yes | command output/CI | BLOCKED |
| Feed/security | Yes | security-review.md | BLOCKED |
| Offline/LKG | Yes | automated certification | BLOCKED |
| Test Mode | Yes | automated + demo check | BLOCKED |
| 32-inch reference physical QA | Yes | physical-tv-certification.md | BLOCKED |
| Prayerapp/Campaign QR scans | Yes | physical-tv-certification.md | BLOCKED |
| Wake/soak | Yes | soak-test.md | BLOCKED |
```

Add larger/4K adaptive QA as a tracked row; if hardware is unavailable, record that limitation explicitly in Evidence rather than claiming PASS.

- [ ] **Step 2: Run final root verification**

```bash
npm ci
npm test
npm run lint
npx tsc --noEmit
npm run build
supabase db reset
node scripts/verify-masjid-display-contract.mjs
```

Expected: all exit 0.

- [ ] **Step 3: Run final TV verification**

```bash
cd masjid-display
npm ci
npm test
npm run lint
npm run typecheck
npm run build
```

Expected: all exit 0.

- [ ] **Step 4: Run forbidden-final-state grep**

From repository root:

```bash
git grep -nE 'fajr_iqama|dhuhr_iqama|asr_iqama|maghrib_iqama|isha_iqama|fajrIqama|dhuhrIqama|asrIqama|maghribIqama|ishaIqama' -- app components lib || true
git grep -nE '@supabase/supabase-js|new Audio\(|<audio' -- masjid-display || true
```

Expected: no active legacy absolute-Iqama matches in root application code and no TV Supabase/audio runtime matches.

- [ ] **Step 5: Update the certification table strictly from evidence**

Only change a row to PASS when its linked document/CI/command result actually passed. Overall `Status: PASS` requires every critical “Required: Yes” row PASS. Otherwise leave `Status: BLOCKED`.

- [ ] **Step 6: Commit the final certification record**

```bash
git add docs/masjid-display/production-certification.md
git commit -m "docs: add masjid display production certification gate"
```

## Exit Criteria

- Producer/consumer contract is CI-enforced.
- Root and TV tests/lint/typecheck/builds are green without weakening existing checks.
- Prayer Engine calendar/calibration and display-state boundary suites pass.
- Database cutover has recorded migration evidence.
- Offline/LKG/Test Mode/security behaviors are certified.
- Independent deployment/rollback runbook exists.
- Physical responsive/QR and soak evidence is recorded.
- Production certification remains BLOCKED until every critical gate actually passes; only then may the feature be called production-ready.

## Execution Order Across the Five Plans

1. `docs/superpowers/plans/2026-09-15-masjid-display-plan-1-prayer-engine-db.md`
2. `docs/superpowers/plans/2026-09-15-masjid-display-plan-2-admin-test-control.md`
3. `docs/superpowers/plans/2026-09-15-masjid-display-plan-3-display-feed.md`
4. `docs/superpowers/plans/2026-09-15-masjid-display-plan-4-tv-runtime-ui.md`
5. This plan.

Do not begin a later plan with a prerequisite gate unresolved.
