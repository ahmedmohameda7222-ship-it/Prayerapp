# Supabase reconciliation recovery — 2026-09-02

## Scope

This recovery note applies only to `20260902170000_prelaunch_schema_reconciliation.sql`.
The migration reconciles the native-delivery-v2 schema that is absent from the reviewed Production state. It does not replay or mark as applied the three later repository migrations whose semantic state is already present.

## Safety properties before application

- The migration is additive and idempotent.
- It must fail before reconciliation DDL if a pre-existing `receipt_v2` CHECK is present or if an `account_generation` CHECK differs from the repository-authority `account_generation >= 0` semantic constraint.
- It does not drop unknown Production constraints.
- It does not modify, delete, or truncate existing native installation rows.
- The receipt table is server-only: RLS is enabled, `anon` and `authenticated` have no direct table access, and `service_role` has the required table privileges.
- CI exercises clean bootstrap, repeated execution, synthetic row preservation, incompatible partial-schema rejection, and the same read-only verifier used for Production.

## Failure before commit

Supabase migrations execute transactionally. If the reconciliation migration raises during its preconditions or DDL, treat the migration as unapplied and preserve the failure output as evidence. Do not repair migration metadata and do not weaken or remove an unknown constraint to force convergence.

Re-read the Production catalog and compare the failed precondition with repository authority before proposing a new change.

## Failure after successful application

Once Production has committed the additive schema, do not destructively remove `receipt_v2`, `account_generation`, or `native_prayer_delivery_receipts` merely to return to the earlier shape. Application code may already depend on the new contract.

Use a forward-fix migration for any confirmed defect. A forward fix must receive the same RED, local bootstrap, preservation, least-privilege, and exact-Production review applied to this reconciliation.

Application rollback, if needed for an unrelated deployment issue, must not imply destructive database rollback.

## Required evidence around Production application

Immediately before application:

1. re-read Production migration history and native-delivery schema;
2. confirm the reviewed drift is unchanged;
3. run/read the Production schema verifier and preserve the expected native-delivery RED;
4. compare the exact migration bytes being applied with the reviewed repository file.

Immediately after application:

1. run `scripts/security/verify-production-schema.sql` read-only;
2. inspect receipt-table columns, defaults, constraints, indexes, RLS, and grants;
3. verify native-authority API behavior;
4. inspect relevant Supabase/Vercel logs for the known native receipt `404` and installation-column `400` failure pattern;
5. record exact Production migration history and schema state.

Migration-history repair remains a separately gated action even if semantic convergence succeeds.
