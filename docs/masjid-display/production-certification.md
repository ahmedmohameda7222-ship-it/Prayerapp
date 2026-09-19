# Masjid Display — Production Certification

Status: BLOCKED

Plan 5 is a production-readiness evidence gate. Software/certification-framework completion does not convert missing religious, real-target, physical, or soak evidence into PASS.

## Evidence table

| Gate | Required | Current status | Evidence / blocker |
| --- | --- | --- | --- |
| Prayer Engine calibration | Yes | BLOCKED | `docs/masjid-display/prayer-engine-calibration.md`; approved calibrated profile unavailable |
| Prayer Engine production calendar certification | Yes | BLOCKED | Invariant harness exists, but no approved reviewed production timetable fixture matrix |
| DB migration local/staging dry run | Yes | PASS | Root CI `35427781285`; strengthened rollback-only prayer/Jumuah identity and preservation exercise passed after Codex fixes |
| Real-target legacy-Iqama cutover prerequisite | Yes | BLOCKED | Read-only target evidence: 81 prayer rows, 3 Jumuah rows, 5 legacy Iqama columns, no `prayer_settings` table |
| Root tests/lint/typecheck/build | Yes | PASS | Root CI `35427781285`: install/audit/lint/tests/typecheck/Supabase gates/build all success |
| TV tests/lint/typecheck/build | Yes | PASS | Masjid Display Verification `35427781275` and root CI `35427781285` |
| Producer/consumer Feed-v1 contract | Yes | PASS | Root CI `35427781285`: semantic fixture verifier success |
| Feed/security boundary | Yes | PASS | Security Scanners `35427781316` + TV forbidden-runtime/live verification `35427781275` |
| Offline/LKG certification | Yes | PASS | Strengthened forward-wake certification passed in `35427781275`; RED integrity guard was `35413283210` |
| Test Mode certification | Yes | PASS | Dedicated TV certification tests + live two-app verification passed in `35427781275` |
| Display-state certification | Yes | PASS | Dedicated five-prayer/Friday certification suite passed in `35427781275` |
| 32-inch 1080p physical QA | Yes | BLOCKED | Physical execution not performed |
| Larger / 1440p / 4K adaptive QA | Yes | BLOCKED | Required physical/adaptive execution not performed |
| Persistent Prayerapp QR physical scan | Yes | BLOCKED | Real phone/camera scan not performed |
| Campaign QR physical scan | Yes | BLOCKED | Real phone/camera scan not performed |
| 24-hour soak / wake certification | Yes | BLOCKED | Continuous physical/runtime soak not performed |
| 72-hour extension | No for initial 24h gate; recommended before release | BLOCKED | Not performed |
| Deployment/rollback documentation | Yes | PASS | `docs/masjid-display/deployment.md` and `masjid-display/README.md` |
| Android TWA repository workflow | Repository-level | EXTERNAL ISSUE | Run `35427781292` failed at Android SDK setup before API install/Gradle/project tests; `sdkmanager tools` cannot find obsolete package `tools` |

## Automated implementation evidence baseline

The PASS rows above are backed by strengthened implementation HEAD `8017b179c8aabe84ef4002c0f200c89a820144b3`:

- Root CI `35427781285`: SUCCESS.
- Masjid Display Verification `35427781275`: SUCCESS, including live two-app integration.
- Plan 3 Display Feed Verification `35427781283`: SUCCESS.
- Security Scanners `35427781316`: SUCCESS.
- Android TWA `35427781292`: FAILURE at SDK setup only, before project execution.

GitHub Codex Plan 5 review found thirteen legitimate certification-integrity/security findings during the review loop:
1. deleted Jumuah rows were not explicitly rejected by the local migration exercise;
2. the wake certification moved the device clock backward rather than proving a forward wake across expired transient states;
3. prayer-row preservation used an inner join by date and could miss deletion/date mutation;
4. the prayer-row snapshot omitted the UUID, allowing replacement under the same date/values to masquerade as preservation;
5. the payload-exhaustion gate measured only the fixture while production dynamic readers/serialized Feed remained unbounded;
6. the first database row cap could silently drop an older still-active urgent announcement, so overflow was changed from truncation to fail-closed max+1 detection;
7. the first oversize-row guard serialized all matching rows before LIMIT and allowed arbitrarily broad public RPC horizons, so horizon validation and bounded max+1 processing now happen before JSON-size inspection;
8. the migration preservation hash omitted `note` plus `note_ar`/`note_en`/`note_de`/`note_tr`, so all retained prayer note fields are now part of the certified BEFORE/AFTER identity/value hash;
9. public max+1 RPCs still sorted the full qualifying set before LIMIT and lacked supporting predicate indexes, so candidate IDs are now bounded unsorted first and only the bounded set is sorted/serialized;
10. the Jumuah migration hash omitted `language_ar/en/de/tr` and `notes_ar/en/de/tr`, so all localized Jumuah language/notes fields are now certified;
11. the active campaign candidate search could still scan a large expired-history prefix when overlap matches were sparse, so it now uses a partial GiST `daterange` overlap index and `&&` predicate;
12. announcement candidate discovery still used one-sided timestamp ranges that could scan a large non-overlapping suffix, so it now uses a partial GiST `tstzrange` overlap index and `&&` predicate;
13. the 16 KiB source-row ceiling initially measured raw storage rows, so valid campaigns with duplicated/non-displayed localized columns could fail the Feed even when their public projection was bounded; sizing now uses the bounded public projection.

Each legitimate finding received regression/integrity coverage before closure. The final implementation is green on `8017b179c8aabe84ef4002c0f200c89a820144b3`: Plan 3 `35427781283`, root CI `35427781285`, Masjid Display `35427781275`, and Security `35427781316`.

Committing certification evidence necessarily creates a newer evidence-only HEAD. Exact final-HEAD verification for that commit is recorded in PR #108 metadata/final Plan 5 report rather than creating an infinite self-referential documentation-commit loop.

## Aggregation rule

Overall production certification may become **PASS only when every row with Required = Yes is PASS**.

Rows are not promoted from PENDING/BLOCKED based on intent, unit-test similarity, or prior-plan approval. Physical QA and soak require real physical/runtime evidence. Production Prayer Engine calibration requires reviewed religious reference data. Real-target destructive migration requires real-target prerequisite proof and authorization.

## Current overall result

**PRODUCTION CERTIFICATION: BLOCKED**

This status is expected and correct while required religious calibration, real-target migration prerequisite, physical TV/QR, or 24-hour soak evidence is absent.
