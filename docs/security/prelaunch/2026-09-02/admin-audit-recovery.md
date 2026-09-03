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

## Application-code consistency model

The server audit helper records an append-only `attempt` before every privileged mutation. If authorization or the durable attempt append is unavailable before the mutation, the action fails closed and the mutation is not executed. No unaudited authorization path is introduced.

The privileged mutation and the terminal audit outcome are separate commits in the current architecture. Once the privileged mutation has committed, that mutation result is authoritative. If the terminal `success` or `failure` audit append then fails, the helper must not rewrite a committed success into `success: false`, because doing so invites an operator or caller to retry an operation that already succeeded and can duplicate content, updates, or notification side effects.

Instead, the durable `attempt` remains as evidence and the action returns the truthful mutation result together with `auditIncomplete: true` and the bounded warning `admin.errors.auditIncomplete`. The helper also emits a server-side error containing only bounded correlation identifiers (`action`, `entityType`, `entityId`, `requestId`) plus whether the mutation succeeded. Monitoring can therefore detect an attempt that lacks its terminal outcome and reconcile it without asking the user to repeat the mutation.

This is an explicit best-effort consistency model, not mutation+audit transactional atomicity. A future architecture may move both writes into one database transaction, but the current remediation deliberately avoids an unrelated large refactor while preserving authorization, durable attempt evidence, truthful mutation semantics, and operational detectability.

No authorization decision is delegated to an audit record. Admin authorization is independently verified against the authenticated Supabase user and the server-side admin allowlist.

## Historical migration metadata

This migration does not repair or mark applied any older absent Production migration versions. Historical migration metadata repair remains separately gated.
