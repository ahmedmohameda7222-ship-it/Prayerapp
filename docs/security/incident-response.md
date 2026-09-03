# Prayerapp Security Incident Response Runbook

Last reviewed: 2026-09-03
Scope: Prayerapp Web/PWA, Vercel runtime, Supabase/PostgreSQL/Auth, Web Push, Android TWA/native authority, GitHub CI/CD and Android signing/release.

## Roles and decision authority

- **Incident commander:** coordinates severity, containment, evidence preservation, communications, and closure.
- **Application/security owner:** owns web/API containment, dependency and deployment response, and security regression verification.
- **Database/Auth owner:** owns Supabase containment, privilege/schema verification, database evidence, and recovery.
- **Release owner:** owns GitHub/Vercel/Android release rollback, artifact provenance, and signing-key response.
- **Communications owner:** decides user/regulatory notifications with the incident commander after scope is established.

Production-secret rotation, destructive database restore, Android signing/publication, GitHub protection mutation, and other protected operations remain subject to their explicit operational authorization gates.

## Severity and first actions

1. Preserve timestamps, request IDs, deployment IDs, commit SHAs, migration versions, affected account/device IDs, and relevant provider logs before cleanup where safe.
2. Do not copy raw Production secrets or unnecessary personal data into tickets, chat, or evidence documents.
3. Determine whether the event is active, whether privileged credentials/signing identity are exposed, and whether integrity or confidentiality is still at risk.
4. For an active high-impact compromise, prefer fail-closed containment over continued availability when a trust boundary cannot be trusted.
5. Create an incident timeline. Record every remote mutation and the person/role authorizing it.

## Credential or repository secret leak

- Identify the secret class without reproducing its value: Supabase service role/database credential, VAPID private key, cron secret, provider API key, GitHub/Vercel credential, Android signing secret, or other credential.
- Use repository/history scanning to determine exposure interval and affected refs.
- If the material can authorize Production access, treat it as compromised even when current exploitation is not visible.
- Rotate/revoke through the owning provider after authorization; update only the minimum required deployments/workflows.
- Re-run Gitleaks/CodeQL/SCA and verify that replacement material is not committed or logged.
- Inspect provider logs for use during the exposure window.

## Compromised admin account/session

- Revoke affected Supabase sessions/credentials through the provider after authorization.
- Inspect durable `admin_audit_logs` and application/provider logs for privileged mutations and correlate actor user ID, action, entity, target, request metadata, and timestamps.
- Verify current admin allowlist/configuration and all modified records.
- Do not delete audit evidence during containment.
- If attribution is uncertain, treat all privileged mutations in the affected interval as requiring integrity review.

## Compromised Supabase service-role or database credential

- Treat as a potential database-wide confidentiality/integrity incident.
- Rotate/revoke the credential after authorization and redeploy dependent server functions.
- Review Postgres/API/Auth logs, role grants, RLS state, function ownership/search_path/EXECUTE privileges, cron jobs, and migration history.
- Run `scripts/security/verify-production-schema.sql` and compare the complete Production migration list to the repository equivalence ledger.
- Preserve suspicious SQL/request evidence before any repair.

## Dependency or CI supply-chain compromise

- Freeze release activity.
- Identify exact affected package/action version and first/last commit containing it.
- Pin or remove the dependency/action; do not suppress scanner output as remediation.
- Re-run npm production audit, OSV, CodeQL, full-history secret scan, SBOM generation, CI tests/builds, and Android dependency/build gates.
- If an artifact was generated while the build chain was untrusted, discard it and rebuild from an independently verified commit.

## Malicious or incorrect Vercel deployment

- Record deployment ID, Git SHA, aliases, runtime error/warning evidence, and the immediately previous known-good deployment.
- Remove/rollback the bad deployment through the approved Vercel release procedure.
- Verify the restored deployment SHA and run safe health/security-header/admin/cron/native-backend smoke tests.
- If database migrations accompanied the deployment, do not automatically roll back populated schema; use the documented forward-fix/recovery process.

## Web Push / VAPID compromise or abuse

- Rotate affected private push material after authorization.
- Review push-subscription and delivery logs for abuse, endpoint fan-out, repeated failures, and unexpected account association.
- Verify `security_rate_limits`, trusted push endpoint allowlisting, account subscription caps, and native receipt/generation isolation before resuming delivery.

## Android signing key compromise

- Stop Android signing and publication immediately.
- Record current permanent certificate SHA-256 and whether compromise concerns the app-signing key, upload key, keystore copy, password, or runner environment.
- Preserve signing workflow and environment audit evidence.
- Follow Google Play/upload-key recovery or app-signing-key process as applicable; do not replace Digital Asset Links fingerprints until the authoritative signing identity is established.
- A modified APK must never be treated as trusted merely because its package ID matches.

## Native authority / Android credential incident

- Server authority is the trust boundary; local compromise must not grant another account or installation authority.
- Revoke/rotate affected installation authority and verify `account_generation`, authority ID, credential hash, receipt-v2 state, lease expiry, and tombstone/revocation behavior.
- Confirm raw native installation credentials were not exposed to web JavaScript or logs.
- Verify encrypted-at-rest Android credential storage and account-reset generation isolation before restoring native delivery.

## Database breach or suspicious access

- Preserve Postgres/API/Auth logs and current catalog state.
- Identify touched tables/functions and affected users/time window.
- Verify RLS, grants, policies, SECURITY DEFINER ownership/search_path and EXECUTE rights before data correction.
- Never copy Production rows to developer machines for investigation.
- Prefer additive/forward repair for populated schema. Destructive restore requires separate authorization.

## Recovery verification

After containment, require all affected gates to be GREEN at an exact commit:

- binding authority hashes and deterministic control ledger;
- tests, lint, production build;
- npm production audit + OSV + CodeQL + full-history secret scan + SBOM;
- clean Supabase bootstrap and migration idempotence/fail-closed/data-preservation checks;
- Production schema verifier and security advisors;
- Android unit/lint/build/instrumentation and artifact inspection when Android is in scope;
- safe DAST/runtime smoke for affected web/API paths.

## Evidence preservation

Keep immutable references to Git SHAs, PR/review IDs, workflow run/job IDs, deployment IDs, migration versions, artifact SHA-256 values, provider timestamps, and redacted log excerpts. Never put raw access tokens, passwords, signing secrets, push private keys, or service-role credentials in the incident record.

## Closure

An incident closes only when containment is confirmed, root cause is established, affected credentials/trust relationships are safe, integrity is verified, required users/stakeholders are informed, regression controls exist, and residual risk has an owner and review date.
