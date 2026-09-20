# Masjid Display TV

The Masjid Display is an independent Next.js TV project inside the Prayerapp repository.

## Project boundary

**Root Prayerapp (`/`)** owns Admin, Supabase, Prayer Engine data, public Feed v1, and public read-only Test Control.

**Masjid Display TV (`masjid-display/`)** owns the television UI, deterministic display state engine, Feed/LKG validation, server-side Prayerapp proxy, Test Mode rendering, diagnostics, and watchdog behavior.

The TV browser has no Supabase client, no service-role/browser secret, no prayer-calculation engine, and no audio runtime.

## Plan 6 Vercel live preview

Approved project configuration:

- Vercel team: `Ahmed's projects`;
- project name: `donaumoschee-tv`;
- Git repository: `ahmedmohameda7222-ship-it/Prayerapp`;
- Root Directory: `masjid-display`;
- framework: Next.js;
- candidate branch: `feat/masjid-display`;
- server-only environment: `PRAYERAPP_ORIGIN=https://donaumoschee.vercel.app`.

`PRAYERAPP_ORIGIN` is used only by the TV project's server route handlers. Do not expose it through a `NEXT_PUBLIC_` variable and do not append credentials, path, query, or fragment. The browser talks only to the TV's same-origin `/api/display-feed` and `/api/test-control` routes.

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

Production dynamic Feed readers are row/record-size bounded, and the root producer fails closed rather than emitting a finalized public Feed larger than 128 KiB. An oversized or invalid response therefore cannot replace the TV's validated LKG.

See `../docs/masjid-display/deployment.md` for deployment/rollback and `../docs/masjid-display/production-certification.md` for release status.


## Plan 6 scope

Plan 6 live-preview completion is separate from final production cutover. Historical ±1-minute calibration, destructive real-target legacy-Iqama cutover, physical TV/QR signoff, and 24/72-hour soak remain truthful operational follow-ups for Plan 7; they are not Plan 6 completion gates and are not claimed as executed here. See `../docs/masjid-display/production-certification.md` for preserved Plan 5 history.
