# Masjid Display TV

The Masjid Display is an independent Next.js TV project inside the Prayerapp repository.

## Project boundary

**Root Prayerapp (`/`)** owns Admin, Supabase, Prayer Engine data, public Feed v1, and public read-only Test Control.

**Masjid Display TV (`masjid-display/`)** owns the television UI, deterministic display state engine, Feed/LKG validation, server-side Prayerapp proxy, Test Mode rendering, diagnostics, and watchdog behavior.

The TV browser has no Supabase client, no service-role/browser secret, no prayer-calculation engine, and no audio runtime.

## Required server environment

`PRAYERAPP_ORIGIN` is a **server-only** origin used by the TV project's route handlers. Authorized Vercel inspection during Plan 5 identified the current root Prayerapp production alias as `https://donaumoschee.vercel.app`. Set the independent TV deployment to the canonical root production origin after confirming it in Vercel at deployment time. Do not expose it through a `NEXT_PUBLIC_` variable and do not append paths/query parameters.

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


## Certification status

Plan 5 automated software/certification gates are green on the post-Codex-fix implementation. Overall production certification remains **BLOCKED** until the required religious calibration, real-target migration prerequisite, physical TV/QR execution, and 24-hour soak evidence are actually supplied. See `../docs/masjid-display/production-certification.md`.
