# Admin/App Performance and Security Hardening Evidence

Date: 2026-10-06

Repository: `ahmedmohameda7222-ship-it/Prayerapp`

Production comparison base: `abf76039c6baa53297775de31cdd44f85ac13f87`

Working branch: `perf/admin-app-performance-hardening`

Draft PR: #111

## Scope

This change set hardens the existing application without changing the intended public product behavior. The primary targets are repeated admin authentication work, broad admin-dashboard reads, dependency vulnerabilities, and actionable Supabase advisor findings.

## Admin authentication amplification

### Production-base behavior

At the production comparison base, every `useAdminAuth()` consumer owned an independent bootstrap effect. Each instance obtained the browser session and invoked `verifyAdminAction()` independently.

Passive `verifyAdminAction()` then:

1. called `getAllowedAdminEmail(token)`, which authenticated the bearer token through `auth.getUser(token)`;
2. created another server client and called `auth.getUser(token)` again;
3. upserted `admin_users`, even though the operation was only verifying an already-established session.

This meant a single admin render with multiple consumers could multiply session/bootstrap work, server auth lookups, and profile writes.

### Hardened behavior

`app/admin/layout.tsx` now owns one `AdminAuthProvider` for the complete admin subtree. Consumers read the shared context instead of bootstrapping independently.

For a stable access token:

- bootstrap reuses the public-auth session already present in the application;
- only one in-flight admin verification promise is allowed for that token, including React effect replay;
- passive server verification authenticates the bearer token once;
- passive verification does not write `admin_users`;
- `admin_users` profile establishment is reserved for successful explicit admin sign-in.

Executable regressions cover both the multi-consumer single-verification contract and the passive-verification no-write contract.

## Admin dashboard data path

### Production-base behavior

The production-base dashboard first loaded the runtime date, then launched four browser-side admin data reads in parallel:

- all prayer-time rows with `select("*")` and no date bound;
- all Jumu'ah rows with `select("*")`;
- all donation-campaign rows with `select("*")`;
- all announcement rows with `select("*")`.

The browser downloaded complete records and computed four summary cards locally. Query cost and response payload therefore grew with the historical size of those tables even though the UI only needed booleans and counts.

### Hardened behavior

The browser now invokes one server action, `loadAdminDashboardSummaryAction()`. The action authorizes once, resolves the same applied prayer timezone authority used by the previous runtime-date action, and executes only the narrow summary reads required by the UI:

- prayer coverage: `date,published`, bounded from today through today + 7 days;
- upcoming published Jumu'ah: `id`, future-bound, `limit(1)`;
- active campaign count: exact HEAD count;
- featured campaign count: exact HEAD count;
- published announcement count: exact HEAD count;
- urgent announcement count: exact HEAD count.

The four broad browser data transfers are removed. This is intentionally described as a payload/client-round-trip and data-bounding improvement, not as a claim that the database executes fewer SQL statements.

The dashboard contract test asserts one authorization, six bounded/narrow summary queries, no `select("*")`, the one-week prayer window, the Jumu'ah row limit, and HEAD count semantics.

## Runtime isolation decision

Admin-specific authorization remains isolated under `app/admin/layout.tsx`.

The root `AuthProvider` remains global deliberately. `AppPreferencesProvider` consumes the public session to attach or re-sync push subscriptions, and account routes consume the same public-auth context. Moving public authentication under `/admin` or `/account` would change notification/account behavior and was therefore rejected as an unsafe bundle-only optimization.

## Dependency remediation

Root dependencies were remediated without widening the application architecture:

- `next`: `16.3.6`
- `eslint-config-next`: `16.3.6`

The generated root lockfile is committed. The production dependency audit now reports zero vulnerabilities, and the repository OSV workflow has passed on the hardened branch during implementation verification.

The Masjid Display dependency remediation in this PR also retains the reviewed vendored `braces` patch artifact and lockfile changes required by the security scan.

## Supabase advisor remediation

Prayerapp Supabase project: `dbqbzvkleqzbgufllgca`.

The actionable missing foreign-key index finding for `native_prayer_delivery_receipts.user_id` was fixed with migration:

`20261005232738_add_native_receipts_user_index.sql`

The migration was applied immediately to the live project and then recorded in the repository using the exact remote migration version. Post-apply verification confirmed `native_prayer_delivery_receipts_user_id_idx` exists, and the unindexed-foreign-key advisor finding disappeared.

The new index may appear as "unused" immediately after creation; that is expected before production workload exercises it and is not evidence that the index should be removed.

### Advisor findings intentionally not rewritten blindly

- RLS init-plan warnings: the inspected live policies already use scalar `SELECT` wrappers around `auth.uid()` / `auth.jwt()`. Rewriting equivalent expressions would add churn without a proven semantic/performance change.
- Multiple permissive-policy warnings: policy consolidation can change authorization semantics and requires a separate authorization-design review.
- Existing unused-index notices: indexes are not removed solely from the advisor snapshot without workload evidence.
- RLS-enabled/no-policy INFO findings on server-controlled/internal tables are retained as deny-by-default boundaries.

### Remaining manual security control

Supabase still reports **Leaked Password Protection Disabled**. The connected project actions used for this work do not expose the Auth configuration mutation needed to enable that control. It remains an explicit manual/open control rather than being represented as fixed.

Reference: Supabase Auth password security / leaked-password protection documentation.

## Verification evidence during implementation

On implementation HEAD `b8386cab827992026571d968db9a42eb53afffb1` before this evidence document was added:

- `npm ci`: passed, zero vulnerabilities reported;
- `npm audit --omit=dev`: passed, zero vulnerabilities;
- ESLint: passed with no errors (pre-existing warnings remain);
- admin shared-auth regression: passed;
- admin passive-verification server-action regressions: passed;
- bounded dashboard-summary regression: passed;
- Supabase database-advisor hardening regression: passed;
- CodeQL JavaScript/TypeScript: passed;
- OSV dependency scan: passed;
- Gitleaks full-history scan: passed;
- exact-head build/runtime DAST security job: passed;
- deployed-production safe DAST job: passed;
- SBOM evidence generation: passed.

That run exposed one stale Plan 6 source-shape regression which expected the dashboard page itself to call `loadAdminRuntimeDateAction`. The dashboard now obtains the same applied runtime timezone through the bounded server summary action, so the regression was updated to verify the new authority boundary instead of restoring the old dashboard data path.

## Final certification rule

The PR remains Draft. The evidence above does not authorize merge by itself. Final certification requires fresh CI and security results for the exact final branch HEAD after this document and all implementation/test changes are committed, followed by an independent review of the final diff. No merge should occur while any required exact-HEAD gate is failing or pending.
