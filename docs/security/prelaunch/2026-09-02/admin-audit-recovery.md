# Admin audit hardening recovery / forward-fix plan

Date: 2026-09-02
Scope: `admin_audit_hardening` remediation migration and server-side privileged mutation audit hooks.

## Intended change

The remediation makes the existing `public.audit_logs` table a server-only append target. It adds truthful actor identity, outcome, bounded metadata, and request-correlation fields; removes direct application-role writes; grants `service_role` read-only table access; and exposes one narrowly scoped `SECURITY DEFINER` append function with a fixed `search_path`.

The migration is deliberately fail-closed when existing rows would require fabricated historical actor/outcome values. The verified Production precondition before application must therefore confirm that `public.audit_logs` is still empty and that the existing baseline has not materially drifted.

## Before Production application

1. Require exact-head CI GREEN, including full tests, lint, production dependency audit, clean Supabase bootstrap, schema verifier, and production build.
2. Re-read Production immediately before mutation:
   - `audit_logs` exists;
   - row count is still `0`;
   - expected legacy columns/types are present;
   - RLS/grants have not materially changed;
   - no pre-existing incompatible new audit columns or function exist.
3. Confirm migration source contains no UPDATE/DELETE/TRUNCATE of existing audit rows or unrelated data.
4. Confirm direct writes remain unavailable to `anon`/`authenticated`, and the new RPC is executable only by `service_role`.

## Transactional failure

Supabase migration application is transactional. If any fail-closed precondition or DDL assertion fails, treat the migration as not applied, re-read the live catalog, and do not modify migration history manually. Resolve drift with a newly reviewed forward migration if required.

## Successful application followed by verification failure

Do not destructively drop the audit table or erase audit records merely to return to the old state. A successful Production commit may immediately receive legitimate audit events. If post-apply verification exposes a defect:

1. disable/defer the affected privileged deployment path if necessary rather than deleting evidence;
2. preserve existing audit records;
3. diagnose the exact schema/privilege/function mismatch;
4. add a RED regression and a new additive/forward-fix migration;
5. verify locally and apply the reviewed forward fix;
6. re-run the Production verifier and runtime/log checks.

## Application-code recovery

The server audit helper records an append-only `attempt` before the privileged mutation. If audit persistence is unavailable before a mutation, the privileged action fails closed and the mutation is not executed. If outcome recording fails after a completed mutation, the durable attempt remains as evidence and the action surfaces audit unavailability for investigation rather than fabricating a success record.

No authorization decision is delegated to an audit record. Admin authorization is independently verified against the authenticated Supabase user and the server-side admin allowlist.

## Historical migration metadata

This migration does not repair or mark applied any older absent Production migration versions. Historical migration metadata repair remains separately gated.
