# Android Production Completion Implementation Plan

> Execute continuously on `codex/android-production-complete`. Keep one Draft PR. Do not merge, deploy, tag, or publish a release.

**Goal:** Ship a cryptographically verified Android release candidate with native prayer alarms and locked-screen Adhan playback while preserving browser/PWA delivery and failing open to Web Push.

**Architecture:** A verified-origin TWA owns a secure AndroidX Browser postMessage session. Web remains the configuration and published-schedule authority; Android caches normalized data, schedules exact alarms, and plays approved Adhan media through Media3. A short-lived server readiness lease provides per-subscription prayer-push dedupe and automatic failover.

**Stack:** Next.js 16, React 19, TypeScript, Vitest, Supabase/Postgres, Java 17, Android API 36, Android Browser Helper 2.7.3, AndroidX Browser, WorkManager, Media3, Gradle/GitHub Actions.

## Phase 1: identity, distribution, and trusted build path

1. Add failing contract tests for the production origin, Digital Asset Links statements, production package identity, version, target SDK, direct-download behavior, and signed workflow trust boundaries.
2. Update the TWA manifest/build metadata and Android manifest to production identity/version/origin requirements.
3. Add `use_as_origin` to Digital Asset Links while retaining `handle_all_urls` and the exact production certificate.
4. Implement `/download/android` with a testable release-selection helper, exact asset naming, caching, and a controlled unavailable response.
5. Route Home and Settings Android install actions to the permanent download path while retaining PWA installation for browser users.
6. Add Gradle wrapper and deterministic Android validation commands.
7. Replace debug-only Android CI with untrusted verification plus a same-repository signed RC job that creates and verifies APK/AAB artifacts without exposing secrets.
8. Add a separate manual/tag-gated production publication workflow but do not invoke it.
9. Run targeted tests and commit the Phase 1 checkpoint.

## Phase 2A: server contracts and fail-open authority

1. Add failing tests for schedule/catalog payload validation and native-authority fail-open filtering.
2. Add a service-role-only migration for native installation credentials/readiness leases, indexes, constraints, and cleanup behavior.
3. Add authenticated enrollment/link endpoints and credential-authenticated heartbeat/revocation endpoints with constant-time secret verification.
4. Add the bounded published-schedule API and approved Adhan catalog API.
5. Update only prayer-reminder subscription selection to suppress a subscription with a fresh healthy lease. Treat lookup errors as no suppression. Leave announcement/news sending untouched.
6. Add tests for multiple devices, expired lease, capability loss, stale schedule, invalid credentials, and query failure.

## Phase 2B: secure bridge and native engine

1. Add Android unit tests for protocol parsing, origin/type/version rejection, schedule validation, deterministic event IDs, event ledger dedupe, lease readiness, and Adhan catalog allowlisting.
2. Upgrade Android Browser Helper to 2.7.3 after build compatibility validation and add compatible Browser/WorkManager/Media3 dependencies.
3. Replace the thin launcher with an official-pattern retained `CustomTabsSession` TWA launcher and relationship-validated postMessage channel.
4. Add native permission activity and status reporting for Android 13 notifications and exact-alarm special access.
5. Implement versioned bridge envelopes and whitelisted handlers. Never accept arbitrary URLs, intents, file paths, or executable values.
6. Implement app-private configuration/schedule/catalog/cache storage with bounded, atomic writes.
7. Implement schedule normalization, exact-alarm planning, cancellation/replacement, deterministic PendingIntents, and delivered-event ledger.
8. Implement prayer/reminder alarm receiver, notification channels, full-screen-safe notification behavior, and never schedule sunrise.
9. Implement Media3 Adhan service, media notification/session, stop action, completion/error cleanup, approved catalog playback, and verified cache fallback.
10. Implement audio cache worker, schedule refresh/heartbeat workers, and repair receiver for boot/update/time/time-zone/exact-alarm changes.
11. Wire authenticated web configuration/schedule sync, enrollment, heartbeat credentials, and native status into the existing settings/preferences UI.
12. Make the 10-second Adhan and reminder tests use the real native alarm pipeline in the TWA and retain existing web tests in browsers.
13. Add localization and accessible status/action copy without changing unrelated UI.

## Verification and handoff

1. Run formatting/lint/type checks, Vitest suites, Next.js production build, service-worker/static contract checks, and migration validation.
2. Run Gradle unit tests, lint, debug build, release build where local credentials allow, and dependency/security inspection.
3. Inspect the final diff for secret leakage, old-origin leakage, debug application IDs, insecure bridge APIs, generic prayer calculations, and announcement-push coupling.
4. Commit logical checkpoints and push the single feature branch.
5. Open one Draft PR with scope, architecture, test evidence, security notes, and explicit no-merge/no-deploy status.
6. Wait for exact-head CI, diagnose and fix ordinary failures on the same branch/PR, and repeat until green or an external blocker is proven.
7. Download CI APK/AAB artifacts and independently verify package, version, target SDK, signature certificate, AAB signature, checksums, and exact workflow head SHA.
8. Report the exact APK artifact/file to install, the AAB companion artifact, Draft PR, CI run/head, verification evidence, limitations, and the physical-device test checklist.
