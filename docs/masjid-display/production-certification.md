# Masjid Display — Production Certification

Status: BLOCKED

Plan 5 is a production-readiness evidence gate. Software/certification-framework completion does not convert missing religious, real-target, physical, or soak evidence into PASS.


## Plan 6 sequencing note — 2026-09-22

The operator explicitly moved Plan 6 real Vercel/browser/Admin Test Mode verification to **after the approved branch is merged to `main`**. Pre-merge certification therefore finishes repository implementation, exact-head CI/security/Android verification, and final Codex review first. This is a sequencing change only: the post-merge live checks remain required before Plan 6 may be called complete.

## Plan 6 policy note — 2026-09-21

This document preserves the Plan 5 certification result and evidence table below as historical release evidence. The approved Plan 6 policy changes what blocks **Plan 6 completion** without rewriting those historical rows:

- historical ±1-minute Prayer Engine matching is optional reference; mosque/operator approval is performed through Admin Settings plus preview/confirmation;
- destructive real-target legacy-Iqama cutover is deferred to Plan 7;
- physical TV QA, physical Prayerapp/Campaign QR scans, and 24/72-hour soak remain **NOT EXECUTED / operational follow-up** unless separately recorded;
- none of those deferred items may be relabeled PASS merely because Plan 6 can complete without them.

Plan 6 still requires live Vercel TV deployment, real root proxy/Test Control verification, settings-path audit, browser viewport verification, relevant CI/security gates, and a clean exact-head GitHub Codex review.


### Plan 6 implementation evidence snapshot

Certified pre-merge Plan 6 repository HEAD `5fb5d03ca6891ead259da097d180a9ccff9b7d96` has the following exact-head automated evidence:

- Root CI `35806268092`: **SUCCESS**.
- Masjid Display Verification `35806268096`: **SUCCESS**, including two-app integration.
- Plan 3 Display Feed Verification `35806268112`: **SUCCESS**.
- Security Scanners `35806268100`: **SUCCESS**.
- Android TWA `35806268167`: **SUCCESS**, including Android unit/lint/build verification and instrumentation on API 23 and API 37; protected signing was intentionally skipped for this PR verification run.

The final pre-merge Codex loop has produced **sixteen legitimate correctness findings so far: thirteen P1 findings and three P2 findings**. All sixteen have been fixed and their inline review threads resolved.

The latest two findings were:
1. **P1:** the Android prayer-schedule endpoint remained shared-cacheable for five minutes, allowing a native refresh immediately after timezone promotion to install stale pre-promotion schedule/timezone data;
2. **P2:** remaining user-facing religious clocks — Home header date, Ramadan current day, Azkar category selection, and Azkar daily progress — still used Berlin rather than the applied runtime timezone.

RED evidence:
- test-only HEAD `887c806194392bb54ad13d4146e018e125a9b898`;
- Root CI `35805587968`: **FAILURE** with five intended failures in `plan6-final-review-cache-religious-clock.test.ts`;
- Plan 3 Display Feed Verification `35805587956`: **FAILURE** at the not-yet-implemented Azkar timezone argument.

Fixes:
- `e9add95cfa6ca7320651b7c716d87011f0414146` — Android schedule endpoint uses `Cache-Control: no-store`;
- `397b56ec26f5b16ba54ed45f74b783a9d8e76e3e` — Azkar smart clock accepts timezone;
- `480c9fbcf81df3a1a53c9dd523b0fc4d331e49cc` and `75127435b8cc941b4dd418341dacfc173f01a245` — applied timezone reaches the Home header;
- `a69caf14be90aa5a9c676d5918e85a6e02514c67` — Ramadan day selection uses applied runtime timezone;
- `98bea478808085e6a14c795e8c2cb10805356d5a` and `c83467a94b46488a5778f6086069be17f56550ad` — Azkar page/routine use applied runtime timezone;
- `5fb5d03ca6891ead259da097d180a9ccff9b7d96` — legacy hardening assertion updated to the new authority.

GREEN exact implementation evidence is the five-run set above. Current unresolved inline review threads before this evidence refresh: **0**.

Committing this evidence creates a newer documentation-only HEAD. Fresh exact documentation-HEAD workflows and the final exact-head Codex re-review are recorded in PR #108 metadata rather than recursively rewriting this document with its own future SHA/run IDs.

Those automated results complete the current repository-side implementation/verification cycle but do not satisfy the remaining Plan 6 live-preview requirements. Under the 2026-09-22 sequencing override, no candidate-branch TV project will be created. After the approved branch is merged to `main`, the dedicated `donaumoschee-tv` project will be created against the real root production origin and the browser/Admin Test Mode evidence will be recorded.

Per the operator's 2026-09-23 direction, the final pre-merge code review was completed directly rather than waiting for Codex as a gate. The Plan 5 evidence table below remains historical and is not rewritten by this Plan 6 snapshot.



## Plan 6 final pre-merge self-review addendum — 2026-09-23

This addendum supersedes the older Plan 6 review-count snapshot above. It does **not** change the historical Plan 5 BLOCKED result or promote any missing physical/religious/real-target evidence.

The direct Plan 6 pre-merge self-review was supplemental. A fresh exact-head Codex review remained the required final review gate and later returned one additional P2 finding.

- Total legitimate Codex findings returned across the Plan 6 review loop: **22** (**16 P1, 6 P2**).
- Additional findings from the direct final review: **3** correctness/availability findings.
- All returned Codex review threads are resolved; unresolved inline review threads after final closure: **0**.

The later Codex findings beyond the 16-count snapshot above were:
- preserve legacy canonical prayers before the first `prayer_settings` save;
- read applied timezone + published rows from one atomic snapshot for Android/Feed/reminder runtime;
- parse and format announcement display windows in the applied timezone;
- preserve the legacy schedule during Home periodic/focus refresh;
- use the same atomic snapshot for Home refresh;
- use the applied runtime timezone for Admin Jumuah/Prayer Times/dashboard operational dates and the launch-readiness coverage window.

Finding 22 was returned on exact documentation HEAD `f28adda7490a0c366a688223adfe35e5d13b2676` and fixed through implementation HEAD `b158072e0408f1d91187167f13e7d9e3bad39e51` with authenticated server-only runtime-date wiring and regression coverage.

The direct final review additionally fixed:
- stale announcement forms across applied-timezone promotion;
- `/times` shell hard failure when the snapshot RPC is temporarily unavailable;
- coupling of a valid atomic prayer snapshot to an optional settings read failure, including preservation of last verified Home Iqama delays.

Earlier certified implementation HEAD:
`73c78076c0166acde1ecbbe892fa8c16da571a2e`

Latest implementation HEAD after final Codex finding 22:
`b158072e0408f1d91187167f13e7d9e3bad39e51`

Exact implementation-head automated evidence:
- Root CI `35821366976`: **SUCCESS**.
- Masjid Display Verification `35821367015`: **SUCCESS**.
- Plan 3 Display Feed Verification `35821366984`: **SUCCESS**.
- Security Scanners `35821367008`: **SUCCESS**.
- Android TWA `35821366982`: **SUCCESS**, including instrumentation on API 23 and API 37; protected signing was intentionally skipped for the PR verification run.

Finding 22 is fixed in the repository. Final exact-head workflow evidence, review-thread closure, and the clean follow-up Codex result are recorded in PR #108 metadata rather than recursively rewriting this historical certification document.

The remaining Plan 6 Vercel/root/browser/Admin Test Mode verification is still intentionally post-merge `main`. Therefore this addendum records **pre-merge repository certification**, not final live-preview completion and not a change to the historical production-certification BLOCKED result below.


## Evidence table

| Gate | Required | Current status | Evidence / blocker |
| --- | --- | --- | --- |
| Prayer Engine calibration | Yes | BLOCKED | `docs/masjid-display/prayer-engine-calibration.md`; approved calibrated profile unavailable |
| Prayer Engine production calendar certification | Yes | BLOCKED | Invariant harness exists, but no approved reviewed production timetable fixture matrix |
| DB migration local/staging dry run | Yes | PASS | Root CI `35526336680`; reviewed 81/3 fixture + full nine-migration pending-chain certification, unchanged hashes/counts, Maghrib Program 8→8, shared delays `20,15,15,5,10`, legacy Iqama columns 0 |
| Real-target legacy-Iqama cutover prerequisite | Yes | BLOCKED | Read-only target evidence: 81 prayer rows, 3 Jumuah rows, 5 legacy Iqama columns, no `prayer_settings` table |
| Root tests/lint/typecheck/build | Yes | PASS | Root CI `35526336680`: install/audit/lint/tests/typecheck/Supabase gates/build all success |
| TV tests/lint/typecheck/build | Yes | PASS | Masjid Display Verification `35526336682` and root CI `35526336680` |
| Producer/consumer Feed-v1 contract | Yes | PASS | Root CI `35526336680`: semantic fixture verifier success |
| Feed/security boundary | Yes | PASS | Security Scanners `35526336684` + TV forbidden-runtime/live verification `35526336682`; bounded public RPC projections and fail-closed source/output limits |
| Offline/LKG certification | Yes | PASS | Dedicated forward-wake/offline certification passed in `35526336682` |
| Test Mode certification | Yes | PASS | Dedicated TV certification tests + live two-app verification passed in `35526336682` |
| Display-state certification | Yes | PASS | Dedicated five-prayer/Friday certification suite passed in `35526336682` |
| 32-inch 1080p physical QA | Yes | BLOCKED | Physical execution not performed |
| Larger / 1440p / 4K adaptive QA | Yes | BLOCKED | Required physical/adaptive execution not performed |
| Persistent Prayerapp QR physical scan | Yes | BLOCKED | Real phone/camera scan not performed |
| Campaign QR physical scan | Yes | BLOCKED | Real phone/camera scan not performed |
| 24-hour soak / wake certification | Yes | BLOCKED | Continuous physical/runtime soak not performed |
| 72-hour extension | No for initial 24h gate; recommended before release | BLOCKED | Not performed |
| Deployment/rollback documentation | Yes | PASS | `docs/masjid-display/deployment.md` and `masjid-display/README.md` |
| Android TWA repository workflow | Repository-level | EXTERNAL ISSUE | Run `35526336732` failed at Android SDK setup before API install/Gradle/project tests; `sdkmanager tools` cannot find obsolete package `tools` |

## Automated implementation evidence baseline

The PASS rows above are backed by implementation/evidence HEAD `870871a52285d26cfe3f0103d8eb7e5945902519`:

- Root CI `35526336680`: SUCCESS.
- Masjid Display Verification `35526336682`: SUCCESS, including live two-app integration.
- Plan 3 Display Feed Verification `35526336782`: SUCCESS.
- Security Scanners `35526336684`: SUCCESS.
- Android TWA `35526336732`: FAILURE at SDK setup only, before project execution.

GitHub Codex Plan 5 review identified twenty-three legitimate Plan 5 certification/security-integrity findings in the review loop:

1. migration certification could miss deleted Jumuah rows;
2. wake certification moved time backward instead of proving a forward wake across expired transient states;
3. prayer-row preservation could miss deletion/date mutation;
4. prayer-row UUID identity was not initially preserved;
5. payload-exhaustion certification measured only a fixture rather than the generated production Feed;
6. initial database row caps could silently truncate older still-active urgent content;
7. source work/JSON sizing could still occur before bounded overflow detection and broad public horizons were accepted;
8. prayer base/localized note fields were missing from migration preservation hashes;
9. max+1 public readers still sorted/scanned broad candidate sets before LIMIT without adequate predicate indexes;
10. Jumuah localized language/notes were missing from migration preservation hashes;
11. campaign candidate discovery could scan a large expired-history prefix;
12. announcement candidate discovery could scan a large non-overlapping suffix;
13. source-row sizing initially measured raw storage rather than the bounded public projection;
14. migration certification did not initially restore the reviewed production-like pre-cutover snapshot and apply the complete pending migration chain;
15. bounded public RPCs still returned full raw database records instead of only the fields consumed by display mappers;
16. the migration certification document remained stale after the full-chain gate replaced the obsolete 2-prayer/1-Jumuah rollback-only exercise;
17. the bounded public projections initially omitted legacy base text fields still required as Arabic fallbacks, which could silently drop valid urgent/announcement/event/campaign content;
18. Admin publication/activation used character-count validation that could admit multibyte localized content whose public projection exceeded the 16 KiB RPC ceiling, causing a fail-closed Feed outage after publication;
19. Admin projection sizing still counted raw text bytes rather than JSON-escaped serialized bytes, so quote/backslash/control-character content could pass publication but exceed the runtime row ceiling;
20. individually valid dynamic rows could collectively exceed the whole-Feed ceiling, and the first aggregate gate only protected today's rolling horizon, allowing already-scheduled future content to become over-capacity solely as time advanced;
21. the aggregate-capacity reservation did not include selected Azkar, so a valid near-64 KiB Azkar playlist combined with the former 64 KiB dynamic allowance could exceed the final Feed ceiling;
22. after the 32 KiB dynamic + 64 KiB Azkar capacity change, the checked-in certification still cited the preceding exact-head run set, so the evidence record was refreshed to the current docs-head verification rather than implying the older run certified the newer capacity model;
23. capacity triggers could be installed when existing published/future content was already above the certified budget, producing a fail-closed Feed and blocking ordinary cleanup mutations. The migration now runs the shared capacity assertion before any trigger is installed; RED root CI `35525178440`, GREEN root CI `35526336680` with `PLAN5_CONTENT_PREFLIGHT=PASS`.

Each legitimate finding received regression/integrity coverage where appropriate before closure. The current implementation restores the authorized 81-prayer/3-Jumuah production-like snapshot at the reviewed cutoff, applies all nine pending Plan 5 migrations, verifies retained identities/values/hashes and Maghrib Program rows, uses bounded/indexed public source discovery with explicit public projections, preserves required legacy Arabic fallback semantics conditionally, measures Admin publication against JSON-serialized public projections, and atomically reserves aggregate capacity across all already-scheduled non-expired/future dynamic content under one database transaction lock. Before those enforcement triggers are installed, the migration performs the same capacity assertion against existing target content and aborts cleanly if the target is already over budget. The server independently enforces family counts, per-row bounds, a 32 KiB dynamic-content envelope, a separate 64 KiB selected-Azkar envelope, and the final 128 KiB serialized Feed ceiling. Admin Masjid Display settings apply the same selected-Azkar size envelope before persistence. Draft/inactive content remains editable, and runtime Feed validation remains fail-closed rather than silently omitting or truncating valid source rows. All required real-world/religious gates remain BLOCKED when evidence is absent.

Committing this certification evidence creates a newer evidence-only HEAD. Exact verification for that final documentation commit is recorded in PR #108 metadata/final Plan 5 report rather than recursively rewriting this document with its own future SHA/run IDs.

## Aggregation rule

Overall production certification may become **PASS only when every row with Required = Yes is PASS**.

Rows are not promoted from PENDING/BLOCKED based on intent, unit-test similarity, or prior-plan approval. Physical QA and soak require real physical/runtime evidence. Production Prayer Engine calibration requires reviewed religious reference data. Real-target destructive migration requires real-target prerequisite proof and authorization.

## Current overall result

**PRODUCTION CERTIFICATION: BLOCKED**

This status is expected and correct while required religious calibration, real-target migration prerequisite, physical TV/QR, or 24-hour soak evidence is absent.
