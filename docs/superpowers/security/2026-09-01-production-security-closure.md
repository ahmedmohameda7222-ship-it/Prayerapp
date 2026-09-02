# Prayerapp Production Security Closure Addendum

**Date:** 2026-09-02
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
- automatic Codex/Copilot code review is enabled for new pushes and draft pull requests.

This closes the repository change-control blocker identified as SEC-09 in the primary audit report.

### Atomic account push-subscription registration — PASS

An independent Codex review of PR head `0b325f94fc…` identified a P2 race in the account-associated Web Push device ceiling: concurrent requests could each observe an enabled-subscription count below the ten-device ceiling before separate upserts completed.

The issue was reproduced with a deliberately RED regression test at `75c2f4e3a14bdc717f2200500d79c6c53eb3a626`. The fix moved the account-cap decision and subscription write into a single service-role-only PostgreSQL RPC, `public.register_push_subscription(...)`, protected by transaction-scoped advisory locks for both the endpoint and authenticated account. Registration now serializes the cap check and write within one database transaction. The route no longer performs a separate application-side count followed by an upsert.

Exact implementation head `8a181fb96b82461c6a6e3a01379832c38c4efcd3` passed:

- CI #994, including `git diff --check`, clean `npm ci`, `npm audit --omit=dev`, lint, all 537 Vitest tests, clean Supabase reset, production build, and cleanup;
- a database behavior assertion that allows ten enabled account subscriptions, rejects subscription eleven, and still allows refresh of an already-enabled same-account subscription at the ceiling;
- RPC privilege assertions proving `service_role` can execute the function while `anon` and `authenticated` cannot;
- Android TWA #417 build/lint/unit verification;
- Android API 23 instrumentation;
- Android API 37 instrumentation.

Codex then re-reviewed exact head `8a181fb96b…` and reported: `Didn't find any major issues. 👍`

The previous Codex P2 review thread was resolved only after these checks passed.

### Production Supabase atomic registration RPC — PASS

Repo migration `20260901223000_atomic_push_account_registration.sql` was manually applied to the production Prayerapp Supabase project before merge.

Production SQL Editor verification supplied by the repository owner on 2026-09-02 showed:

- `to_regprocedure('public.register_push_subscription(text,text,text,uuid,uuid,text,text,text,integer)')` resolves to `register_push_subscription(text,text,text,uuid,uuid,text,text,text,integer)`;
- `service_role_can_execute = true`;
- `anon_can_execute = false`;
- `authenticated_can_execute = false`.

This closes the final production database dependency introduced by the atomic registration fix.

## Merge gate status

All previously identified pre-merge operational blockers are now closed:

- production durable rate-limit migration: PASS;
- protected `main` change-control ruleset: PASS;
- independent Codex review of the security implementation: PASS;
- Codex P2 concurrency finding: FIXED and independently re-reviewed;
- production atomic push-registration RPC migration and privilege verification: PASS.

The final remaining mechanical gate is fresh required GitHub Actions verification on the exact documentation head produced by this closure update. Merge must occur only after the required checks on that exact head are green and no new unresolved review finding exists.
