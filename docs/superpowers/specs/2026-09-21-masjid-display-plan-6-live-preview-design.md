# Masjid Display Plan 6 — Live Preview, Settings Control, and End-to-End Verification Design

**Status:** Approved design for Plan 6 planning

**Plan 6 base:** `7b53384f372ac4b5aacf71a09bc5d0e84a5c7880`

**Repository:** `ahmedmohameda7222-ship-it/Prayerapp`

**Branch:** `feat/masjid-display`

**Existing PR:** #108 remains Draft, open, and unmerged.

## Purpose

Plan 6 moves the already-implemented Masjid Display from repository/CI certification into a real live preview environment that can be operated through Prayerapp Admin settings.

The target outcome is a separately deployed TV application that reads the real Prayerapp Feed through its existing server-side proxy, can be exercised through the existing Test Mode, and exposes no religious/display tuning as hard-coded production behavior when that tuning belongs in Admin settings.

Plan 6 is deliberately narrower than a final production cutover. It should finish quickly and leave the project ready for Plan 7, which will own destructive production cutover/release work if still required.

## Decisions Superseding Prior Release-Gate Interpretation

Plan 5 evidence remains historically accurate, but the following items are no longer blockers to starting or completing Plan 6:

1. Historical timetable matching within ±1 minute is not a Plan 6 release gate.
2. Prayer Engine calibration is an operator workflow through Settings. The team will tune the calculation settings, inspect the newly calculated times, compare them as desired, and approve the operational profile.
3. Real-target destructive legacy-Iqama removal is deferred to Plan 7.
4. Physical 32-inch/larger/4K QA is an operational follow-up and does not block Plan 6 completion.
5. Physical Prayerapp/Campaign QR scans are operational follow-up and do not block Plan 6 completion.
6. The 24-hour/72-hour soak is operational follow-up and does not block Plan 6 completion.

These items must not be falsely marked as executed or PASS if they have not actually occurred.

## Architecture

Prayerapp and the TV remain two independently deployable applications in the same repository.

### Root Prayerapp

Root directory: `/`

Responsibilities:
- Admin/authentication.
- Supabase access.
- Prayer Engine settings and schedule generation.
- Masjid Display settings.
- Public Feed v1.
- Public read-only Test Control.
- Admin Test Mode mutation path.

### Masjid Display TV

Root directory: `masjid-display/`

Responsibilities:
- TV rendering.
- Feed v1 validation.
- same-origin Feed/Test proxy routes.
- logical clock and state engine.
- LKG/offline behavior.
- Test Mode rendering.
- diagnostics/watchdog.
- persistent Prayerapp QR and Campaign QR rendering.

The TV browser continues to have:
- no Supabase client;
- no service-role/browser secret;
- no prayer calculation engine;
- no audio runtime.

## Vercel Live Preview

Create or use a dedicated Vercel project for the TV in the same Vercel team that owns the existing Prayerapp project.

Required TV project configuration:

- Git repository: `ahmedmohameda7222-ship-it/Prayerapp`
- Root Directory: `masjid-display`
- Framework: Next.js
- Initial branch/candidate: `feat/masjid-display`
- Server-only environment variable:
  - `PRAYERAPP_ORIGIN=https://donaumoschee.vercel.app`

`PRAYERAPP_ORIGIN` is an origin only. It must not include credentials, path, query, or fragment. It must not be exposed as `NEXT_PUBLIC_*`.

The TV project remains independent from the root Prayerapp project so each can be rolled back separately.

## Settings-Driven Production Behavior

Any operational tuning that belongs to the mosque/admin must be controlled from Admin settings rather than embedded as fixed production values in TV code.

Plan 6 must audit and prove the existing path for these settings:

### Prayer calculation settings

- latitude;
- longitude;
- timezone;
- Fajr angle;
- Isha rule;
- Isha angle when angle-based;
- Isha minutes after Maghrib when fixed-minute based;
- Asr shadow factor;
- high-latitude rule;
- Fajr offset;
- Sunrise offset;
- Dhuhr offset;
- Asr offset;
- Maghrib offset;
- Isha offset.

### Iqama settings

- Fajr delay;
- Dhuhr delay;
- Asr delay;
- Maghrib delay;
- Isha delay.

The runtime meaning remains:

`Iqama = final stored prayer start + configured delay`

No absolute legacy Iqama field may become the active application authority again.

### Masjid Display settings

- five prayer in-progress display durations;
- selected Azkar playlist;
- Prayerapp public URL used by the persistent QR.

Existing content controls remain database/Admin driven:
- announcements;
- events;
- campaigns;
- Jumuah additional services;
- urgent content;
- Campaign donation URL/QR.

If an expected setting is already fully implemented, Plan 6 must reuse it rather than create duplicate configuration.

If a required setting is genuinely missing, Plan 6 may add the minimum Admin/data/Feed wiring and tests needed to make it configurable.

## Prayer Engine Calibration Workflow

Plan 6 does not choose a religious profile on behalf of the operator and does not hard-code a mosque-specific calibration profile.

The intended workflow is:

1. Operator edits Prayer Engine settings in Admin.
2. Admin preview/recalculation shows the newly calculated schedule.
3. Operator compares the generated times against whatever references the mosque chooses to use.
4. Operator continues tuning through Settings.
5. A profile is considered operationally approved when the mosque decides the resulting schedule is correct for use.

Historical published rows remain available as reference data but are not mandatory matching targets for Plan 6 completion.

Changing calculation settings must continue to use the existing revision/recalculation safety model. Saving settings alone must not silently rewrite canonical schedule rows.

## Live End-to-End Verification

Plan 6 must verify the deployed TV against the real root Prayerapp origin without requiring destructive production migration.

At minimum verify:

- TV deployment reaches READY.
- TV page renders successfully.
- TV same-origin Feed proxy reaches root Feed.
- Feed schema v1 validates.
- ETag/304 behavior remains valid where observable.
- production Feed renders current data or the designed safe empty/stale state.
- Prayer strip renders.
- current logical clock updates.
- Test Control polling works.
- Admin Test Mode changes appear on the deployed TV.
- Test Mode Stop returns to the current real state.
- synthetic Test Mode data does not enter LKG.
- persistent Prayerapp QR receives the configured URL.
- Campaign QR renders when campaign data includes a donation URL.
- diagnostics remain read-only and contain no secret.
- reconnect/wake handling remains functional where browser automation can exercise it.

Where production currently lacks schedule/config/content required for a rich real-data display, Test Mode is the accepted way to prove renderer/state behavior. Plan 6 must not fabricate production rows just to make the screen visually busy.

## Browser and Deployment Verification

Use the deployed preview URL for browser verification.

Automated browser checks should cover:
- page load without fatal console errors;
- 1920×1080 viewport;
- at least one larger/high-resolution viewport such as 2560×1440 or 3840×2160;
- Arabic/German layout smoke checks where the deployed scenario exposes them;
- Test Mode badge/state transitions;
- persistent QR presence;
- diagnostics query mode.

Browser viewport tests supplement but do not claim physical-TV or physical-camera certification.

## Error Handling

Deployment/configuration failures must be explicit.

Examples:
- missing `PRAYERAPP_ORIGIN` -> deployment/runtime configuration failure, not silent fallback to a different upstream;
- malformed upstream Feed -> retain valid LKG and expose safe diagnostic state;
- unsupported schema -> reject snapshot;
- root outage -> use valid LKG while covered;
- no valid Feed/LKG -> show fail-safe UI without inventing prayer times;
- Test Control failure -> production state continues unaffected.

No production behavior should depend on a synthetic fallback unless the existing Test Mode contract explicitly allows it.

## Security Boundary

Plan 6 must preserve Plan 5 security constraints:

- Feed and public Test Control are read-only GET surfaces.
- Test Mode mutations require Admin authorization.
- TV upstream origin is fixed by server-only environment configuration.
- no request parameter may select an arbitrary upstream.
- no Supabase runtime dependency is added to TV.
- no secrets are exposed to the browser.
- external content is rendered as data, not executable HTML.
- synthetic Test payload never becomes production Feed/LKG data.

## Scope Boundaries

### In Plan 6

- dedicated TV Vercel project/live preview;
- server-only upstream configuration;
- live deployed TV verification;
- audit/fix of Settings-driven configuration;
- Admin-to-TV end-to-end Test Mode verification;
- browser viewport verification;
- regression tests for any defect found;
- CI/security verification;
- actual GitHub Codex review on PR #108;
- documentation of live preview project/configuration and observed results.

### Deferred to Plan 7

- destructive real-target removal of legacy absolute-Iqama columns;
- final production DB cutover;
- final production rollout/promotion;
- physical-TV signoff;
- physical QR scan signoff;
- 24/72-hour physical/runtime soak signoff;
- any final release/merge decision.

Plan 6 must not merge PR #108 and must not perform a destructive production migration.

## Completion Criteria

Plan 6 is complete when all of the following are true:

1. A dedicated TV Vercel project exists with root `masjid-display/`.
2. The candidate branch is deployed successfully.
3. `PRAYERAPP_ORIGIN` is configured server-side to the real root Prayerapp origin.
4. The deployed TV can fetch and validate the real Feed through its own proxy.
5. Deployed Test Mode can be driven from the real Admin path and observed on TV.
6. Settings-driven Prayer Engine/Iqama/Display controls are audited and any real wiring gaps are fixed.
7. No mosque-specific calculation/Iqama/display tuning that belongs in Settings is newly hard-coded.
8. Automated root/TV/Feed/security verification is green for the Plan 6 final HEAD.
9. Browser live verification is recorded.
10. Final GitHub Codex Review has no legitimate unresolved Critical/Important/security/correctness finding.
11. PR #108 remains Draft/open/unmerged unless the user explicitly changes that instruction.
12. Plan 7 has not been implemented.

Operational follow-ups that require a physical display, camera, long-duration soak, or destructive production authorization do not prevent Plan 6 from being marked complete, but their execution status must remain truthful.
