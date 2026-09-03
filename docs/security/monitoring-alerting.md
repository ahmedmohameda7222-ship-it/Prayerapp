# Prayerapp Security Monitoring and Alerting

Date: 2026-09-03
Scope: Production web/API, Supabase, push/native delivery, Android release pipeline, and security CI.

This document separates exercised detection/log evidence from automated notification delivery. A provider alert is not claimed as enabled unless its configuration or a real test delivery is observed.

## Ownership and escalation

- Primary owner: Prayerapp repository/Production maintainer.
- P0: credible secret/signing compromise, admin takeover, authorization bypass, destructive data event, malicious release, or signing-integrity mismatch. Follow `docs/security/incident-response.md` immediately.
- P1: repeated auth/admin/native/cron failures suggesting attack or material degradation; investigate immediately and preserve evidence.
- P2: isolated failures/security-tool changes without confirmed exploitation; resolve before release sign-off.
- Preserve GitHub Actions run/job IDs, deployment/request identifiers, Supabase timestamps/log identifiers and artifact hashes. Never place secret values in evidence records.

## Required detections

| Signal | Initial threshold / condition | Severity | Response |
| --- | --- | --- | --- |
| Supabase Auth failure/anomaly spike | >=10 failed/denied auth events from one identity/source in 10 minutes, or >=50 service-wide in 10 minutes | P1 | Correlate Auth logs, rate-limit state and source; revoke/block only with evidence. |
| Admin authentication failures | >=5 unauthorized admin attempts in 10 minutes from one source, or any successful admin action from an unexpected identity | P1 | Inspect runtime/audit evidence and session state. |
| Admin mutation audit failure | Any high-impact mutation succeeds without its durable audit event, or any audit-write error | P0/P1 | Stop privileged changes; preserve state; forward-fix before further mutations. |
| Prayer cron authorization failures | >=3 unauthorized cron requests in 10 minutes | P1 | Validate scheduler/token path without exposing token values. |
| Prayer cron 5xx | >=2 in 10 minutes or a missed expected execution window | P1 | Correlate Vercel runtime with Supabase Postgres/API logs and delivery fallback. |
| Native-authority 4xx | >=10 failures for one installation/account in 10 minutes or abrupt service-wide rise | P2/P1 | Check generation, ownership, expiry and client version. |
| Native-authority 5xx | sustained 5xx or >=2 in 10 minutes | P1 | Verify service-role/database availability and fallback path. |
| Receipt/fallback anomaly | cleanup/lookup errors, repeated missing receipts after grace window, or unexpected fallback increase | P1 | Correlate installation generation, receipt capability and fallback. |
| Push delivery failures | >=10% failure in a batch of >=10 targets, or repeated endpoint-specific failures | P1/P2 | Classify permanent/transient failures and disable only proven invalid endpoints. |
| Supabase Security Advisor change | any new WARN/ERROR or unexpected change/removal of security controls | P1 | Compare with `docs/security/residual-risks.md`; investigate before release. |
| Vercel runtime failures | new fatal/error cluster or >=2 protected-route 5xx in 10 minutes | P1 | Correlate deployment SHA/request IDs; recover only through approved release procedure. |
| GitHub security gate failure | any CI, CodeQL, Gitleaks, OSV, DAST or Android required gate failure | Release blocker | Do not merge/release; debug root cause and rerun exact head. |
| Android signing/release verification failure | any certificate/digest/package/version/provenance mismatch | P0 / release blocker | Stop publication, quarantine artifacts and preserve signer evidence. |
| Public Android artifact verification failure | canonical APK metadata/digest/certificate mismatch or inaccessible release | P1 / release blocker | Stop directing users to that release. |

## Exercised detection and security-gate evidence

### Exact implementation head `753b539675639ef46522964840382329404f30b9`

- CI run `33761020357`: SUCCESS; 125 files / 561 tests; clean Supabase bootstrap; schema and migration safety proofs; production build.
- Security Scanners run `33761020425`: SUCCESS; CodeQL, Gitleaks, OSV, SBOM, safe exact-head DAST, safe deployed-Production DAST and authenticated local DAST.
- Authenticated DAST job `100667064180`: real local Supabase Auth/JWT flow verified normal-user admin denial, BOLA/account isolation, cross-origin denial, session revocation/account deletion and durable rate limiting.
- Android run `33761020400`: SUCCESS for exact-head unsigned build plus API 23/37 instrumentation. Protected signing remains unexecuted because workflow dispatch is unavailable through the connected GitHub surface.

### Production/provider visibility

- Safe Production DAST has generated non-destructive unauthorized requests visible in Vercel runtime evidence while legitimate prayer cron requests continue to execute.
- Supabase API/Postgres logs are queryable for cron/native/schema events and were used to verify the schema-reconciliation transition.
- Supabase Security Advisor is re-readable and continues to show the explicitly accepted leaked-password-protection WARN plus intentional server-only RLS/no-policy INFO notices.
- Security-scanner failures were deliberately preserved during RED→GREEN work and prevented a false GREEN result until root cause was corrected.
- Current old Production deployment has had `DEP0169 url.parse()` warnings observed on `/api/cron/prayer-reminders`; this remains a post-deployment retest item, not a closed signal.

## Alert-delivery verification state

The connected provider surfaces allow log/advisor/query inspection but do not expose authoritative paging/email/on-call configuration or a safe provider test-delivery primitive for all thresholds above.

Therefore:

- GitHub CI/security gate enforcement: **VERIFIED**.
- GitHub/Vercel/Supabase detection/log visibility for exercised signals: **VERIFIED**.
- Authenticated authorization/rate-limit detection behavior in isolated local runtime: **VERIFIED**.
- provider-side automated notification delivery for all Vercel/Supabase thresholds: **NOT VERIFIED**.
- on-call paging/SMS delivery: **NOT VERIFIED**.

The user authorized safe non-destructive test events where supported; no connector exposed a provider alert-delivery test that would prove those remaining controls. They remain evidence gaps rather than assumed failures or passes.

## Review cadence

- Before every Production release: inspect exact-head CI/security gates, Supabase Security Advisor, current migration history, Vercel runtime errors and Android artifact provenance.
- Immediately after exact remediation web deployment: verify deployed Git SHA, CSP nonce/header behavior, protected/public/API boundaries, cron/native paths and Vercel/Supabase logs; specifically retest PA-SEC-007.
- After a security-sensitive migration: rerun semantic schema verifier/advisors and review API/Postgres logs.
- After dependency-lock changes: rerun OSV, production npm audit and SBOM.
- Quarterly or after an incident: review thresholds, owners, retention assumptions and alert-delivery destinations.
