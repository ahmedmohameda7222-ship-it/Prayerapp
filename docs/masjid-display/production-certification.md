# Masjid Display — Production Certification

Status: BLOCKED

Plan 5 is a production-readiness evidence gate. Software/certification-framework completion does not convert missing religious, real-target, physical, or soak evidence into PASS.

## Evidence table

| Gate | Required | Current status | Evidence / blocker |
| --- | --- | --- | --- |
| Prayer Engine calibration | Yes | BLOCKED | `docs/masjid-display/prayer-engine-calibration.md`; approved calibrated profile unavailable |
| Prayer Engine production calendar certification | Yes | BLOCKED | Invariant harness exists, but no approved reviewed production timetable fixture matrix |
| DB migration local/staging dry run | Yes | PASS | Root CI `35417979067`; strengthened rollback-only prayer/Jumuah identity and preservation exercise passed after Codex fixes |
| Real-target legacy-Iqama cutover prerequisite | Yes | BLOCKED | Read-only target evidence: 81 prayer rows, 3 Jumuah rows, 5 legacy Iqama columns, no `prayer_settings` table |
| Root tests/lint/typecheck/build | Yes | PASS | Root CI `35417979067`: install/audit/lint/tests/typecheck/Supabase gates/build all success |
| TV tests/lint/typecheck/build | Yes | PASS | Masjid Display Verification `35417979029` and root CI `35415341665` |
| Producer/consumer Feed-v1 contract | Yes | PASS | Root CI `35417979067`: semantic fixture verifier success |
| Feed/security boundary | Yes | PASS | Security Scanners `35417979047` + TV forbidden-runtime gate `35415341668` |
| Offline/LKG certification | Yes | PASS | Strengthened forward-wake certification passed in `35415341668`; RED integrity guard was `35413283210` |
| Test Mode certification | Yes | PASS | Dedicated TV certification tests + live two-app verification passed in `35415341668` |
| Display-state certification | Yes | PASS | Dedicated five-prayer/Friday certification suite passed in `35415341668` |
| 32-inch 1080p physical QA | Yes | BLOCKED | Physical execution not performed |
| Larger / 1440p / 4K adaptive QA | Yes | BLOCKED | Required physical/adaptive execution not performed |
| Persistent Prayerapp QR physical scan | Yes | BLOCKED | Real phone/camera scan not performed |
| Campaign QR physical scan | Yes | BLOCKED | Real phone/camera scan not performed |
| 24-hour soak / wake certification | Yes | BLOCKED | Continuous physical/runtime soak not performed |
| 72-hour extension | No for initial 24h gate; recommended before release | BLOCKED | Not performed |
| Deployment/rollback documentation | Yes | PASS | `docs/masjid-display/deployment.md` and `masjid-display/README.md` |
| Android TWA repository workflow | Repository-level | EXTERNAL ISSUE | Run `35415341676` failed at Android SDK setup before API install/Gradle/project tests; `sdkmanager tools` cannot find obsolete package `tools` |

## Automated implementation evidence baseline

The PASS rows above are backed by strengthened implementation HEAD `27845baffce4359dcdac82f6754df3b33e70684a`:

- Root CI `35417979067`: SUCCESS.
- Masjid Display Verification `35417979029`: SUCCESS, including live two-app integration.
- Plan 3 Display Feed Verification `35417979109`: SUCCESS.
- Security Scanners `35417979047`: SUCCESS.
- Android TWA `35417979031`: FAILURE at SDK setup only, before project execution.

GitHub Codex Plan 5 review found five legitimate certification-integrity/security findings during the review loop:
1. deleted Jumuah rows were not explicitly rejected by the local migration exercise;
2. the wake certification moved the device clock backward rather than proving a forward wake across expired transient states;
3. prayer-row preservation used an inner join by date and could miss deletion/date mutation;
4. the prayer-row snapshot omitted the UUID, allowing replacement under the same date/values to masquerade as preservation;
5. the payload-exhaustion gate measured only the fixture while production dynamic readers/serialized Feed remained unbounded.

Each finding received a failing regression/integrity guard before the fix. The final strengthened implementation is green on `27845baffce4359dcdac82f6754df3b33e70684a` in the runs above.

Committing certification evidence necessarily creates a newer evidence-only HEAD. Exact final-HEAD verification for that commit is recorded in PR #108 metadata/final Plan 5 report rather than creating an infinite self-referential documentation-commit loop.

## Aggregation rule

Overall production certification may become **PASS only when every row with Required = Yes is PASS**.

Rows are not promoted from PENDING/BLOCKED based on intent, unit-test similarity, or prior-plan approval. Physical QA and soak require real physical/runtime evidence. Production Prayer Engine calibration requires reviewed religious reference data. Real-target destructive migration requires real-target prerequisite proof and authorization.

## Current overall result

**PRODUCTION CERTIFICATION: BLOCKED**

This status is expected and correct while required religious calibration, real-target migration prerequisite, physical TV/QR, or 24-hour soak evidence is absent.
