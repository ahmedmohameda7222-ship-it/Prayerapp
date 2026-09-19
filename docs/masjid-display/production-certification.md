# Masjid Display — Production Certification

Status: BLOCKED

Plan 5 is a production-readiness evidence gate. Software/certification-framework completion does not convert missing religious, real-target, physical, or soak evidence into PASS.

## Evidence table

| Gate | Required | Current status | Evidence / blocker |
| --- | --- | --- | --- |
| Prayer Engine calibration | Yes | BLOCKED | `docs/masjid-display/prayer-engine-calibration.md`; approved calibrated profile unavailable |
| Prayer Engine production calendar certification | Yes | BLOCKED | Invariant harness exists, but no approved reviewed production timetable fixture matrix |
| DB migration local/staging dry run | Yes | PASS | Root CI `35472416648`; reviewed 81/3 fixture + full nine-migration pending-chain certification, unchanged hashes/counts, Maghrib Program 8→8, shared delays `20,15,15,5,10`, legacy Iqama columns 0 |
| Real-target legacy-Iqama cutover prerequisite | Yes | BLOCKED | Read-only target evidence: 81 prayer rows, 3 Jumuah rows, 5 legacy Iqama columns, no `prayer_settings` table |
| Root tests/lint/typecheck/build | Yes | PASS | Root CI `35472416648`: install/audit/lint/tests/typecheck/Supabase gates/build all success |
| TV tests/lint/typecheck/build | Yes | PASS | Masjid Display Verification `35472416618` and root CI `35441435280` |
| Producer/consumer Feed-v1 contract | Yes | PASS | Root CI `35472416648`: semantic fixture verifier success |
| Feed/security boundary | Yes | PASS | Security Scanners `35472416596` + TV forbidden-runtime/live verification `35441435271`; bounded public RPC projections and fail-closed source/output limits |
| Offline/LKG certification | Yes | PASS | Dedicated forward-wake/offline certification passed in `35472416618` |
| Test Mode certification | Yes | PASS | Dedicated TV certification tests + live two-app verification passed in `35472416618` |
| Display-state certification | Yes | PASS | Dedicated five-prayer/Friday certification suite passed in `35472416618` |
| 32-inch 1080p physical QA | Yes | BLOCKED | Physical execution not performed |
| Larger / 1440p / 4K adaptive QA | Yes | BLOCKED | Required physical/adaptive execution not performed |
| Persistent Prayerapp QR physical scan | Yes | BLOCKED | Real phone/camera scan not performed |
| Campaign QR physical scan | Yes | BLOCKED | Real phone/camera scan not performed |
| 24-hour soak / wake certification | Yes | BLOCKED | Continuous physical/runtime soak not performed |
| 72-hour extension | No for initial 24h gate; recommended before release | BLOCKED | Not performed |
| Deployment/rollback documentation | Yes | PASS | `docs/masjid-display/deployment.md` and `masjid-display/README.md` |
| Android TWA repository workflow | Repository-level | EXTERNAL ISSUE | Run `35472416623` failed at Android SDK setup before API install/Gradle/project tests; `sdkmanager tools` cannot find obsolete package `tools` |

## Automated implementation evidence baseline

The PASS rows above are backed by implementation/evidence HEAD `57d2c46c56d6af46511e5223e3bc230ed4a854ca`:

- Root CI `35472416648`: SUCCESS.
- Masjid Display Verification `35472416618`: SUCCESS, including live two-app integration.
- Plan 3 Display Feed Verification `35441435398`: SUCCESS.
- Security Scanners `35472416596`: SUCCESS.
- Android TWA `35441435313`: FAILURE at SDK setup only, before project execution.

GitHub Codex Plan 5 review identified eighteen legitimate Plan 5 certification/security-integrity findings in the final review loop:

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
18. Admin publication/activation used character-count validation that could admit multibyte localized content whose public projection exceeded the 16 KiB RPC ceiling, causing a fail-closed Feed outage after publication.

Each legitimate finding received regression/integrity coverage where appropriate before closure. The current implementation restores the authorized 81-prayer/3-Jumuah production-like snapshot at the reviewed cutoff, applies all nine pending Plan 5 migrations, verifies retained identities/values/hashes and Maghrib Program rows, uses bounded/indexed public source discovery with explicit public projections, preserves required legacy Arabic fallback semantics conditionally, and enforces a conservative 10 KiB UTF-8 variable-content budget in announcement/event/campaign Admin publication and activation paths before content can violate the public 16 KiB row ceiling. Draft/inactive content remains editable, and runtime Feed validation remains fail-closed rather than silently omitting oversized source rows. All required real-world/religious gates remain BLOCKED when evidence is absent.

Committing this certification evidence creates a newer evidence-only HEAD. Exact verification for that final documentation commit is recorded in PR #108 metadata/final Plan 5 report rather than recursively rewriting this document with its own future SHA/run IDs.

## Aggregation rule

Overall production certification may become **PASS only when every row with Required = Yes is PASS**.

Rows are not promoted from PENDING/BLOCKED based on intent, unit-test similarity, or prior-plan approval. Physical QA and soak require real physical/runtime evidence. Production Prayer Engine calibration requires reviewed religious reference data. Real-target destructive migration requires real-target prerequisite proof and authorization.

## Current overall result

**PRODUCTION CERTIFICATION: BLOCKED**

This status is expected and correct while required religious calibration, real-target migration prerequisite, physical TV/QR, or 24-hour soak evidence is absent.
