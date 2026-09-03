# Prayerapp Backup, Restore and Recovery Security Record

Last reviewed: 2026-09-03

## Recovery objectives

Prayerapp recovery prioritizes preservation of user data and audit evidence over destructive rollback. Schema changes are migration-controlled, runtime deployments are commit-addressable, and populated Production objects must not be dropped automatically to reverse a failed security remediation.

## Verified recovery mechanisms

### Repository and deployment

- GitHub preserves source and reviewed commit history used for release provenance.
- Vercel keeps immutable deployment records with identifiable current/prior deployments for rollback investigation.
- Application rollback and database recovery are separate decisions; rollback must not implicitly reverse database migrations.
- The exact remediation web source is not currently deployed to Production, so no post-remediation Vercel rollback claim is made.

### Database schema

- Repository Supabase migrations define the reproducible schema path.
- CI performs a clean local Supabase bootstrap from migrations.
- Security reconciliation and admin-audit migrations have idempotence, fail-closed/incompatible-state and data-preservation proofs.
- `scripts/security/verify-production-schema.sql` independently checks security-critical schema semantics.
- Migration-history metadata repair is not a recovery shortcut. Fresh semantic equivalence for the four historical candidates is proven, but no metadata-only repair was executed because the connected Supabase surface exposes no supported `repair` / `mark-applied` primitive.

### Production security-remediation recovery

For an ordinary security migration:

1. capture current Production schema/catalog and relevant row counts;
2. prove RED/preconditions against current Production;
3. prove local GREEN, clean bootstrap, idempotence and data preservation;
4. apply only through supported Supabase migration tooling;
5. run immediate read-only Production verification and relevant live-path checks;
6. if committed DDL verification fails, stop further mutation and investigate;
7. prefer an additive forward-fix that preserves populated objects;
8. do not use destructive Production restore unless separately and explicitly authorized for an actual recovery event.

The schema reconciliation and admin-audit hardening followed this model.

## Provider backup/PITR state

A safe isolated/non-Production restore drill is authorized. However, the connected Supabase management surface used in this session does **not** expose:

- Production backup inventory;
- whether PITR is enabled for the current plan;
- exact backup frequency or retention;
- available restore points;
- independent backup copies;
- a provider operation that restores a selected Production backup into an isolated non-Production target;
- provider recovery-owner/access configuration.

Therefore these controls remain **NOT VERIFIED**. They must not be inferred from project health, schema reconstruction, or the existence of a whole-project Production restore action.

A whole-project restore against the healthy Production project would be destructive and was not invoked.

## Safe recovery testing completed without Production data

Exact-head CI run `33761020357` exercises:

- clean Supabase bootstrap exclusively from repository migrations;
- security-schema semantic verification;
- reconciliation idempotence;
- synthetic installation-row preservation;
- incompatible partial-state rejection;
- admin-audit idempotence and preservation;
- fail-closed rejection of non-empty legacy audit state.

No Production rows are copied into test/dev. These tests demonstrate migration/bootstrap recoverability and migration safety, but they are **not** evidence of restoring a real provider database backup.

## Application rollback / forward-fix decision

Use application rollback only when the defect is code-only and the previous deployment remains compatible with the current schema. Use an additive forward-fix when Production schema/data has advanced and reverse DDL could lose or invalidate data. Never deploy old application code that cannot safely understand the current schema merely to restore availability.

## Android recovery

- Permanent signing identity is the release trust anchor.
- Unsigned/debug artifacts are diagnostics and cannot be treated as public releases.
- Exact unsigned candidate is `de.donaumoschee.app` 1.0.4/code 7; Production signing has not occurred because the protected `workflow_dispatch` operation is unavailable through the connected GitHub interface.
- The protected workflow expects permanent certificate SHA-256 `E9:98:4B:DB:36:FF:2F:8F:A5:58:29:5C:5C:06:6F:BA:ED:3A:BD:BD:CC:80:1C:83:5D:AE:1B:DD:4C:D7:0E:92`.
- Google Play App Signing/upload-key recovery configuration is NOT VERIFIED through available tooling.

## Recovery evidence still required for full launch readiness

- Supabase backup/PITR capability and retention from an authoritative provider surface;
- authorized provider recovery owner(s);
- safe isolated provider restore evidence with timestamp, without copying Production data to developer machines;
- exact remediation Vercel Production deployment plus a known-good rollback reference after deployment;
- Android signing-key backup/recovery ownership and Play App Signing status if public Android publication is performed.
