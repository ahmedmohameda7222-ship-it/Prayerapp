# Current Masjid Display Production Operations

**Status:** Current runbook (November 2026). Automated deployment and feed-health evidence are separate from physical hardware certification, which remains **NOT EXECUTED** until recorded.

## Architecture and authority

The independent root Vercel project `donaumoschee` publishes a read-only, size-limited Feed v1 at `GET https://donaumoschee.vercel.app/api/public/masjid-display`. The independent TV Vercel project `donaumoschee-tv` proxies it through `GET https://donaumoschee-tv.vercel.app/api/display-feed`. Only the server-side TV route reads `PRAYERAPP_ORIGIN`; never publish it to the browser or add Supabase/client secrets to the TV runtime.

The TV consumer validates the version, timetable, applied timezone, source/content bounds, and dynamic content. The server's HTTP `Date` header is the *current time* reference; Feed `generatedAt` is a stable source-version marker and may be a logical future timestamp. Never use `generatedAt` as a heartbeat or freshness assertion.

The runtime polls every **120 seconds** (two minutes), supports conditional `If-None-Match` / HTTP `304`, and refreshes immediately on online/visible wake. Between polls, the clock and prayer transitions use the device-adjusted logical clock. Last Known Good (LKG) is preserved during transient failures only while the current mosque-local prayer schedule remains valid. No fabricated times, no stale religious-state replay, and no reload loops are acceptable.

The retired synthetic control routes are **not** part of the current runtime. Test the actual published Feed and real client behavior, not a synthetic admin scenario.

## Main-only release sequence

1. Verify the exact GitHub PR head has green root CI, TV/producer-consumer tests, security scans and required Android checks. Reconcile reviews before squash merge.
2. Merge one approved PR to `main`; retain Vercel's existing main-only deployment policy (no feature-branch preview).
3. Independently verify the root and TV Vercel production deployments are `READY`, identify each deployed commit SHA and confirm both compatible releases.
4. Read-only smoke: root `/api/health` must return HTTP 200 with `status=ok`, `database=ok`; root Feed and TV proxy must return expected HTTP 200 JSON and a current mosque-local prayer date. A valid conditional request may return 304. A bad/unsupported/empty timetable is not a pass.
5. Review logs for root Feed 5xx, TV proxy failures, CRON 5xx and repeated LKG fallback; never infer actual push delivery from a successful scheduler HTTP response.
6. Open TV `?diagnostics=1` only for maintenance: inspect schema, revision, generated marker, last sync, server-clock offset, current prayer coverage, network/LKG and any validation error.
7. Complete physical device acceptance in [Physical TV Certification](physical-tv-certification.md): fullscreen/remote, languages, actual clock and Iqama offsets, QR scans, practical viewing distance, network interruption and wake. **Do not mark PASS until performed.**
8. Complete the initial **24 continuous hours** of actual-device soak in [Soak Test](soak-test.md); a 72-hour extension is separately recorded. Continuous soak is not replaced by GitHub test runtime.

## Production monitoring and failure response

[Production Health Monitor](../security/monitoring-alerting.md) checks public Web health and TV Feed about every 15 minutes through GitHub Actions, plus the first `main` push that changes its monitor. A failed workflow is an observable signal, **not proof that email/on-call/paging reaches a person**; notification delivery has to be configured/tested independently.

If Feed is 503 or malformed: inspect root scheduler/timezone/feed logs and the TV proxy separately. Retain a valid LKG only within its date coverage. Resolve the underlying issue and verify both components; do not mutate production data or backfill prayer times based on an automated health check. This runbook adds no automatic failover, backup or recovery mechanisms.

## Explicit non-evidence

Automated checks do not prove iPhone Home Screen Push delivery, Android hardware exact alarm/audio, printed/camera QR scans, physical TV readability or browser chrome removal. Those are manual acceptance gates. Missing evidence stays **NOT EXECUTED**.
