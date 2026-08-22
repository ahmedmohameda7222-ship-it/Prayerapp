# Danube Mosque Technical Launch-Readiness Plan

> Status: approved for autonomous execution. Do not merge, deploy a public launch, move/reuse a published Android tag, or publish a new public Android release without explicit user approval.

## Readiness model

Report two independent outcomes:

1. **Technical platform readiness** — code, CI, database schema/scheduler, Android lifecycle, update distribution, security, admin/data-entry paths, and operations are ready for verified content and physical-device validation.
2. **Production content readiness** — verified mosque prayer/Jumuah/Ramadan/contact/payment/legal content is present, public mock content is absent, and the physical-device launch checklist is complete.

Missing verified real-world content is `CONTENT INPUT PENDING`; it does not block technical implementation.

## Baseline evidence

- Repository starting `main`: `27c420694ab0e5f18b439aa9b6b2dca23140eb7c`.
- Draft PR #49 starting head: `e3da26e85715f789c33cd265f6c0069c41ec3469`.
- Vercel production currently serves `main` at `27c420694ab0e5f18b439aa9b6b2dca23140eb7c`.
- Production Supabase project: `dbqbzvkleqzbgufllgca`, PostgreSQL 17, healthy.
- Published Android release `android-v1.0.0` targets `main` and contains APK/AAB assets.
- Independently downloaded APK is `de.donaumoschee.app`, versionCode `3`, versionName `1.0.0`, target/compile SDK 36, and verifies under APK Signature Schemes v1/v2 with certificate `E9:98:4B:DB:36:FF:2F:8F:A5:58:29:5C:5C:06:6F:BA:ED:3A:BD:BD:CC:80:1C:83:5D:AE:1B:DD:4C:D7:0E:92`.

## Findings matrix

| Priority | Finding | Evidence / impact | Root cause | Planned fix | Verification | Human input |
| --- | --- | --- | --- | --- | --- | --- |
| P0 | Production prayer cron calls retired `masjidelrahman.vercel.app` and returns HTTP 404 every minute. | `cron.job` is active and Vault-backed; latest 360 `net._http_response` rows in 24h are 404. Prayer Web Push is unavailable. | Scheduler target is manually/statically tied to retired origin; cron SQL success does not inspect HTTP outcome. | Migration-manage canonical origin, preserve Vault token and schedule, add reproducible health audit, verify actual pg_net JSON/HTTP 200. | Migration parity plus recent pg_net 200 response containing healthy JSON. | No. |
| P0 | Public QA prayer/Jumuah/Ramadan data can trigger real notification paths. | 17 published prayer rows are `SUPABASE_QA_MOCK` or `HOME_UI_V2_PREVIEW`; six Jumuah and three Ramadan rows have QA markers. | Preview/QA data was published in production and cron intentionally accepts all published rows. | Add validator, unpublish only deterministic QA markers, and make cron fail closed for marked schedules while real content remains fail-open through normal delivery. | Database counts, validator tests/command, cron tests, production query. | Verified replacement content remains pending. |
| P1 | PR #49 normal CI fails React Compiler memoization lint. | Exact-head CI fails `react-hooks/preserve-manual-memoization` in `NativeAndroidProvider`. | Callback reads broader `session` object than dependency list represents. | Extract stable primitive session values and align callback/effect dependencies without disabling lint. | Exact lint/test/build and CI. | No. |
| P1 | Old native authority generation can race with re-enrollment. | `authority_id` column exists only in the pending PR migration; heartbeat reads/mutates by `installation_id` alone. | Credential validation and mutation are separate and not scoped to a per-enrollment generation. | Return/store `authorityId`; require it on heartbeat/delete; atomically scope every mutation to `installation_id + authority_id + credential_hash`; rotate generation on enrollment. | Behavioral route tests, contract tests, migration tests, exact-head review. | No. |
| P1 | Current production dependency tree has unmitigated HIGH findings. | `npm audit` reports Next 16.2.9 plus PostCSS, sharp, undici, brace-expansion, js-yaml, and nanoid findings. Stable Next 16.3.2 was published 2026-08-21 and is the current npm stable. | Main predates patched stable dependency graph; existing security branch stops at 16.3.0. | Reuse the branch intent but upgrade to stable 16.3.2, refresh lockfile without force, triage prod/dev audit separately. | `npm ci`, both audits, lint, tests, build, official release/advisory evidence. | No, unless a current official critical advisory remains unpatched. |
| P1 | Direct APK release metadata/update UX is incomplete. | `/download/android` sorts by publication time; `/api/android/release` is 404; native status lacks installed package version; no global update UI. | Existing workflow produces signed RC artifacts but no validated machine-readable stable release metadata. | One deterministic resolver for release API/download; signed-workflow metadata; strict version/certificate/SHA validation; native version bridge; global native-only update provider/settings UI; optional/required states. | Unit/route/contract/Android tests, CI artifact inspection, old-to-new device test pending. | Final stable publication and device update require explicit approval/test. |
| P1 | Supabase leaked-password protection is disabled. | Security advisor WARN. | Production Auth setting is off. | Document/enable through safe supported control if available; otherwise exact dashboard gate. | Re-run advisor. | Dashboard access may be required. |
| P1 | Legal launch surfaces/copy are incomplete. | No `/privacy` or `/imprint`; README incorrectly claims privacy exists. App stores account/device/push preference data. | Legal page was removed and verified legal copy/provider details were not supplied. | Add technical legal navigation/surfaces that consume explicit content configuration; correct docs; do not invent legal copy. | Route/build/navigation tests. | `CONTENT INPUT PENDING` and legal review. |
| P1 | User-facing legacy branding remains in localized install/notification copy. | Runtime messages still say “Masjid El-Rahman”; README is stale. | Central branding migration did not cover all translations/docs. | Replace public runtime strings with approved localized names while preserving legacy storage/cache identifiers. | Branding regression tests and repository scan. | No. |
| P1 | Production content coverage is insufficient for Android schedule reliability. | API returns seven rows for a 31-day request; 24 of 31 dates are missing. | Verified mosque schedule has not been loaded. | Enforce/readily report a 31-day policy; preserve admin CSV/manual entry path; never calculate generic geographic times. | Validator/API/admin tests. | `CONTENT INPUT PENDING`. |
| P2 | Supabase performance advisor reports three unindexed FKs and repeated auth RLS init-plan warnings. | Advisor output identifies native installations, push deliveries, push subscriptions, and policies. | Supporting indexes absent; policies call auth functions per row. | Add low-risk indexes and semantically equivalent `(select auth.uid())` migration updates; avoid broad policy rewrites. | Clean bootstrap, advisor delta, RLS behavior tests. | No. |
| P2 | Global HTML responses have no CSP; runtime has one Node `url.parse()` deprecation warning group. | Production header probe shows no CSP on `/`; Vercel runtime telemetry records 18 warning occurrences. | CSP only configured for `sw.js`; transitive URL parser usage remains. | Enumerate origins and start with tested report-only CSP if enforcement cannot be proven; identify warning dependency after upgrade. | Build/runtime header probes and Vercel logs. | CSP enforcement may remain a monitored rollout item. |
| P2 | Demo-data fallback remains bundled for unconfigured Supabase. | Donation data imports `demo-data.ts`; README documents demo fallback. | Local review behavior was coupled to public data functions. | Remove runtime demo fallback from production data paths; keep explicit test fixtures only. | Unit tests with missing env and source scan. | No. |
| P2 | Dependabot alerts are disabled and GitHub code scanning has no analysis. | GitHub APIs return disabled/no-analysis. | Repository security automation is not enabled. | Add dependency review/audit CI and document repository-setting gates. | Workflow run and API recheck. | GitHub repository settings may require owner action. |
| P3 | Supabase service-role-only tables intentionally have RLS enabled with no public policies. | Advisor INFO for native installations, push deliveries, subscriptions; server routes use service role. | Fail-closed service-only design. | Verify grants and retain no-policy design; document rationale instead of adding public policies. | Grants query and advisor triage. | No. |

## Execution sequence

### Stage 1 — Finish Draft PR #49

1. Reproduce exact lint and authority-generation failures.
2. Add route/contract tests for authority generation, terminal revocation, account hydration/reset, stale work isolation, and native channel fail-open behavior.
3. Fix memoization with primitive session dependencies.
4. Rotate and bind `authority_id` across enrollment, native storage/bridge, heartbeat, and revocation without TOCTOU mutation windows.
5. Run targeted tests, full web suite/build, Android unit/lint/build, then push PR #49.
6. Request Codex review on the exact head and resolve valid P0/P1 findings.

### Stage 2 — Database/content technical gates

1. Add migration-managed canonical cron scheduler using the existing Vault secret.
2. Add deterministic QA-marker unpublish migration and defense-in-depth notification filtering.
3. Add a read-only launch data validator and CI/admin-visible report with 31-day schedule policy.
4. Add low-risk advisor indexes/RLS init-plan corrections and verify grants.
5. Apply authorized production migrations in safe order: mock unpublish before canonical cron activation.
6. Prove recent real pg_net 200 JSON responses and rerun advisors.

### Stage 3 — Android stable release/update platform

1. Define validated `android-release.json` schema and deterministic semantic/versionCode resolver.
2. Make `/api/android/release` and `/download/android` share the resolver.
3. Extend isolated signing workflow to derive/verify release metadata from signed artifacts and enforce monotonic versionCode against the current stable release.
4. Expose installed version from PackageInfo through the secure Browser Helper channel.
5. Add native-only update provider, throttle/foreground/manual checks, localized optional/required UI, and Settings status.
6. Ensure required-update state revokes native readiness without bricking web access when the API is unavailable.
7. Verify APK/AAB package, version, target SDK, certificate, digests, and update-compatible identity in CI.

### Stage 4 — Web/security/admin/legal/operations hardening

1. Upgrade to current patched stable Next 16.3.x and fully triage both npm audits.
2. Verify every admin mutation has server authorization; add missing behavioral tests.
3. Add technical privacy/imprint/account-lifecycle surfaces without invented legal copy.
4. Remove public runtime demo fallbacks and stale approved-brand copy; update README/runbooks.
5. Audit service worker deployment visibility, offline fallback, cache cleanup, and native/web update separation.
6. Add/test security headers based on an enumerated origin inventory.
7. Add operations runbook and production health checks; verify Vercel/Supabase/GitHub state.

### Stage 5 — Exact-head release gate

1. Run clean installs, audits, lint, all tests, web build, clean Supabase bootstrap, Android unit/lint/build.
2. Verify exact-head GitHub CI and request exact-head Codex review.
3. Produce signed RC APK/AAB only through protected CI if needed for physical-device validation; do not publish a new stable release/tag.
4. Report technical platform readiness and production content readiness separately, with physical-device and human-content/legal gates explicit.

