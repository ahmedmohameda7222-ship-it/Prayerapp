# Masjid Display — Production Certification

Status: BLOCKED

Plan 5 is a production-readiness evidence gate. Software/certification-framework completion does not convert missing religious, real-target, physical, or soak evidence into PASS.

## Evidence table

| Gate | Required | Current status | Evidence / blocker |
| --- | --- | --- | --- |
| Prayer Engine calibration | Yes | BLOCKED | `docs/masjid-display/prayer-engine-calibration.md`; approved calibrated profile unavailable |
| Prayer Engine production calendar certification | Yes | BLOCKED | Invariant harness exists, but no approved reviewed production timetable fixture matrix |
| DB migration local/staging dry run | Yes | PENDING | `scripts/verify-masjid-display-migration.sh`; final CI execution required |
| Real-target legacy-Iqama cutover prerequisite | Yes | BLOCKED | Validated production singleton/shared delays and destructive-cutover authorization not proven |
| Root tests/lint/typecheck/build | Yes | PENDING | Final Plan 5 HEAD CI required |
| TV tests/lint/typecheck/build | Yes | PENDING | Final Plan 5 HEAD CI required |
| Producer/consumer Feed-v1 contract | Yes | PENDING | Contract tests/verifier added; final Plan 5 HEAD CI required |
| Feed/security boundary | Yes | PENDING | Security tests/review added; final CI + Codex required |
| Offline/LKG certification | Yes | PENDING | Dedicated certification suite added; final CI required |
| Test Mode certification | Yes | PENDING | Dedicated certification suite + operator checklist added; final CI required |
| Display-state certification | Yes | PENDING | Dedicated five-prayer/Friday boundary suite added; final CI required |
| 32-inch 1080p physical QA | Yes | BLOCKED | Physical execution not performed |
| Larger / 1440p / 4K adaptive QA | Yes | BLOCKED | Required physical/adaptive execution not performed |
| Persistent Prayerapp QR physical scan | Yes | BLOCKED | Real phone/camera scan not performed |
| Campaign QR physical scan | Yes | BLOCKED | Real phone/camera scan not performed |
| 24-hour soak / wake certification | Yes | BLOCKED | Continuous physical/runtime soak not performed |
| 72-hour extension | No for initial 24h gate; recommended before release | BLOCKED | Not performed |
| Deployment/rollback documentation | Yes | PASS | `docs/masjid-display/deployment.md` and `masjid-display/README.md` |
| Android TWA repository workflow | Repository-level | EXTERNAL ISSUE | Exact Plan 5 evidence must record actual workflow result; known setup failure occurs before project test/build |

## Aggregation rule

Overall production certification may become **PASS only when every row with Required = Yes is PASS**.

Rows are not promoted from PENDING/BLOCKED based on intent, unit-test similarity, or prior-plan approval. Physical QA and soak require real physical/runtime evidence. Production Prayer Engine calibration requires reviewed religious reference data. Real-target destructive migration requires real-target prerequisite proof and authorization.

## Current overall result

**PRODUCTION CERTIFICATION: BLOCKED**

This status is expected and correct while required religious calibration, real-target migration prerequisite, physical TV/QR, or 24-hour soak evidence is absent.
