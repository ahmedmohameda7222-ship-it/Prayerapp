# Wave 0 Control Ownership Gate

Date: 2026-09-02

The full control ownership record is `open-control-closure-ledger.json`.

## Gate Statement

Every one of the 324 open controls from the approved matrix has:

- an implementation owner derived from the required evidence class;
- an independent reviewer owner;
- a closure evidence type;
- an applicable remediation wave;
- a current disposition of `OPEN` pending evidence.

This file does not mark controls PASS. PASS/N/A decisions remain bound to the original 990-control checklist and the evidence required by each control.

## Owner Mapping

| Evidence class | Implementation owner |
| --- | --- |
| Production Supabase schema/config/log evidence | Supabase evidence preparer; user approves production mutation; independent reviewer verifies |
| Code/config review plus reproducible verification evidence | Wave-specific owner: Wave 0 security inventory/evidence; Wave 1 auth/authorization evidence; Wave 3 repository/secrets governance evidence; Wave 4 Android security verification; Wave 5 production hosting security evidence; independent reviewer verifies |
| Automated test + durable audit-log evidence | Admin audit remediation engineer; independent reviewer verifies |
| RED->GREEN automated regression + live/black-box evidence | Web/API remediation engineer; independent reviewer verifies |
| CI scan/SBOM artifact | CI/security supply-chain engineer; independent reviewer verifies |
| GitHub ruleset/config evidence | Repository governance preparer; user approves remote ruleset change; independent reviewer verifies |
| Signed artifact/static analysis/device evidence | Android remediation engineer; user approves production signing/publishing gates; independent reviewer verifies |
| Authorized DAST evidence + retest | DAST evidence preparer; user approves invasive production testing; independent reviewer verifies |
| Documented runbook/model plus exercised evidence | Operations/security documentation owner; independent reviewer verifies |
| Exact-head release evidence | Release evidence assembler; user approves merge/deploy/sign/release; independent reviewer verifies |

## Automated Consistency Enforcement

The ledger is generated from the binding open-control matrix by `scripts/security/generate-open-control-closure-ledger.mjs`. The generator fails closed on any unmapped required-evidence class or unmapped code/config remediation wave.

`lib/__tests__/security-open-control-ledger-consistency.test.ts` independently rejects:

- any control population other than exactly 324 controls / 54 FAIL / 270 NOT VERIFIED;
- duplicate or missing `OPEN-001` through `OPEN-324` identifiers;
- null or empty implementation owner, independent reviewer, closure-evidence type, remediation wave, or disposition;
- PASS/N/A dispositions without independent-review ownership and non-empty closure evidence references.

## Counts

| Wave | Controls |
| --- | ---: |
| 0 | 44 |
| 1 | 30 |
| 2 | 37 |
| 3 | 30 |
| 4 | 88 |
| 5 | 73 |
| 6 | 22 |

Total: 324.

## Production Mutations

NONE.
