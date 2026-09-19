# Masjid Display TV

The Masjid Display is an independent Next.js TV project inside the Prayerapp repository.

## Project boundary

**Root Prayerapp (`/`)** owns Admin, Supabase, Prayer Engine data, public Feed v1, and public read-only Test Control.

**Masjid Display TV (`masjid-display/`)** owns the television UI, deterministic display state engine, Feed/LKG validation, server-side Prayerapp proxy, Test Mode rendering, diagnostics, and watchdog behavior.

The TV browser has no Supabase client, no service-role/browser secret, no prayer-calculation engine, and no audio runtime.

## Required server environment

`PRAYERAPP_ORIGIN` is a **server-only** origin used by the TV project's route handlers. Set it in the independent TV deployment to the real Prayerapp production origin copied from the root project's deployment settings. Do not expose it through a `NEXT_PUBLIC_` variable and do not append paths/query parameters.

## Local verification

From `masjid-display/`:

```sh
npm ci
npm test
npm run lint
npm run typecheck
PRAYERAPP_ORIGIN=http://127.0.0.1:3000 npm run build
```

The root release CI also runs these TV gates plus the producer/consumer Feed-v1 contract verifier.

## Runtime model

The browser polls production Feed through `/api/display-feed` and Test Control through `/api/test-control`. Valid Feed v1 snapshots may enter Last Known Good. Synthetic Test Mode data never enters LKG. On reconnect, visibility return, or wake, the runtime recalculates current state from current time/data and immediately refreshes instead of replaying expired transient states.

See `../docs/masjid-display/deployment.md` for deployment/rollback and `../docs/masjid-display/production-certification.md` for release status.
