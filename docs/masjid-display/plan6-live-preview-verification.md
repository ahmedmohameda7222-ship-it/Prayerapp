# Masjid Display — Plan 6 Live Preview Verification

Status: BLOCKED — LIVE ROOT ENDPOINTS / TV DEPLOYMENT NOT YET AVAILABLE

Plan 6 implementation starting point: `01dd070474a17a5f27eb472a58c5122cb092f315`

Approved design:
`docs/superpowers/specs/2026-09-21-masjid-display-plan-6-live-preview-design.md`

Approved implementation plan:
`docs/superpowers/plans/2026-09-21-masjid-display-plan-6-live-preview.md`

## Prayer Engine operational policy

Plan 6 removes the obsolete compile-time `PRODUCTION_PRAYER_PROFILE_APPROVED=false` schedule-commit blocker.

The operational authority is now the mosque/operator's persisted Admin Prayer Engine Settings. Historical timetable comparison remains available as optional reference only.

The following protections remain mandatory and are still implemented:

- authenticated Admin actions;
- Admin audit start/completion;
- calculation/settings validation;
- saving Settings does not write `prayer_times`;
- preview before extension/recalculation commit;
- recalculation confirmation in the Admin UI;
- settings/calculation revision checks;
- stale-preview comparison against a fresh server preview/diff;
- future-only recalculation;
- existing atomic schedule-generation/write safeguards.

No mosque-specific prayer angles, offsets, Iqama delays, or timetable values were invented by Plan 6.

## Settings-driven configuration audit

| Area | Canonical authority | Admin → persistence → runtime result |
| --- | --- | --- |
| Latitude / longitude / timezone | `prayer_settings` | Admin Prayer Engine → validated singleton → calculation adapter |
| Fajr angle | `prayer_settings` | wired |
| Isha rule / angle / fixed minutes | `prayer_settings` | wired |
| Asr shadow factor | `prayer_settings` | wired |
| High-latitude rule | `prayer_settings` | wired |
| Six calculation offsets | `prayer_settings` | wired |
| Five shared Iqama delays | `prayer_settings` | Feed → TV; Iqama = stored prayer start + delay |
| Five display prayer durations | `masjid_display_settings` | Admin Masjid Display → Feed → TV state engine |
| Azkar playlist | `masjid_display_settings` | Admin → bounded public selection → Feed |
| Prayerapp public URL | `mosque_settings.public_app_url` | Admin Settings → Feed → persistent QR |
| Announcements / urgent | existing announcement model | reused; no duplicate Plan 6 setting |
| Events | existing event model | reused |
| Campaigns / donation URL | existing campaign model | reused; donation URL feeds campaign QR |
| Additional Jumuah | existing Jumuah model | reused |

Legacy absolute-Iqama fields are not restored as active authority.

## Vercel configuration target

- Team: `Ahmed's projects`
- Root Prayerapp project: `donaumoschee`
- Root production origin: `https://donaumoschee.vercel.app`
- Intended TV project: `donaumoschee-tv`
- Repository: `ahmedmohameda7222-ship-it/Prayerapp`
- Root Directory: `masjid-display`
- Framework: Next.js
- Candidate branch: `feat/masjid-display`
- Server-only environment: `PRAYERAPP_ORIGIN=https://donaumoschee.vercel.app`
- `NEXT_PUBLIC_PRAYERAPP_ORIGIN`: forbidden / not configured

Authorized Vercel inspection on 2026-09-21 found no existing `donaumoschee-tv` project.

The connected Vercel deployment mutation advertised by the connector returned `Tool deploy_to_vercel not found`; therefore no project ID, deployment ID, or READY state is claimed.

## Real root-origin live check

Direct authenticated Vercel fetches against the required root production origin returned:

| Endpoint | Result |
| --- | --- |
| `https://donaumoschee.vercel.app/api/public/masjid-display` | **404 Not Found**, matched `/_not-found` |
| `https://donaumoschee.vercel.app/api/public/masjid-display-test-control` | **404 Not Found**, matched `/_not-found` |

The current root production deployment is from `main`, while Plan 5/6 endpoints remain in draft PR #108. Plan 6 does **not** authorize silently publishing the entire unmerged root branch to the public production project.

Consequences until the root endpoint prerequisite and TV project are actually deployed:

- live TV Feed proxy: **NOT VERIFIED**;
- live Test Control proxy: **NOT VERIFIED**;
- deployed main TV page: **NOT AVAILABLE**;
- 1920×1080 browser verification: **NOT EXECUTED**;
- larger browser viewport verification: **NOT EXECUTED**;
- live Arabic/German rendering: **NOT EXECUTED**;
- live persistent QR rendering: **NOT EXECUTED**;
- live Campaign QR software rendering: **NOT EXECUTED**;
- live diagnostics: **NOT EXECUTED**;
- real Admin Test Mode → deployed TV: **NOT EXECUTED**.

These are Plan 6 live-preview gates, so Plan 6 is not marked complete while they remain absent.

## Automated Test Mode / LKG evidence

Repository certification continues to prove:

- Admin synthetic mutations target only `masjid_display_test_state`;
- public Test Control is GET-only/sanitized/no-store;
- latest accepted polling generation wins and slower stale responses cannot revert the state;
- local Test Mode expiry disables stale overrides;
- Stop returns runtime resolution to current real Feed/logical time;
- Test Mode payloads do not replace production LKG;
- synthetic data is not written to canonical prayer/content tables.

Live E2E is still required by Plan 6 and is not inferred from these automated tests.

## CI / security evidence

Exact final run IDs are recorded after the final documentation/code HEAD is stable.

Current observed evidence while Plan 6 is in progress includes:

- Plan 3 Display Feed Verification: green on the current candidate series;
- TV package verification: green on the current candidate series;
- CodeQL / OSV / Gitleaks / exact-head DAST: green on the current candidate series;
- Android TWA: known SDK-setup failure is tracked separately and is not represented as green.

## Deferred operational follow-up / Plan 7

The following are truthfully **NOT EXECUTED** and do not by themselves block Plan 6:

- historical ±1-minute calibration matching;
- destructive real-target legacy-Iqama cutover;
- physical 32-inch/larger/1440p/4K TV certification;
- physical Prayerapp QR scan;
- physical Campaign QR scan;
- 24-hour soak;
- 72-hour soak.

No destructive production migration was executed in Plan 6.

## Current Plan 6 result

**PLAN 6 BLOCKED — live root Feed/Test Control endpoints and dedicated READY TV deployment are not yet available.**

Do not convert this to `PLAN 6 COMPLETE — LIVE PREVIEW + SETTINGS CONTROL VERIFIED` until the required live Vercel/root/browser/Test Mode evidence is actually recorded.
