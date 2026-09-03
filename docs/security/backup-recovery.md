# Prayerapp Backup, Restore and Recovery Security Record

Last reviewed: 2026-09-03

## Recovery objectives

Prayerapp recovery prioritizes preservation of user data and audit evidence over destructive rollback. Schema changes are migration-controlled, runtime deployments are commit-addressable, and populated Production objects must not be dropped automatically to reverse a failed security remediation.

## Verified recovery mechanisms

### Repository and deployment

- GitHub preserves the source and reviewed commit history used for release provenance.
- Vercel deployments are immutable deployment records tied to Git commits; the current known Production deployment and prior READY deployments are identifiable for rollback investigation.
- A rollback does not implicitly reverse database migrations. Application rollback and database recovery are separate decisions.

### Database schema

- Repository Supabase migrations define the reproducible schema path.
- CI performs a clean local Supabase bootstrap from migrations.
- Security reconciliation migrations have dedicated idempotence, incompatible-state/fail-closed, and data-preservation proofs.
- `scripts/security/verify-production-schema.sql` independently checks security-critical Production semantics.
- Migration-history metadata repair is not a recovery shortcut and remains separately authorized because marking a partial historical state as applied can create false provenance.

### Production security remediation recovery

For an ordinary security migration:

1. capture current Production schema/catalog and relevant row counts;
2. prove RED/preconditions against the current Production state;
3. prove local GREEN, clean bootstrap, idempotence and data preservation;
4. apply only through Supabase migration tooling;
5. run immediate read-only Production verification and relevant live-path checks;
6. if verification fails after committed DDL, stop further mutation and investigate;
7. prefer an additive forward-fix that preserves populated objects;
8. destructive rollback/restore requires separate authorization.

The Wave 1 schema reconciliation and admin-audit migrations followed this model.

## Data-backup provider state

The available Supabase connector in this security session exposes database queries, migrations, logs and advisors but does **not** expose the project's backup/PITR configuration, retention window, restore points or backup download controls. Therefore the following are **NOT VERIFIED**, not assumed:

- whether automated database backups/PITR are enabled for the current Supabase plan;
- exact backup frequency and retention;
- who can initiate a provider restore;
- whether an independent backup copy exists;
- the latest successful data-restore timestamp.

These provider settings must be confirmed in the authorized Supabase management surface before they can be marked PASS in the 990-control audit.

## Safe restore testing completed without Production data

- CI rebuilds a clean local Supabase database exclusively from repository migrations; no Production rows are copied into test/dev.
- Migration-specific synthetic fixtures verify preservation and rollback behavior inside isolated local transactions.
- This demonstrates schema/bootstrap recoverability and migration safety, but it is not evidence of a Production data-backup restore.

A destructive Production restore drill has not been run and is separately gated. If a provider-created non-Production restoration environment is later authorized, it should use provider-managed backup restoration rather than exporting Production rows to developer machines.

## Application rollback / forward-fix decision

Use application rollback when the defect is code-only and the previous deployment remains compatible with current schema. Use a forward-fix when Production schema/data has advanced and reverse DDL could lose or invalidate data. Never deploy old application code that cannot safely understand the current schema merely to restore availability.

## Android recovery

- Permanent signing identity is the release trust anchor.
- Unsigned/debug artifacts are diagnostics only and are not Production releases.
- A hardened candidate must use a fresh versionCode before signing/publication.
- Key loss/compromise recovery depends on whether Google Play App Signing/upload-key management is in use; current Play-provider recovery configuration is NOT VERIFIED through available tooling.

## Recovery evidence required at launch

Before a full GO can claim backup/restore readiness, record:

- Supabase backup/PITR capability and retention from the provider;
- authorized recovery owner(s);
- a safe restore test or provider restore evidence with timestamp, without copying Production data to local development;
- Git/Vercel rollback procedure and known-good deployment reference;
- migration recovery/forward-fix procedure;
- Android signing-key backup/recovery ownership and Play App Signing status, if Android publication is in scope.
