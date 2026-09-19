# Masjid Display — Production Certification

Status: BLOCKED

Plan 5 is a production-readiness evidence gate. Software/certification-framework completion does not convert missing religious, real-target, physical, or soak evidence into PASS.

## Evidence table

| Gate | Required | Current status | Evidence / blocker |
| --- | --- | --- | --- |
| Prayer Engine calibration | Yes | BLOCKED | `docs/masjid-display/prayer-engine-calibration.md`; approved calibrated profile unavailable |
| Prayer Engine production calendar certification | Yes | BLOCKED | Invariant harness exists, but no approved reviewed production timetable fixture matrix |
| DB migration local/staging dry run | Yes | PASS | Root CI `35413523120`; strengthened rollback-only gate/preservation exercise passed after Codex deletion-guard fix |
| Real-target legacy-Iqama cutover prerequisite | Yes | BLOCKED | Read-only target evidence: 81 prayer rows, 3 Jumuah rows, 5 legacy Iqama columns, no `prayer_settings` table |
| Root tests/lint/typecheck/build | Yes | PASS | Root CI `35413523120`: install/audit/lint/tests/typecheck/Supabase gates/build all success |
| TV tests/lint/typecheck/build | Yes | PASS | Masjid Display Verification `35413523100` and root CI `35413523120` |
| Producer/consumer Feed-v1 contract | Yes | PASS | Root CI `35413523120`: semantic fixture verifier success |
| Feed/security boundary | Yes | PASS | Security Scanners `35413523141` + TV forbidden-runtime gate `35413523100` |
| Offline/LKG certification | Yes | PASS | Strengthened forward-wake certification passed in `35413523100`; RED integrity guard was `35413283210` |
| Test Mode certification | Yes | PASS | Dedicated TV certification tests + live two-app verification passed in `35413523100` |
| Display-state certification | Yes | PASS | Dedicated five-prayer/Friday certification suite passed in `35413523100` |
| 32-inch 1080p physical QA | Yes | BLOCKED | Physical execution not performed |
| Larger / 1440p / 4K adaptive QA | Yes | BLOCKED | Required physical/adaptive execution not performed |
| Persistent Prayerapp QR physical scan | Yes | BLOCKED | Real phone/camera scan not performed |
| Campaign QR physical scan | Yes | BLOCKED | Real phone/camera scan not performed |
| 24-hour soak / wake certification | Yes | BLOCKED | Continuous physical/runtime soak not performed |
| 72-hour extension | No for initial 24h gate; recommended before release | BLOCKED | Not performed |
| Deployment/rollback documentation | Yes | PASS | `docs/masjid-display/deployment.md` and `masjid-display/README.md` |
| Android TWA repository workflow | Repository-level | EXTERNAL ISSUE | Run `35413523132` failed at Android SDK setup before API install/Gradle/project tests; `sdkmanager tools` cannot find obsolete package `tools` |

## Automated implementation evidence baseline

The PASS rows above are backed by post-Codex-fix implementation HEAD `b16811c0e994c7ab05831625de886c06b2a785a2`:

- Root CI `35413523120`: SUCCESS.
- Masjid Display Verification `35413523100`: SUCCESS; 169 TV tests passed / 4 skipped and live two-app integration 4/4 passed.
- Plan 3 Display Feed Verification `35413523150`: SUCCESS.
- Security Scanners `35413523141`: SUCCESS.
- Android TWA `35413523132`: FAILURE at SDK setup only, before project execution.

GitHub Codex Plan 5 review round 1 on `e16ec37166` found two legitimate certification-integrity issues: deleted Jumuah rows were not explicitly rejected by the local migration exercise, and the wake certification moved the device clock backward. Both were reproduced by failing guards and fixed on `b16811c0e994c7ab05831625de886c06b2a785a2`. The strengthened suites are green in the runs above.

Committing certification evidence necessarily creates a newer evidence-only HEAD. Exact final-HEAD verification for that commit is recorded in PR #108 metadata/final Plan 5 report rather than creating an infinite self-referential documentation-commit loop.

## Aggregation rule

Overall production certification may become **PASS only when every row with Required = Yes is PASS**.

Rows are not promoted from PENDING/BLOCKED based on intent, unit-test similarity, or prior-plan approval. Physical QA and soak require real physical/runtime evidence. Production Prayer Engine calibration requires reviewed religious reference data. Real-target destructive migration requires real-target prerequisite proof and authorization.

## Current overall result

**PRODUCTION CERTIFICATION: BLOCKED**

This status is expected and correct while required religious calibration, real-target migration prerequisite, physical TV/QR, or 24-hour soak evidence is absent.
