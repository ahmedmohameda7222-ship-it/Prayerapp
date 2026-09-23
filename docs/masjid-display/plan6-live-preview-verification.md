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
- Pre-merge certification branch: `feat/masjid-display`
- Post-merge TV deployment source: `main`
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

Certified pre-merge Plan 6 repository HEAD:
`5fb5d03ca6891ead259da097d180a9ccff9b7d96`

Fresh exact-head evidence:

- Root CI `35806268092`: **SUCCESS** — root lint/tests/typecheck, Feed contract, TV tests/lint/typecheck/build, clean Supabase bootstrap, migration/reconciliation/admin-audit certification, and root build.
- Masjid Display Verification `35806268096`: **SUCCESS**, including TV package verification and two-app integration.
- Plan 3 Display Feed Verification `35806268112`: **SUCCESS**.
- Security Scanners `35806268100`: **SUCCESS**, including CodeQL, OSV, Gitleaks, SBOM, authenticated local DAST, exact-head runtime DAST, and deployed-production DAST.
- Android TWA `35806268167`: **SUCCESS** — verify/build plus instrumentation on API 23 and API 37. The protected signing job was intentionally skipped because this was a pull-request verification run.

### Final Codex review loop — all legitimate findings fixed to date

The pre-merge Codex loop has produced **sixteen legitimate correctness findings in total: thirteen P1 findings and three P2 findings**.

Findings 1–6:
1. **P1:** prayer-event identity omitted the resolved delivery instant;
2. **P1:** database receipt schema rejected p3 identities;
3. **P1:** stale legacy p2 receipts could suppress fallback at a newly resolved due instant;
4. **P1:** pending timezone edits could affect live scheduling before recalculation promotion;
5. **P1:** dynamic-content budget date authority remained Berlin instead of the applied runtime timezone;
6. **P1:** Home and `/events` event filtering retained Berlin date authority.

Findings 7–10:
7. **P1:** current p3 Android deliveries were not queued into the delivery-receipt upload queue;
8. **P1:** future-recalculation cutoff dates were derived from pending calculation timezone instead of applied runtime timezone;
9. **P1:** `applied_timezone` promotion could expand the Feed capacity window without rechecking the dynamic-content budget in the same transaction;
10. **P2:** the redefined serialized-byte budget function was not preflighted against existing rows during migration.

TDD evidence for findings 7–10:
- RED test-only HEAD `8e8b9c4e7ec68fbcc5c57534fd82cf0c6d60c632`;
- Root CI `35765586800`: **FAILURE** with exactly four intended failures in `plan6-final-review-runtime-safety.test.ts`;
- fixes: `015fe09e1d92043d783657c81d7fbb7d3416dfd1`, `90342d09d75542c3e63284e3c1545b1b2bd17574`, `3f32f4f32ee699750b87886f57cadbcdc904d9de`, and `4f88b587b97d29173d4d24294927162994a4eaa3`.

Findings 11–14:
11. **P1:** first-ever non-Berlin settings save could initialize `applied_timezone` to the pending zone and reinterpret existing canonical rows before recalculation;
12. **P1:** a partial recalculation during a pending timezone change could write pending-zone wall-clock rows into a schedule still interpreted in the applied zone;
13. **P1:** a westward timezone change could be promoted while applied and pending zones were on different local dates, activating an unrecalculated newly-current date;
14. **P2:** Android resolved repeated fall-back wall times with the earlier offset while the server uses the later offset, producing different due instants/p3 identities.

TDD RED evidence for findings 11–14:
- Root regression HEAD `9d456116bdde1532a561a0d5229922f9604701d6`, followed by combined RED HEAD `d0e308e9b75ad8d6b2be944ffb274f773b92c1dc`;
- Root CI `35801295772`: **FAILURE** with four intended runtime-safety regression failures;
- Android TWA `35801295782`: **FAILURE** with `AlarmPlannerTest.resolvesRepeatedWallClockTimeWithServerLaterOffsetPolicy` as the sole Android unit-test failure (104 tests, 1 failed);
- fixes: `0999374b02ff818733f000a928c3696339128798`, `699c81462cc135dea99d2a35a1e9749626435b85`, `1c953a4afd2c3136e4b4135574e39aa459541cea`, `e2e19a0822dd37c696ed703da8925c7287937278`, and syntax correction `869118ff81a0754faa555e3b94d16eb0d5bfaf71`.

The next exact-head Codex pass identified two additional legitimate findings:
15. **P1:** Android prayer-schedule responses were still shared-cacheable for five minutes, so a worker refreshing immediately after timezone promotion could install stale pre-promotion alarms until its next periodic refresh;
16. **P2:** remaining religious clocks — Home header date, Ramadan current-day selection, Azkar category selection, and Azkar daily-progress date — still defaulted to Berlin instead of applied runtime timezone.

TDD RED evidence for findings 15–16:
- test-only HEAD `887c806194392bb54ad13d4146e018e125a9b898`;
- Root CI `35805587968`: **FAILURE** with five intended regressions in `plan6-final-review-cache-religious-clock.test.ts`: transition-sensitive Android schedule cache, Azkar category timezone, Home religious header timezone, Ramadan day timezone, and Azkar daily-progress timezone;
- Plan 3 Display Feed Verification `35805587956`: **FAILURE** at TypeScript because the new Azkar regression intentionally exercised the not-yet-implemented timezone argument.

Fixes for findings 15–16:
- `e9add95cfa6ca7320651b7c716d87011f0414146`: Android prayer-schedule response is `Cache-Control: no-store`;
- `397b56ec26f5b16ba54ed45f74b783a9d8e76e3e`: Azkar smart clock accepts runtime timezone;
- `480c9fbcf81df3a1a53c9dd523b0fc4d331e49cc` and `75127435b8cc941b4dd418341dacfc173f01a245`: applied timezone propagates to the Home header date;
- `a69caf14be90aa5a9c676d5918e85a6e02514c67`: Ramadan current-day selection uses applied runtime timezone;
- `98bea478808085e6a14c795e8c2cb10805356d5a` and `c83467a94b46488a5778f6086069be17f56550ad`: Azkar page/routine use applied timezone for category and daily-progress date authority;
- `5fb5d03ca6891ead259da097d180a9ccff9b7d96`: updates the older hardening contract so it asserts the new applied-timezone behavior rather than the obsolete Berlin-only call shape.

GREEN evidence after all sixteen fixes:
- Root CI `35806268092`: **SUCCESS**;
- Android TWA `35806268167`: **SUCCESS**, including API 23 and API 37 instrumentation;
- Masjid Display Verification `35806268096`: **SUCCESS**;
- Security Scanners `35806268100`: **SUCCESS**;
- Plan 3 Display Feed Verification `35806268112`: **SUCCESS**.

All sixteen inline correctness findings have implementation/run evidence and their review threads are resolved. Unresolved inline review threads before this evidence refresh: **0**.

Committing this evidence creates a newer documentation-only HEAD without changing implementation. Fresh exact documentation-HEAD workflow verification is recorded in PR #108 metadata rather than recursively rewriting this document with its own future SHA/run IDs.

Per the 2026-09-22 operator sequencing override, a fresh exact-head GitHub Codex review is the **last pre-merge review gate** after this evidence refresh and exact-head automated verification. Real Vercel/root/browser/Admin Test Mode verification remains intentionally post-merge on `main` and remains required before the final Plan 6 completion phrase may be used.


## Final pre-merge self-review addendum — 2026-09-23

This section supersedes the older pre-merge finding count and the earlier statement that another Codex pass was required.

The direct final self-review was supplemental. A fresh exact-head Codex review remained the required final pre-merge review gate and subsequently returned finding 22 below.

### Codex findings through the last returned review

The complete Codex review history for Plan 6 now contains **22 legitimate correctness findings: 16 P1 findings and 6 P2 findings**.

In addition to findings 1–16 documented above, the later reviews identified:

17. **P1:** canonical legacy prayer rows could disappear from Home/Times/Friday before the first `prayer_settings` save;
18. **P1:** Android schedule, Masjid Display Feed, and reminder cron could pair applied timezone authority with prayer rows from a different database snapshot;
19. **P2:** announcement `datetime-local` windows were parsed/formatted in Berlin instead of the applied runtime timezone;
20. **P1:** Home's 60-second/focus refresh could erase the legacy Berlin schedule when `prayer_settings` was absent;
21. **P2:** Home refresh still used a split settings/schedule read and could install mismatched timezone + wall-clock rows;
22. **P2:** Admin Jumuah, Prayer Times coverage/status, Admin dashboard status, and launch-readiness coverage still derived their operational calendar date from the Berlin default instead of the applied runtime timezone.

Findings 1–21 were fixed through implementation HEAD
`73c78076c0166acde1ecbbe892fa8c16da571a2e`.
Finding 22 was returned by the required fresh exact-head Codex review on documentation HEAD `f28adda7490a0c366a688223adfe35e5d13b2676` and fixed through implementation HEAD
`b158072e0408f1d91187167f13e7d9e3bad39e51`.
The fix adds an authenticated server-only Admin runtime-date action backed by `getRuntimePrayerTimezone()`, wires the Admin operational schedule surfaces to that applied date, and makes launch readiness calculate its window in the applied timezone. Regression coverage is in `lib/__tests__/plan6-final-review-cache-religious-clock.test.ts`.

Finding 22 thread closure and final exact-head run IDs are tracked in PR #108 metadata after verification, avoiding a recursive documentation-only evidence commit.

### Additional manual final-review findings

The direct final review found and fixed three additional correctness/availability issues that are **not counted as Codex findings**:

1. an announcement form opened under one applied timezone could be submitted after timezone promotion and reinterpret unchanged wall-clock display windows; the form now carries its rendered timezone and server actions reject stale timed forms;
2. the `/times` server shell could hard-fail when the new snapshot RPC was temporarily unavailable; the shell now remains renderable and lets the range loader surface a recoverable data error;
3. an optional runtime-settings read failure could discard an otherwise valid atomic prayer schedule snapshot; schedule/timezone authority now remains available, and Home preserves the last verified Iqama delays when only that optional settings read fails.

The manual review also extended atomic schedule/timezone consumption across Home initial render, Home refresh, Friday, and Times range loading so public readers do not recreate the split-read race.

### Exact implementation-HEAD evidence

Certified implementation HEAD:
`73c78076c0166acde1ecbbe892fa8c16da571a2e`

- Root CI `35821366976`: **SUCCESS** — lint, 925-test suite, typecheck, Feed/TV contract checks, clean Supabase bootstrap, legacy-Iqama migration certification, reconciliation/admin-audit checks, and production build.
- Masjid Display Verification `35821367015`: **SUCCESS** — TV package plus live two-app integration.
- Plan 3 Display Feed Verification `35821366984`: **SUCCESS**.
- Security Scanners `35821367008`: **SUCCESS** — CodeQL, OSV, Gitleaks, SBOM, authenticated local DAST, exact-head runtime DAST, and deployed-production DAST.
- Android TWA `35821366982`: **SUCCESS** — Android verify/build plus instrumentation on API 23 and API 37; protected signing was intentionally skipped for the pull-request verification run.

No Critical/P1/P2 blocker remained in the direct final Plan 6 code review after these fixes.

Real Vercel/root/browser/Admin Test Mode verification remains intentionally **post-merge on `main`** under the operator sequencing override. This addendum therefore certifies the pre-merge repository state only; it does not claim Plan 6 live-preview completion.


## Final exact-head Codex continuation addendum — 2026-09-23

This section supersedes the 22-finding count above for the continuing required exact-head Codex loop.

The complete Plan 6 Codex history now contains **26 legitimate correctness findings: 16 P1 findings and 10 P2 findings**.

After finding 22, the exact-head review loop identified and fixed four further P2 correctness issues:

23. **P2:** server and Android fall-back overlap resolution could disagree for accepted western IANA timezones such as `America/New_York`, producing different delivery instants and p3 identities. Root/server and Android now use one explicit later-instant overlap policy, with matching spring-forward gap behavior and eastern/western timezone regression coverage;
24. **P2:** the TV wall-time resolver still used an iterative overlap policy that could select the earlier instant while root/Android selected the later one. TV now uses the same explicit overlap/gap policy and has Berlin/New York overlap plus New York gap coverage;
25. **P2:** after a successful full recalculation promoted the applied calculation revision, Prayer Engine Admin retained stale client-side settings and kept schedule-extension controls disabled until manual reload. The successful commit path now reloads canonical settings and updates local form/settings state immediately;
26. **P2:** a recalculation commit could cross mosque-local midnight between preview/client `p_today` calculation and the atomic write, weakening the future-only boundary. The database RPC now locks `prayer_settings`, re-derives the applied local date from `statement_timestamp()`, rejects stale `p_today`, and checks `p_start_date` against the server-derived date before any canonical write.

Finding 26 is fixed on implementation HEAD:
`06006e2d303836e8dedf8024222bc63f5287d8b9`

Exact implementation-head verification:

- Root CI `35843118143`: **SUCCESS**
- Masjid Display Verification `35843118142`: **SUCCESS**
- Plan 3 Display Feed Verification `35843118131`: **SUCCESS**
- Security Scanners `35843118104`: **SUCCESS**
- Android TWA `35843118147`: **SUCCESS**, including API 23 and API 37 instrumentation

All inline threads returned through finding 26 are resolved. A fresh Codex review remains required on the final exact documentation HEAD created by this evidence update. Final exact-head run IDs and Codex closure are recorded in PR #108 metadata to avoid recursively creating another evidence-only commit.


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

**PRE-MERGE PLAN 6 REPOSITORY CERTIFICATION: 26 LEGITIMATE CODEX FINDINGS + 3 ADDITIONAL MANUAL-REVIEW FINDINGS FIXED; FINAL EXACT-HEAD CI/SECURITY/ANDROID + CODEX CLOSURE MUST BE VERIFIED IN PR #108 METADATA; POST-MERGE LIVE VERIFICATION PENDING.**

The real Vercel/root/browser/Admin Test Mode verification is intentionally scheduled for post-merge `main` under the operator sequencing override. Do not convert this to `PLAN 6 COMPLETE — LIVE PREVIEW + SETTINGS CONTROL VERIFIED` until that post-merge evidence is actually recorded.
