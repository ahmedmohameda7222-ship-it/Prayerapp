# Masjid Display Implementation Plan Index

> **For agentic workers:** Execute the five plans below in order using `superpowers:executing-plans`. Do not skip prerequisite gates.

**Approved design:** `docs/superpowers/specs/2026-09-15-masjid-display-design.md`

## Execution order

1. `2026-09-15-masjid-display-plan-1-prayer-engine-db.md`
2. `2026-09-15-masjid-display-plan-2-admin-test-control.md`
3. `2026-09-15-masjid-display-plan-3-display-feed.md`
4. `2026-09-15-masjid-display-plan-4-tv-runtime-ui.md`
5. `2026-09-15-masjid-display-plan-5-integration-certification.md`

## Canonical implementation constants

These values are already decided by the approved design/plans and must not be silently reinterpreted during execution:

- Prayer calculation kernel: exact-pinned `adhan@4.4.6`.
- TV QR rendering dependency: use exact-pinned `qrcode.react@4.2.0` unless a reproducible compatibility test proves it unusable in the target Next/Samsung environment; any substitution requires a plan amendment before code changes.
- Feed schema: `schemaVersion = 1`.
- Production feed poll: every 60 seconds, plus immediate reconnect/wake/visibility-return sync.
- Test Control poll while display is online: approximately every 2 seconds.
- Test Mode default TTL: exactly 15 minutes; Admin may Stop immediately or Extend +15 minutes.
- Prayer schedule feed coverage: previous mosque-local day plus approximately 35 future days.
- Prayer approach: fixed T-10 minutes.
- Prayer Time Now: maximum 2 minutes, preempted by Iqama.
- Iqama Now: 2-minute visual.
- Iqama delay 0: immediate Iqama Now; delay 1: one-minute Prayer Time Now; delay >=2: up to two-minute Prayer Time Now then wait if required.
- Prayer in-progress duration: 2–120 minutes inclusive, measured from original Iqama instant.
- Friday first focus: T-60 minutes before first Jumuah (Friday Dhuhr).
- Additional Jumuah focus: T-10 minutes.
- Jumuah Now hold: up to 30 minutes, preempted by the next service's T-10 focus.
- Normal slide interval: 10 seconds.
- Urgent AR/DE view interval: 8 seconds.
- Display: completely silent; no audio implementation or settings.
- UI: responsive + adaptive + fluid; never device-inch hard-coded. 32-inch 1080p is a minimum/reference QA target only.
- Persistent Prayerapp QR remains visible in production and Test Mode.
- Test Mode uses synthetic fixtures and never writes fake rows into production prayer/content tables.

## Hard gates between plans

### Plan 1 → Plan 2

- Prayer Engine deterministic tests green.
- `prayer_settings` and atomic persistence RPCs pass local DB reset.
- Calibration/diff path exists.
- Existing root app still builds with legacy Iqama columns temporarily present.

### Plan 2 → Plan 3

- Root Prayerapp consumers use shared delay-derived Iqama.
- Admin Prayer Engine, Display Settings, and real-TV Test console are functional.
- Content scheduling/bilingual validation fields exist.
- Legacy absolute-Iqama drop is executed/deployed only after the documented cutover gate verifies the five shared delays in the target environment.

### Plan 3 → Plan 4

- Feed v1 golden fixture passes producer validation.
- ETag/representation is stable when semantic content/window is unchanged.
- Feed includes future scheduled content needed for offline activation/expiry.
- Public Feed and Test Control endpoints are GET-only and safe.

### Plan 4 → Plan 5

- Independent TV app builds without Supabase/audio client dependencies.
- State, Friday, scheduler, LKG, clock, wake recovery, Test Mode, QR, and responsive render tests are green.
- Admin Test Mode reaches the real display within the intended polling window in local integration testing.

### Production release

No production-ready claim until Plan 5 certification records critical rows as PASS: Prayer Engine calibration, migration dry-run, automated tests, feed/security, offline/wake, Test Mode, responsive physical TV/QR checks, and long-duration soak.

## Branch policy

- Planning artifacts live on `docs/masjid-display-design`.
- Implementation should begin from latest `main` in an isolated worktree on `feat/masjid-display` after the approved design/plans are available (merged or explicitly cherry-picked).
- `main` is protected; use a PR and preserve required checks.
- Commit after each small verified task as specified by the individual plans.
