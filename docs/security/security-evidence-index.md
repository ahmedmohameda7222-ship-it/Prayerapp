# Prayerapp Security Evidence Index

Date: 2026-09-02

## Control Ledger

The authoritative open-control ledger is `docs/security/prelaunch/2026-09-02/open-control-closure-ledger.json`.

It contains all 324 controls from the approved matrix:

| Wave | Controls | FAIL | NOT VERIFIED |
| --- | ---: | ---: | ---: |
| 0 | 44 | 0 | 44 |
| 1 | 30 | 7 | 23 |
| 2 | 37 | 4 | 33 |
| 3 | 30 | 5 | 25 |
| 4 | 88 | 21 | 67 |
| 5 | 73 | 0 | 73 |
| 6 | 22 | 17 | 5 |

Every ledger row has:

- implementation owner;
- independent reviewer owner;
- closure evidence type;
- applicable remediation wave;
- current disposition;
- evidence reference list.

## Wave 0 Evidence Files

| File | Purpose |
| --- | --- |
| `docs/superpowers/plans/2026-09-02-prelaunch-security-remediation.md` | Verbatim approved master plan |
| `docs/security/prelaunch/2026-09-02/approved-execution-checklist.md` | Verbatim approved checklist copy |
| `docs/security/prelaunch/2026-09-02/approved-open-control-matrix.json` | Verbatim approved matrix copy |
| `docs/security/prelaunch/2026-09-02/open-control-closure-ledger.json` | Generated closure ledger with owner/evidence/wave for all 324 controls |
| `docs/security/prelaunch/2026-09-02/source-surface-inventory.json` | Machine-readable source attack-surface inventory |
| `docs/security/prelaunch/2026-09-02/baseline.md` | Exact repo/provider/test baseline |
| `docs/security/threat-model.md` | Threat model, trust boundaries, attacker capabilities, assets, objectives |
| `docs/security/data-classification.md` | Sensitive-data inventory and handling requirements |
| `docs/security/attack-surface-inventory.md` | Human-readable attack-surface inventory |
| `docs/security/security-evidence-index.md` | Evidence map and checkpoint index |

## Baseline Commands And Results

| Command/evidence source | Result |
| --- | --- |
| `git fetch origin --prune` | Completed before branch creation |
| `git rev-parse origin/main` | `b18430b360313148fc76baaeda9d96844ed508a5` |
| `git diff --name-status b18430b360313148fc76baaeda9d96844ed508a5..origin/main` | Empty |
| `gh pr list --state open` | #34, #14, #13 only |
| `gh api repos/.../rulesets/22020137` | Main ruleset active; required reviews = 0 |
| `gh api repos/.../environments` | `Production`, `Preview`, `android-production` observed |
| Supabase `_get_project` | Project `dbqbzvkleqzbgufllgca`, active healthy, Postgres 17 |
| Supabase `_list_migrations` | History ends at `20260822201832` |
| Supabase read-only schema probes | Native receipt v2 missing/partial; later objects partially present |
| `curl -I https://donaumoschee.vercel.app` | 200 OK, live CSP still uses `unsafe-inline` |
| `npm ci` | Completed; dev-inclusive install audit reported one high advisory |
| `npm audit --omit=dev --json` | 0 production vulnerabilities |
| focused failed-test rerun after harness fix | 31 passed |
| `npm test` after harness fix | 119 files / 537 tests passed |

## Evidence Gaps Not Yet Closed

- Supabase Auth redirect/provider/leaked-password setting evidence requires dashboard/management proof and explicit approval before changes.
- Production migration repair and schema reconciliation require exact migration-equivalence ledger and explicit production approval.
- CodeQL, full-history secret scan, SBOM generation, DAST, Android static analysis, signed RC, physical-device QA, restore drill, monitoring exercise, IR tabletop, final production smoke, and 990-control exact-head rerun are later-wave evidence.

## Production Mutations

NONE.
