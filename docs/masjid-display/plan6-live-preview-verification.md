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
`89cfece9635ef9601e9e36eede5ec1f98c668bd7`

Fresh exact-implementation-head evidence:

- Root CI `35767472510`: **SUCCESS** — root lint/tests/typecheck, Feed contract, TV tests/lint/typecheck/build, clean Supabase bootstrap, migration/reconciliation/admin-audit certification, and root build.
- Masjid Display Verification `35767472504`: **SUCCESS**, including TV package verification and two-app integration.
- Plan 3 Display Feed Verification `35767472590`: **SUCCESS**.
- Security Scanners `35767472515`: **SUCCESS**, including CodeQL, OSV, Gitleaks, SBOM, authenticated local DAST, exact-head runtime DAST, and deployed-production DAST.
- Android TWA `35767472472`: **SUCCESS** — verify/build plus instrumentation on API 23 and API 37. The protected signing job was intentionally skipped because this was a pull-request verification run.

### Final Codex review loop — latest runtime-safety findings

The pre-merge Codex loop has now produced **ten legitimate correctness findings** in total: nine P1 findings and one P2 finding.

The earlier six P1 findings covered:
1. prayer-event identity missing the resolved delivery instant;
2. database receipt schema rejecting p3 identities;
3. stale legacy p2 receipts suppressing fallback at a newly resolved due instant;
4. pending timezone edits affecting live scheduling before recalculation promotion;
5. the database dynamic-content budget using a Berlin date instead of the applied runtime timezone;
6. Home and `/events` event filtering using Berlin across applied-timezone date boundaries.

Those six were fixed with p3/v3 due-instant-bound identities, additive p2/p3 receipt support, due-instant compatibility checks for legacy receipts, persisted `applied_timezone` runtime authority, applied-timezone budget windows, and explicit timezone propagation into event filtering.

The next exact-head Codex pass identified four additional legitimate runtime-safety findings:
7. **P1:** current p3 Android deliveries were not queued into the delivery-receipt upload queue;
8. **P1:** future-recalculation cutoff dates were still derived from pending calculation timezone instead of the applied runtime timezone;
9. **P1:** promoting `applied_timezone` could expand the Feed capacity window without rechecking the dynamic-content budget in the same transaction;
10. **P2:** the redefined serialized-byte budget function was not preflighted against existing rows during migration.

TDD RED evidence on test-only HEAD `8e8b9c4e7ec68fbcc5c57534fd82cf0c6d60c632`:
- Root CI `35765586800`: **FAILURE** at `npm test`;
- `plan6-final-review-runtime-safety.test.ts`: exactly four intended failures, one for each finding above;
- overall test summary: 4 failed, 902 passed, 1 skipped, 1 todo.

Fixes:
- `015fe09e1d92043d783657c81d7fbb7d3416dfd1`: `NativeStore.markDeliveryDelivered` queues both p2 and p3 receipts; Android instrumentation directly verifies p3 receipt persistence/upload readiness.
- `90342d09d75542c3e63284e3c1545b1b2bd17574`: recalculation preview/commit derive the future-only cutoff from `getRuntimePrayerSettings()`, while pending settings remain calculation inputs.
- `3f32f4f32ee699750b87886f57cadbcdc904d9de`: timezone promotion performs `assert_masjid_display_dynamic_content_budget()` after updating `applied_timezone` in the same transaction so an over-budget promotion rolls back.
- `4f88b587b97d29173d4d24294927162994a4eaa3`: the serialized-byte budget migration executes a preflight assertion after redefining the function, so incompatible existing rows abort migration.
- `89cfece9635ef9601e9e36eede5ec1f98c668bd7`: removes a wall-clock assumption from the two-app Test Mode stop assertion; all five workflow families are green on this final implementation head.

All ten correctness review threads now have implementation/run evidence and are resolved. Current unresolved inline review threads: **0**.

Committing this documentation creates a newer evidence-only HEAD without changing implementation. Fresh exact documentation-HEAD workflow verification is recorded in PR #108 metadata after that commit rather than recursively rewriting this document with its own future SHA/run IDs.

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
