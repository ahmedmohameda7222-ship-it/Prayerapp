# Masjid Display TV — current production runtime

This is the independent, browser-based mosque TV application in `masjid-display/`. The root Prayerapp provides published mosque content and prayer times; the TV consumes the public Feed v1 and renders the current religious state locally.

## Deployment and API boundaries

| Project | Responsibility | Production origin |
| --- | --- | --- |
| Root `donaumoschee` | Admin, prayer engine, Supabase, published Feed v1 | `https://donaumoschee.vercel.app` |
| TV `donaumoschee-tv` | Same-origin public proxy, validated display, Last Known Good (LKG), logical clock, watchdog, diagnostics | `https://donaumoschee-tv.vercel.app` |

The TV browser requests **only** `GET /api/display-feed` for app data. The TV server forwards it to root `GET /api/public/masjid-display` using server-only `PRAYERAPP_ORIGIN`. Do not expose that variable as `NEXT_PUBLIC_` or add browser Supabase credentials. The TV has no prayer-calculation engine, audio runtime, or database client.

Both independent Vercel projects deploy from approved `main` commits. Feature branches do not create Vercel previews under the existing main-only release policy.

## Runtime expectations

- The TV refreshes Feed every **120 seconds**, and immediately on online/visibility return; the logical clock and religious display transitions progress locally between requests.
- `ETag` and `304 Not Modified` are supported. A validated snapshot may serve as LKG during transient failure; an invalid/oversized Feed never replaces it.
- If no currently valid prayer schedule exists, show a safe stale/update-needed state rather than inventing times.
- The displayed prayer strip contains Fajr, sunrise (informational), Dhuhr/Jumuah, Asr, Maghrib, and Isha. Normal prayers show an Iqama offset in minutes; Friday Jumuah and sunrise do not get invented Iqama offsets.
- A persistent public app QR code is rendered when configured. Campaign QR is conditional on a published campaign with a donation URL.
- Diagnostics are maintenance-only using `?diagnostics=1`, including feed schema/revision, time, coverage, last sync, LKG and validation error.

## Verification

From `masjid-display/`:

```sh
npm ci
npm test
npm run lint
npm run typecheck
PRAYERAPP_ORIGIN=http://127.0.0.1:3000 npm run build
```

Root CI also verifies producer/consumer contract, root build, migrations and security. These automated gates do **not** certify real TV hardware, fullscreen behavior, QR scans or continuous soak.

For the current production procedure use [Current TV Production Operations](../docs/masjid-display/current-production-operations.md). Hardware/QR acceptance remains recorded in [Physical TV Certification](../docs/masjid-display/physical-tv-certification.md), and extended operation in [Soak Test](../docs/masjid-display/soak-test.md). The older Plan 5–7 histories are archived evidence, not instructions to reactivate retired synthetic controls.
