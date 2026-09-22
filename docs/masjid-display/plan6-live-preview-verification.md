# Masjid Display — Plan 6 Live Preview Verification

Status: PRE-MERGE REPOSITORY CERTIFICATION GREEN — POST-MERGE MAIN LIVE VERIFICATION PENDING

Plan 6 implementation starting point: `01dd070474a17a5f27eb472a58c5122cb092f315`

Approved design:
`docs/superpowers/specs/2026-09-21-masjid-display-plan-6-live-preview-design.md`

Approved implementation plan:
`docs/superpowers/plans/2026-09-21-masjid-display-plan-6-live-preview.md`

## Operator sequencing override — 2026-09-22

The approved Plan 6 design/plan originally ordered the dedicated TV preview and live browser/Admin Test Mode verification before the final Codex review and before merge.

The operator has explicitly changed **execution sequencing only**:

- do not create/deploy a candidate-branch Vercel TV project;
- finish all repository-side implementation, automated CI/security certification, and the final exact-head Codex review on `feat/masjid-display`;
- keep PR #108 Draft/open/unmerged during that pre-merge certification;
- after the operator authorizes and performs the merge to `main`, use the deployed root `main` application as the real upstream;
- then create/configure `donaumoschee-tv` with server-only `PRAYERAPP_ORIGIN=https://donaumoschee.vercel.app`;
- execute the real Feed/Test Control/browser/Admin Test Mode verification against the deployed `main` system;
- if that live verification finds a defect, fix it from `main` through a normal hotfix branch/PR rather than silently rewriting production.

This sequencing override does **not** relax the Plan 6 live-verification completion criteria. Plan 6 must not be called complete until the post-merge live evidence exists.


## Prayer Engine operational policy

Plan 6 removes the obsolete compile-time `PRODUCTION_PRAYER_PROFILE_APPROVED=false` schedule-commit blocker.

The operational authority is now the mosque/operator's persisted Admin Prayer Engine Settings. Historical timetable comparison remains available as optional reference only.

The following protections remain mandatory and are still implemented:

- authenticated Admin actions;
- Admin audit start/completion;
- calculation/settings validation;
- saving Settings does not write `prayer_times`;
- preview before extension/recalculation commit;
- recalculation confirmation in the Admin UI;
- settings/calculation revision checks;
- stale-preview comparison against a fresh server preview/diff;
- future-only recalculation;
- existing atomic schedule-generation/write safeguards.

No mosque-specific prayer angles, offsets, Iqama delays, or timetable values were invented by Plan 6.

## Settings-driven configuration audit

| Area | Canonical authority | Admin → persistence → runtime result |
| --- | --- | --- |
| Latitude / longitude / timezone | `prayer_settings` | Admin Prayer Engine → validated singleton → calculation adapter |
| Fajr angle | `prayer_settings` | wired |
| Isha rule / angle / fixed minutes | `prayer_settings` | wired |
| Asr shadow factor | `prayer_settings` | wired |
| High-latitude rule | `prayer_settings` | wired |
| Six calculation offsets | `prayer_settings` | wired |
| Five shared Iqama delays | `prayer_settings` | Feed → TV; Iqama = stored prayer start + delay |
| Five display prayer durations | `masjid_display_settings` | Admin Masjid Display → Feed → TV state engine |
| Azkar playlist | `masjid_display_settings` | Admin → bounded public selection → Feed |
| Prayerapp public URL | `mosque_settings.public_app_url` | Admin Settings → Feed → persistent QR |
| Announcements / urgent | existing announcement model | reused; no duplicate Plan 6 setting |
| Events | existing event model | reused |
| Campaigns / donation URL | existing campaign model | reused; donation URL feeds campaign QR |
| Additional Jumuah | existing Jumuah model | reused |

Legacy absolute-Iqama fields are not restored as active authority.

## Vercel configuration target

- Team: `Ahmed's projects`
- Root Prayerapp project: `donaumoschee`
- Root production origin: `https://donaumoschee.vercel.app`
- Intended TV project: `donaumoschee-tv`
- Repository: `ahmedmohameda7222-ship-it/Prayerapp`
- Root Directory: `masjid-display`
- Framework: Next.js
- Candidate branch: `feat/masjid-display`
- Server-only environment: `PRAYERAPP_ORIGIN=https://donaumoschee.vercel.app`
- `NEXT_PUBLIC_PRAYERAPP_ORIGIN`: forbidden / not configured

Authorized Vercel inspection on 2026-09-21 found no existing `donaumoschee-tv` project.

This was rechecked after implementation HEAD `3af36168524d2092745ca1546bcfeea76db91adc`: both connected Vercel accounts resolve to the same `Ahmed's projects` team and list the same seven projects, including root `donaumoschee` but no dedicated TV project.

The installed Vercel plugin has write permission, but exposes no project-creation or environment-variable mutation for this workflow. Its generic deploy action cannot be scoped to a dedicated TV project from the available interface and had previously returned `Tool deploy_to_vercel not found`. No unsafe deploy to the root Prayerapp project was attempted. Therefore no TV project ID, deployment ID, preview URL, or READY state is claimed.

## Real root-origin live check

Direct authenticated Vercel fetches against the required root production origin returned the following results, rechecked after implementation HEAD `3af36168524d2092745ca1546bcfeea76db91adc`:

| Endpoint | Result |
| --- | --- |
| `https://donaumoschee.vercel.app/api/public/masjid-display` | **404 Not Found**, matched `/_not-found` |
| `https://donaumoschee.vercel.app/api/public/masjid-display-test-control` | **404 Not Found**, matched `/_not-found` |

The current root production deployment remains from `main` (latest observed production SHA `dbe635a92e0e72ea8373831ae35502fe136a0f24`), and no `feat/masjid-display` preview deployment is present on the root project. Plan 5/6 endpoints remain in Draft PR #108. Plan 6 does **not** authorize silently publishing the entire unmerged root branch to the public production project.

Under the 2026-09-22 operator sequencing override, the following checks are intentionally deferred until after the approved branch is merged to `main` and the dedicated TV project is created:

- live TV Feed proxy: **NOT VERIFIED**;
- live Test Control proxy: **NOT VERIFIED**;
- deployed main TV page: **NOT AVAILABLE**;
- 1920×1080 browser verification: **NOT EXECUTED**;
- larger browser viewport verification: **NOT EXECUTED**;
- live Arabic/German rendering: **NOT EXECUTED**;
- live persistent QR rendering: **NOT EXECUTED**;
- live Campaign QR software rendering: **NOT EXECUTED**;
- live diagnostics: **NOT EXECUTED**;
- real Admin Test Mode → deployed TV: **NOT EXECUTED**.

These are Plan 6 live-preview gates, so Plan 6 is not marked complete while they remain absent.

## Automated Test Mode / LKG evidence

Repository certification continues to prove:

- Admin synthetic mutations target only `masjid_display_test_state`;
- public Test Control is GET-only/sanitized/no-store;
- latest accepted polling generation wins and slower stale responses cannot revert the state;
- local Test Mode expiry disables stale overrides;
- Stop returns runtime resolution to current real Feed/logical time;
- Test Mode payloads do not replace production LKG;
- synthetic data is not written to canonical prayer/content tables.

Live E2E is still required by Plan 6 and is not inferred from these automated tests.

## CI / security evidence

Certified pre-merge Plan 6 implementation HEAD:
`0e021520058a73a1407c488ae2cee4d19f69692b`

Fresh exact-implementation-head evidence:

- Root CI `35761167100`: **SUCCESS** — root lint/tests/typecheck, Feed contract, TV tests/lint/typecheck/build, clean Supabase bootstrap, migration/reconciliation/admin-audit certification, and root build.
- Masjid Display Verification `35761167195`: **SUCCESS**, including TV package verification and two-app integration.
- Plan 3 Display Feed Verification `35761167151`: **SUCCESS**.
- Security Scanners `35761167067`: **SUCCESS**, including CodeQL, OSV, Gitleaks, SBOM, authenticated local DAST, exact-head runtime DAST, and deployed-production DAST.
- Android TWA `35761167078`: **SUCCESS** — verify/build plus instrumentation on API 23 and API 37. The protected signing job was intentionally skipped because this was a pull-request verification run.

### Final Codex review loop — prayer-event identity, timezone rollout, and date-boundary authority

The first final pre-merge Codex review identified a legitimate P1: prayer-event identity did not include the resolved delivery instant. That finding was fixed with matching Java/TypeScript `p3/v3` identities containing `dueAtMs`, plus deterministic legacy `p2` aliases for rollout compatibility.

The next re-review identified three legitimate P1 rollout/correctness gaps:

1. the native receipt API accepted `p3` event IDs while the database receipt CHECK still allowed only `p2`;
2. a stale legacy `p2` receipt could suppress fallback at a newly resolved due instant after a timezone change;
3. pending Admin timezone edits were being used immediately by live scheduling consumers before schedule recalculation committed them.

TDD RED evidence on test-only HEAD `596d8026e5c52ecce5280b175f8d595a327ddc30`:
- Root CI `35689276038`: **FAILURE** at `npm test`.
- exactly six intended failures across:
  - `android-prayer-event-v3-migration.test.ts`;
  - `android-legacy-receipt-due-instant.test.ts`;
  - `plan6-applied-timezone-authority.test.ts`.

Those three findings were fixed by the additive p2/p3 receipt migration, due-instant compatibility checks for legacy receipts, and the persisted `applied_timezone` runtime authority.

The latest final re-review then identified two additional legitimate P1 correctness gaps:

4. the database write-time dynamic-content budget still derived its calendar window in `Europe/Berlin`, while the runtime Feed used the applied prayer timezone;
5. public event filtering on Home and `/events` could still classify events using Berlin across a configured-timezone date boundary.

TDD RED evidence on test-only HEAD `426990220da06a9d48f912df9afdcd0c4a2ba97f`:
- Root CI `35760200228`: **FAILURE** at `npm test`;
- exactly three intended failures:
  - `plan6-dynamic-budget-timezone-authority.test.ts`: 1 failure;
  - `plan6-event-timezone-authority.test.ts`: 2 failures.

Fixes on certified implementation HEAD `0e021520058a73a1407c488ae2cee4d19f69692b`:
- migration `20260922062000_masjid_display_dynamic_budget_timezone.sql` redefines `assert_masjid_display_dynamic_content_budget()` to load `prayer_settings.applied_timezone` and derive `p_today` with `p_now AT TIME ZONE v_time_zone`;
- the capacity gate therefore uses the same applied calendar authority as the runtime Feed;
- `isUpcomingEvent` accepts an explicit IANA timezone;
- both `app/page.tsx` and `app/events/page.tsx` load `getRuntimePrayerSettings()` and pass the applied runtime timezone into event filtering;
- the America/Los_Angeles cross-date regression is covered directly.

GREEN evidence for all six final-review correctness P1 fixes is the exact-implementation-head five-workflow set above. The six correctness review threads have implementation/run evidence and are resolved.

The latest Codex pass also raised a certification-evidence P1 because the checked-in record still cited the preceding implementation snapshot. This section is the corrective evidence refresh: it records the actual certified implementation SHA `0e021520058a73a1407c488ae2cee4d19f69692b` and its five successful workflow IDs.

Committing this documentation creates a newer evidence-only HEAD without changing implementation. Fresh exact documentation-HEAD workflow verification is recorded in PR #108 metadata after that commit, rather than recursively rewriting this document with its own future SHA/run IDs. A clean final exact-head Codex re-review remains required before the pre-merge review gate is closed.

### Deployed-production DAST timeout resilience

The deployed-production DAST previously exposed a repeatable transport-timeout false negative while the same production URL returned HTTP 200 through Vercel inspection. The scanner keeps the 10-second per-attempt timeout and all security assertions, and retries exactly once only for `TimeoutError`. Arbitrary HTTP/security failures are not retried.

### Android SDK setup blocker closed during Plan 6 implementation

The pinned setup-android action previously requested Google's removed `tools` package. Both setup paths now explicitly request `platform-tools`, preserving pinned action commits. Android unit/lint/build and API 23/API 37 instrumentation are green in the exact-head run above.

### Security finding closed during Plan 6 implementation

The earlier CodeQL file-system-race finding in the Plan 6 source-tree test helper was fixed by using `readdirSync(..., { withFileTypes: true })` and eliminating the separate `statSync` check. Current Security Scanners remain green.

Per the 2026-09-22 operator sequencing override, GitHub Codex review is the **last pre-merge review gate** after repository-side implementation and exact-head automated verification are green. Real Vercel/root/browser/Admin Test Mode verification is intentionally post-merge on `main`; it remains required before the final Plan 6 completion phrase may be used.

## Deferred operational follow-up / Plan 7

The following are truthfully **NOT EXECUTED** and do not by themselves block Plan 6:

- historical ±1-minute calibration matching;
- destructive real-target legacy-Iqama cutover;
- physical 32-inch/larger/1440p/4K TV certification;
- physical Prayerapp QR scan;
- physical Campaign QR scan;
- 24-hour soak;
- 72-hour soak.

No destructive production migration was executed in Plan 6.

## Current Plan 6 result

**PRE-MERGE PLAN 6 REPOSITORY CERTIFICATION: CERTIFIED IMPLEMENTATION HEAD GREEN; SIX LEGITIMATE FINAL-REVIEW CORRECTNESS P1s FIXED; EVIDENCE REFRESHED; FINAL EXACT-HEAD CODEX RE-REVIEW PENDING.**

The real Vercel/root/browser/Admin Test Mode verification is intentionally scheduled for post-merge `main` under the operator sequencing override. Do not convert this to `PLAN 6 COMPLETE — LIVE PREVIEW + SETTINGS CONTROL VERIFIED` until that post-merge evidence is actually recorded.
