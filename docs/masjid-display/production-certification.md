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

Certified pre-merge Plan 6 implementation HEAD `0e021520058a73a1407c488ae2cee4d19f69692b` has the following fresh automated evidence:

- Root CI `35761167100`: **SUCCESS**.
- Masjid Display Verification `35761167195`: **SUCCESS**, including two-app integration.
- Plan 3 Display Feed Verification `35761167151`: **SUCCESS**.
- Security Scanners `35761167067`: **SUCCESS**.
- Android TWA `35761167078`: **SUCCESS**, including Android unit/lint/build verification and instrumentation on API 23 and API 37; protected signing was intentionally skipped for this PR verification run.

The final pre-merge Codex loop has produced six legitimate correctness P1 findings so far:

1. canonical prayer-event identity did not include the resolved delivery instant;
2. the receipt API accepted p3 while the database CHECK still allowed only p2;
3. a stale legacy p2 receipt could suppress fallback at a newly resolved due instant;
4. a pending timezone edit could affect live scheduling before recalculation promoted it;
5. the database dynamic-content capacity gate used the Berlin calendar date instead of the applied prayer timezone;
6. Home and `/events` event filtering could still use Berlin across an applied-timezone date boundary.

The first four were already closed with p3/v3 `dueAtMs` identity, additive p2/p3 receipt schema support, due-instant compatibility checks for legacy receipts, and persisted `applied_timezone` runtime authority.

For findings 5–6, test-only HEAD `426990220da06a9d48f912df9afdcd0c4a2ba97f` produced Root CI `35760200228` with exactly three intended failures:
- one in `plan6-dynamic-budget-timezone-authority.test.ts`;
- two in `plan6-event-timezone-authority.test.ts`.

The fixes now:
- redefine `assert_masjid_display_dynamic_content_budget()` after the applied-timezone migration so its date window comes from `prayer_settings.applied_timezone`;
- keep the database aggregate budget aligned with the runtime Feed's applied calendar authority;
- make `isUpcomingEvent` timezone-aware;
- pass `getRuntimePrayerSettings().timezone` through Home and `/events` event filtering.

The exact implementation-head five-workflow set above is green after all six correctness fixes.

The latest Codex pass also raised a documentation/certification P1 because the prior checked-in snapshot still cited an older implementation SHA and run set. This snapshot corrects that mismatch by recording implementation HEAD `0e021520058a73a1407c488ae2cee4d19f69692b` and its five workflow IDs.

Committing this evidence creates a newer documentation-only HEAD. Fresh exact documentation-HEAD workflows and the final Codex re-review are recorded in PR #108 metadata rather than recursively rewriting this document with its own future SHA/run IDs.

Those automated results complete the current repository-side implementation/verification cycle but do not satisfy the remaining Plan 6 live-preview requirements. Under the 2026-09-22 sequencing override, no candidate-branch TV project will be created. After the approved branch is merged to `main`, the dedicated `donaumoschee-tv` project will be created against the real root production origin and the browser/Admin Test Mode evidence will be recorded.

A clean final exact-head Codex re-review remains the last pre-merge review gate. The Plan 5 evidence table below remains historical and is not rewritten by this Plan 6 snapshot.


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
