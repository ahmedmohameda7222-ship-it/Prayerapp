# Masjid Display — Deployment, Rollback, and Operations

## Plan 7 candidate workflow

Plan 7 uses the existing TV project and preserves the stable production deployment while the feature branch is being certified. Vercel is intentionally configured to deploy `main` only; PR/feature-branch Preview deployments are disabled.

| Setting | Value |
| --- | --- |
| Root Prayerapp project | `donaumoschee` |
| Root production origin | `https://donaumoschee.vercel.app` |
| TV project | `donaumoschee-tv` |
| TV project ID | `prj_6oqEYWPnfn1kMRo798M21swUl2w2` |
| TV Root Directory | `masjid-display` |
| Candidate branch | `feat/masjid-display-plan-7` |
| Server-only upstream | `PRAYERAPP_ORIGIN=https://donaumoschee.vercel.app` |

Required sequence:

1. keep Plan 7 work on `feat/masjid-display-plan-7` and keep its PR against `main` Draft during pre-merge certification;
2. preserve the repository Vercel policy `git.deploymentEnabled["**"] = false` and `git.deploymentEnabled.main = true`;
3. do **not** create or require a Vercel PR/feature-branch Preview;
4. complete exact-head CI/security/source-boundary checks and final pre-merge review on the feature branch while the current `main` production TV deployment remains intact;
5. only the independent Planner may authorize and perform the squash merge;
6. after merge, allow the normal Vercel `main` deployment to deploy the merged Plan 7 commit;
7. record the resulting production deployment ID, URL, state, and attached `main` commit SHA;
8. verify production `/api/display-feed`, `/api/test-control`, runtime logs/errors, browser UI/fullscreen/diagnostics, Admin Test Mode, and physical TV/QR/network/wake behavior.

This is a deliberate main-only release policy, not a missing-Preview blocker.

`PRAYERAPP_ORIGIN` remains server-only. Never create `NEXT_PUBLIC_PRAYERAPP_ORIGIN`.

### Presentation/fullscreen operation

The TV UI exposes a native **Vollbild / ملء الشاشة** setup button while not fullscreen. Activate it through an ordinary user gesture (pointer/touch, keyboard Enter/Space, or normal TV-remote focused-button activation). The implementation uses the standard Fullscreen API with feature detection, requests hidden navigation UI where supported, hides the setup control in fullscreen, and restores it after exit.

If programmatic fullscreen is unavailable or denied, follow the visible browser-level fallback instruction. Do not add Samsung-, Amazon-, Silk-, Chrome-, or other user-agent routing solely to force fullscreen.

## Historical Plan 6 live-preview configuration

The approved Plan 6 candidate configuration is:

| Setting | Value |
| --- | --- |
| Vercel team | `Ahmed's projects` |
| TV project | `donaumoschee-tv` |
| Git repository | `ahmedmohameda7222-ship-it/Prayerapp` |
| Root Directory | `masjid-display` |
| Framework | Next.js |
| Candidate branch | `feat/masjid-display` |
| Server environment | `PRAYERAPP_ORIGIN=https://donaumoschee.vercel.app` |

`PRAYERAPP_ORIGIN` remains server-only. No `NEXT_PUBLIC_PRAYERAPP_ORIGIN` is permitted. Plan 6 deployment does not include the destructive real-target legacy-Iqama migration and does not claim physical TV/QR or soak evidence.

## Independent projects

Prayerapp and Masjid Display deploy independently. They must not be treated as an atomic deployment.

### Root Prayerapp project

- Root directory: `/`.
- Owns Admin/auth.
- Owns Supabase integration and database migrations.
- Owns Prayer Engine/settings.
- Owns public Feed v1 at the root application's public display endpoint.
- Owns public read-only Test Control.
- Contains no TV deployment assumption.

### Masjid Display TV project

- Root directory: `masjid-display/`.
- Use a separate Vercel project/domain.
- Server environment: `PRAYERAPP_ORIGIN`.
- `PRAYERAPP_ORIGIN` must be copied by the operator from the actual Prayerapp production project settings.
- No production domain is invented or hard-coded by this runbook.
- No browser Supabase/service-role secret.
- No Supabase browser integration.

## Environment configuration

Authorized Vercel inspection identifies the root Prayerapp production project as `donaumoschee`. Its current production deployment is READY and exposes the canonical Vercel production alias `https://donaumoschee.vercel.app`.

In the independent TV Vercel project, configure `PRAYERAPP_ORIGIN` as the canonical Prayerapp **origin only**. At the time of this certification, the authorized root production alias is `https://donaumoschee.vercel.app`; the operator must still confirm the production alias has not changed when deploying the TV project. The implementation rejects credentials, query strings, fragments, and paths in this variable.

Do not create `NEXT_PUBLIC_PRAYERAPP_ORIGIN`. The browser talks only to same-origin TV route handlers.

## Compatibility/deployment order

For a backward-compatible Feed schema v1 producer change:

1. verify the consumer already accepts the resulting v1 contract;
2. deploy the root Prayerapp producer first;
3. verify public Feed health;
4. deploy or retain the compatible TV consumer independently.

For any future breaking schema:

1. release a consumer that understands **old + new** schema versions;
2. verify that consumer against the old producer;
3. switch the producer to the new schema only afterward;
4. remove old-schema support only in a later independently certified change.

Never assume simultaneous deployment.

## Root Prayerapp deployment

1. Use the approved release commit and normal root project pipeline.
2. Confirm root tests/lint/typecheck/build and required Supabase/security gates.
3. For schema changes, review migration evidence before production mutation.
4. Confirm Feed v1 returns only the expected public DTO and stable validation/ETag behavior.
5. Do not perform the legacy-Iqama destructive cutover unless real-target shared-delay prerequisites are proven and authorized.

## TV deployment

1. Create/use the independent TV project with root directory `masjid-display/`.
2. Configure server-only `PRAYERAPP_ORIGIN` from the real root Prayerapp project.
3. Run TV tests, lint, typecheck, build, and producer/consumer contract verification.
4. Deploy the exact candidate commit.
5. Open diagnostics only for maintenance (`?diagnostics=1`) and verify schema, snapshot, sync, logical clock, coverage, online/LKG, and Test Mode flags.
6. For an open Plan 7 PR, record exact-head automated evidence only; do not create a Vercel Preview.
7. After the Planner squash-merges to `main`, record production browser/live evidence for the deployed merged commit. Physical-TV, real QR, offline/reconnect, and wake evidence remain final release-certification gates; 24/72-hour soak remains a non-blocking operational follow-up unless explicitly promoted to a gate.

## Runtime outage behavior

- First boot with no valid LKG and no valid Feed cannot invent religious state/data.
- A valid LKG is used during network/transient outages while its prayer schedule covers the current local date.
- Feed timeout, DNS/connection error, 5xx, malformed 200, or unsupported schema does not replace LKG.
- A 304 keeps the validated snapshot and confirms connectivity.
- Reconnect and visible wake trigger an immediate refresh.
- The normal Feed covers yesterday through **35 days ahead**; after current-day prayer coverage expires, the TV shows the stale/update-needed fail-safe rather than inventing prayer state.
- Test Mode Stop or expiry returns to the **current** real state.
- Synthetic Test data never enters production Feed or LKG.

## Independent rollback — root Prayerapp

If a root deployment breaks Feed behavior while schema compatibility is still v1:

1. roll back the root Prayerapp deployment independently;
2. leave the TV deployment unchanged if its supported contract remains v1;
3. the TV retains valid LKG during the outage;
4. verify the restored producer with the contract test and public Feed;
5. monitor TV diagnostics for accepted snapshot revision/sync recovery.

If a producer starts emitting an unsupported schema, the TV rejects it and retains LKG. Roll back the producer before LKG prayer coverage expires.

## Independent rollback — Masjid Display TV

If the TV deployment is defective:

1. roll back only the TV project to the prior compatible deployment;
2. do not roll back root Prayerapp unless it independently requires rollback;
3. confirm the rolled-back TV accepts current Feed v1;
4. inspect diagnostics for schema, snapshot, last sync, clock offset, coverage, online/LKG, and Test Mode;
5. execute wake/reconnect and Test Mode Stop/expiry checks.

## Operational failure cues

Investigate before release if diagnostics show:

- unsupported/invalid Feed validation;
- missing current-day prayer coverage;
- persistent LKG use despite restored network;
- unexpected logical clock offset;
- Test Mode beyond its expiry;
- repeated watchdog reload/reload loop;
- missing persistent Prayerapp QR configuration.

A schema mismatch, expired LKG horizon, black screen, stale religious-state replay, reload loop, frozen renderer, or Test data leakage is release-blocking until corrected and recertified.
