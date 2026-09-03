# Prayerapp Security Monitoring and Alerting

Date: 2026-09-03
Scope: Production web/API, Supabase, push/native delivery, Android release pipeline, and security CI.

This document defines the minimum security monitoring model for Prayerapp. It does not claim a provider alert is enabled unless configuration or an exercised delivery event has been observed. Detection queries and CI gates that have been exercised are identified separately from notification-delivery state.

## Ownership and escalation

- Primary owner: Prayerapp repository/Production maintainer.
- Security escalation: treat any credible secret/signing compromise, admin takeover, authorization bypass, destructive data event, or malicious release as P0 and follow `docs/security/incident-response.md` immediately.
- P1: repeated auth/admin/native/cron failures indicating attack or service degradation; investigate immediately and preserve logs.
- P2: isolated failures or security-tool changes without confirmed exploitation; investigate during the same maintenance window before release sign-off.
- Evidence preservation: retain relevant GitHub Actions run IDs/logs, Vercel request IDs/deployment ID, Supabase request/log IDs and timestamps, and artifact hashes. Do not place secret values in tickets or evidence files.

## Required detections

| Signal | Initial threshold / condition | Severity | Response |
| --- | --- | --- | --- |
| Supabase Auth failure/anomaly spike | >=10 failed/denied auth events from one identity/source in 10 minutes, or >=50 across the service in 10 minutes | P1 | Correlate Auth logs, rate-limit state and source; block/revoke only with evidence; invoke incident response if compromise suspected. |
| Admin authentication failures | >=5 unauthorized admin API/action attempts in 10 minutes from one source, or any successful admin action from an unexpected identity | P1 | Inspect Vercel/Supabase audit evidence and admin session; revoke session/credentials if compromise is credible. |
| Admin mutation audit failure | Any high-impact admin mutation that succeeds without its durable audit event, or any audit-write error | P0/P1 | Stop privileged changes; preserve state; repair forward before further mutations. |
| Prayer cron authorization failures | >=3 unauthorized cron requests in 10 minutes | P1 | Validate scheduler/Vault token path and source. Do not expose token values. |
| Prayer cron 5xx | >=2 in 10 minutes or a missed expected execution window | P1 | Inspect Vercel runtime plus Supabase Postgres/API logs; verify fallback delivery behavior. |
| Native-authority 4xx | >=10 failures for one installation/account in 10 minutes or an abrupt service-wide rise | P2/P1 | Check credential generation, ownership transition, expiry and client version. |
| Native-authority 5xx | Any sustained 5xx, or >=2 in 10 minutes | P1 | Verify service-role/database availability; ensure Web Push fallback remains fail-open for delivery continuity where designed. |
| Receipt/fallback anomaly | Receipt lookup/cleanup error, repeated missing receipt after grace window, or sudden fallback increase | P1 | Correlate installation generation, receipt_v2 capability and Web Push fallback. |
| Push delivery failures | >=10% failure for a batch with >=10 targets, or repeated endpoint-specific failures | P1/P2 | Classify permanent vs transient Web Push errors; disable only proven invalid subscriptions. |
| Supabase Security Advisor change | Any new WARN/ERROR or unexpected removal/change to security controls | P1 | Compare with approved residual-risk register; investigate before release. |
| Vercel runtime failures | Any new fatal/error cluster on auth/admin/cron/native routes, or >=2 5xx in 10 minutes on a protected route | P1 | Correlate deployment SHA and request IDs; roll forward/back only under approved release procedure. |
| GitHub security gate failure | Any CI, CodeQL, Gitleaks, OSV, DAST or Android required gate failure | Release blocker | Do not merge/release; diagnose root cause; re-run on the new exact head. |
| Android signing/release verification failure | Any certificate, digest, package ID, version monotonicity or signed-artifact verification mismatch | P0 / release blocker | Stop publication, quarantine artifacts, preserve hashes/logs, invoke signing-key incident procedure if integrity is uncertain. |
| Public Android download verification failure | Canonical APK metadata/digest/certificate mismatch or inaccessible release artifact | P1 / release blocker | Stop directing users to the release until artifact provenance is restored. |

## Exercised detection evidence

Evidence available during the 2026-09-02/03 remediation:

- GitHub Actions security gates execute on the remediation PR: CodeQL, Gitleaks full-history scan, OSV, SBOM generation, exact-head safe DAST and non-destructive Production DAST.
- CI fails closed when a security contract changes; the Android hardened-RC version requirement intentionally produced a RED before the versionCode increment.
- Safe Production DAST generated an unauthorized request that is visible as a `401` in Vercel runtime logs while the legitimate prayer cron continued returning `200`; this proves the runtime log signal is observable without destructive testing.
- Supabase Postgres logs show the minute scheduler execution lifecycle and are available for correlation; post-remediation samples showed normal start/completion events.
- Supabase Security Advisor is re-readable and continues to expose the explicitly accepted leaked-password-protection WARN plus intentional RLS/no-policy INFO notices for server-only tables.
- Security scanner failures have been exercised during this PR and stopped the workflow until root cause was reviewed.

## Alert-delivery verification state

The available connectors provide read/query evidence but do not expose a verified configuration showing that every threshold above has an automated paging/email destination. Therefore:

- detection/log visibility: **VERIFIED for the exercised signals listed above**;
- GitHub release/security gate enforcement: **VERIFIED through workflow results and repository ruleset evidence**;
- provider-side automated notification delivery for every Vercel/Supabase threshold: **NOT VERIFIED**;
- on-call paging/SMS delivery: **NOT VERIFIED**.

These NOT VERIFIED items must not be converted to PASS in the final checklist unless separate provider configuration/test-delivery evidence is obtained.

## Review cadence

- Before every Production release: inspect exact-head security gates, Supabase Security Advisor, Vercel runtime errors, current Production migration state and Android artifact provenance.
- After any security-sensitive migration: rerun schema verifier/advisor and review API/Postgres logs.
- After dependency-lock changes: rerun OSV, production npm audit and SBOM generation.
- Quarterly or after a security incident: review thresholds, owners, retention assumptions and escalation contacts.
