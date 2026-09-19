# Masjid Display — Deployment, Rollback, and Operations

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
6. Perform the physical-TV/QR and soak certification before calling the release production-certified.

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
