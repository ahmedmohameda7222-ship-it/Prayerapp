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

No control disposition is changed solely because implementation evidence exists; PASS/N/A still requires the approved closure evidence and independent review.

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

## Wave 1 Supabase Evidence Files

| File | Purpose |
| --- | --- |
| `docs/security/prelaunch/2026-09-02/supabase-migration-equivalence.md` | Pre-reconciliation migration-equivalence ledger plus exact local verification, Production application, post-apply schema, live API/Vercel evidence, and resulting migration state |
| `docs/security/prelaunch/2026-09-02/supabase-reconciliation-recovery.md` | Fail-closed recovery and forward-fix procedure; destructive rollback/history repair remain separately gated |
| `supabase/migrations/20260902170000_prelaunch_schema_reconciliation.sql` | Reviewed additive/fail-closed reconciliation migration for missing native-delivery-v2 state |
| `scripts/security/verify-production-schema.sql` | Read-only semantic verifier for native-delivery-v2, Friday V2, durable rate limiting, and atomic push registration |
| `lib/__tests__/supabase-production-schema-contract.test.ts` | Frozen source-contract tests requiring exact verifier, migration, and permanent CI evidence |
| `.github/workflows/ci.yml` | Permanent clean-bootstrap, local verifier, idempotence, preservation, and incompatible-partial-schema rejection gates |

## Baseline Commands And Results

| Command/evidence source | Result |
| --- | --- |
| `git fetch origin --prune` | Completed before branch creation |
| `git rev-parse origin/main` | `b18430b360313148fc76baaeda9d96844ed508a5` |
| `git diff --name-status b18430b360313148fc76baaeda9d96844ed508a5..origin/main` | Empty |
| `gh pr list --state open` | #34, #14, #13 only at baseline capture |
| `gh api repos/.../rulesets/22020137` | Main ruleset active; required reviews = 0 |
| `gh api repos/.../environments` | `Production`, `Preview`, `android-production` observed |
| Supabase `_get_project` | Project `dbqbzvkleqzbgufllgca`, active healthy, Postgres 17 |
| Supabase pre-remediation `_list_migrations` | History ended at `20260822201832` |
| Supabase pre-remediation read-only schema probes | Native receipt v2 missing; later objects partially/semantically present |
| `curl -I https://donaumoschee.vercel.app` | 200 OK; baseline live CSP still used `unsafe-inline` |
| `npm ci` | Completed; dev-inclusive install audit reported one high advisory |
| `npm audit --omit=dev --json` | 0 production vulnerabilities |
| focused failed-test rerun after harness fix | 31 passed |
| `npm test` after harness fix | 119 files / 537 tests passed |

## Wave 1 Reconciliation Verification

Pre-Production exact-head verification:

- candidate head: `f355ae3f57e920b888f1253d6da59f60885b82a0`
- CI run: `33683799074`
- CI job: `100426311707`
- result: **SUCCESS**
- tests: **121 files / 547 tests passed**
- clean Supabase bootstrap: **PASS**
- local production-schema verifier: **PASS**
- repeated reconciliation/idempotence: **PASS**
- synthetic installation-row preservation: **PASS**
- incompatible partial-schema rejection: **PASS**
- production build: **PASS**

Production application and post-apply read-only verification:

- Production Supabase project: `dbqbzvkleqzbgufllgca`
- applied new migration name: `prelaunch_schema_reconciliation`
- Production-recorded migration version: `20260902211847`
- result: **SUCCESS**
- repository verifier against Production: **PASS**
- native installation row count: `0` before and `0` after application
- receipt table/columns/constraints/indexes/RLS/grants: verified exact semantic contract
- live Supabase API transition: receipt cleanup **404 → 204** and new-column native-authority lookup **400 → 200** immediately after reconciliation
- live Vercel `/api/cron/prayer-reminders`: pre-migration schema warnings through 21:18 UTC; clean HTTP 200 executions at 21:19, 21:20, and 21:21 UTC
- no application redeploy was required for the schema correction
- no historical migration was blindly replayed
- no migration-history repair or metadata manipulation was performed

## Evidence Gaps Not Yet Closed

- Supabase Auth redirect/provider/leaked-password setting evidence requires the separately gated Auth/configuration operation before any setting change.
- GitHub ruleset changes remain separately gated.
- Production secret rotation remains separately gated.
- CodeQL, full-history secret scan, SBOM generation, DAST, Android static analysis, signed RC, physical-device QA, restore drill, monitoring exercise, IR tabletop, final production smoke, and 990-control exact-head rerun are later-wave evidence as applicable under the approved plan.
- Historical Supabase migration-history repair remains separately gated and is not required for the successful Wave 1 schema reconciliation.

## Production Mutations

One authorized ordinary security-remediation migration has been applied in Wave 1:

- `20260902211847_prelaunch_schema_reconciliation` on Production Supabase project `dbqbzvkleqzbgufllgca`.

No Supabase Auth/provider configuration, leaked-password protection setting, migration-history repair, GitHub ruleset, production secret rotation, Android Production signing/publication, merge, or destructive Production test was performed.
