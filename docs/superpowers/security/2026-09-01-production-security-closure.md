# Prayerapp Production Security Closure Addendum

**Date:** 2026-09-01
**Repository:** `ahmedmohameda7222-ship-it/Prayerapp`
**Security PR:** #104 — `Security: full application hardening`
**Security branch:** `security/full-application-hardening`

## Operational controls closed after the 2026-08-31 audit report

### Production Supabase durable rate-limit migration — PASS

The production Prayerapp Supabase project was manually updated with repo migration `20260831080500_security_rate_limits.sql` and then verified in the Supabase SQL Editor.

Observed verification evidence supplied by the repository owner:

- `public.security_rate_limits` resolves successfully;
- `service_role` has `EXECUTE` on `public.consume_security_rate_limit(text,text,integer,integer)`;
- `anon` does not have `EXECUTE` on that function;
- `authenticated` does not have `EXECUTE` on that function;
- pg_cron job `security-rate-limits-cleanup-hourly` exists with job id `3`, schedule `17 * * * *`, and `active = true`.

This closes the production deployment dependency for the durable abuse-control migration.

### GitHub `main` ruleset — PASS

Repository ruleset `Protect main` (ruleset id `22020137`) is active and targets only `refs/heads/main`.

Verified effective controls:

- branch deletion blocked;
- non-fast-forward / force pushes blocked;
- pull request required before merge;
- review-thread/conversation resolution required;
- merge method restricted to squash;
- strict status checks require the PR branch to be up to date;
- required GitHub Actions checks:
  - `verify`;
  - `Verify Android project and build unsigned candidate`;
  - `Run Android instrumentation tests (API 23)`;
  - `Run Android instrumentation tests (API 37)`;
- no bypass actors configured and the current user cannot bypass the ruleset;
- automatic Copilot code review enabled for new pushes and draft pull requests.

This closes the repository change-control blocker identified as SEC-09 in the primary audit report.

## Remaining merge gate

A genuinely independent review of the final PR head remains required. The repository owner/implementer review comments are not counted as independent approval. Copilot automatic code review is configured so the next PR-head push can supply an independent automated review; any resulting findings must be resolved before merge.

No merge or production deployment is authorized by this addendum alone.
