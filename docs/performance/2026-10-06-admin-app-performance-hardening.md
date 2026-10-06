# Admin/App Performance and Security Hardening Evidence

Date: 2026-10-06

Repository: `ahmedmohameda7222-ship-it/Prayerapp`

Production comparison base: `abf76039c6baa53297775de31cdd44f85ac13f87`

Working branch: `perf/admin-app-performance-hardening`

Draft PR: #111

## Scope

This change set hardens the existing application without changing the intended public product behavior. The targets are repeated admin authentication work, broad admin-dashboard and Prayer Times reads, unnecessary public-only runtime work under `/admin`, dependency vulnerabilities, and actionable Supabase advisor findings.

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

## Prayer Times admin data window

### Production-base behavior

`/admin/prayer-times` loaded the complete `prayer_times` table with `getPrayerTimes(true)` on initial render and after every create/update/delete/publish mutation. The response therefore grew with the complete historical prayer schedule.

### Hardened behavior

The admin management surface now loads one fixed 120-day window at a time. The initial operational window begins 30 days before the applied mosque runtime date and extends 89 days after it. Previous and Next move by exactly 120 days, so the windows tile the full historical/future date domain without gaps; Current returns to the applied-runtime-date window.

Every initial, navigation, and post-mutation admin read supplies both `startDate` and `endDate`. The data helper adds a `PrayerTimesQueryOptions` object API while preserving its legacy positional arguments for existing callers. Public prayer behavior and Prayer Engine calculation semantics are unchanged.

The next-week publication warning is evaluated only while the current operational window is displayed, preventing historical navigation from producing a false readiness warning.

## Runtime isolation

The production-base root layout imported and mounted the complete public runtime stack for every route, including `/admin`: public navigation, launch/platform chrome, native Android/update bridges, Adhan audio runtime, push/AppPreferences synchronization, service-worker registration, notification opt-in, and pull-to-refresh.

The hardened root keeps only the shared `I18nProvider` and `AuthProvider` at the global boundary. `RouteRuntimeBoundary` checks the active pathname and does not render the public runtime for `/admin`. Non-admin routes dynamically load `PublicRuntimeProviders`, which preserves the original public provider ordering, including `AppPreferencesProvider -> NativeAndroidProvider -> AndroidUpdateProvider -> AdhanAudioProvider -> TimeFormatProvider`.

Public authentication intentionally remains global because admin authorization reuses the same browser session and account behavior requires the public auth authority. The public-only side-effect/runtime providers are what moved out of the admin path.

Route-level bundle reduction is certified separately from the source-shape change; no byte-reduction claim is made until the base-vs-head build-artifact measurement is recorded.

## Admin navigation

The existing `/admin/prayer-engine` route is now exposed directly in the admin sidebar. The new Prayer Engine navigation label and Prayer Times window controls are localized for Arabic, English, German, and Turkish through the same translation-override mechanism already used for brand/prayer names.

## Root request micro-optimization

`generateMetadata()` and `RootLayout()` both require the request locale. The locale resolver is now wrapped with React `cache()`, so repeated locale resolution in one render request shares the same request-scoped result instead of independently reading request cookies/headers twice. Locale precedence and fallback behavior are unchanged.

## `url.parse()` deprecation ownership

The Node `[DEP0169] url.parse()` warning was traced rather than rewritten blindly.

Observed CI evidence shows the warning during the pinned `actions/setup-node` cache-restore phase, before Prayerapp dependency installation or application tests. The application dependency graph also contains `web-push` `3.6.7`; its upstream `src/web-push-lib.js` uses Node's legacy `url.parse()` API for push endpoint/audience parsing. `3.6.7` is the current published `web-push` release found during this review, so there is no compatible package upgrade that removes that call today.

The warning is therefore treated as dependency-owned/tooling-owned. Prayer delivery behavior is not rewritten solely to suppress the warning. Future remediation should prefer an upstream `web-push` release that replaces legacy URL parsing, then rerun the existing push/security regressions.

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

### Accepted/deferred Free-plan Auth control

Supabase still reports **Leaked Password Protection Disabled**. The project owner explicitly accepted/deferred this control because the project is currently on the Supabase Free plan; Supabase documents leaked-password protection as a Pro-plan-and-above feature. It is not a blocker for this branch and is not represented as fixed.

## TDD evidence for remaining scope

Commit `483b2c7f0fbd54f352b676b281a0f1cc8ee6a41d` introduced five executable contracts for the remaining performance-hardening scope. CI #2033 passed install, production audit, and lint, then failed exactly at `npm test` with all five new assertions RED while 958 existing tests passed. The failures covered bounded Prayer Times reads, admin runtime isolation, Prayer Engine navigation/localization, request-locale memoization, and `url.parse()` ownership documentation.

This provides a controlled RED baseline before the implementation changes above.

## Earlier verification evidence

On implementation HEAD `b8386cab827992026571d968db9a42eb53afffb1` before the later remaining-scope changes:

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

A later exact candidate `70ba3d282e9f19b4a04abee7a7d6706397bc60ee` completed CI #2032, Security Scanners #957, Masjid Display Verification #692, and Android TWA #1355 successfully before the remaining-scope TDD work began.

## Final certification rule

The PR remains Draft. Final certification requires fresh CI, Security Scanners, Masjid Display Verification, and Android TWA results for the exact final branch HEAD after the remaining implementation, bundle measurement, and documentation changes are committed, followed by an independent review of the final diff. No merge should occur while any required exact-HEAD gate is failing or pending.
