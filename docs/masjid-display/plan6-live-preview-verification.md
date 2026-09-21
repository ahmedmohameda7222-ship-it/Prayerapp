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

This was rechecked after implementation HEAD `704d004b6b3650ae6a191f867b169ac2b0d442dd`: both connected Vercel accounts resolve to the same `Ahmed's projects` team and list the same seven projects, including root `donaumoschee` but no dedicated TV project.

The installed Vercel plugin has write permission, but exposes no project-creation or environment-variable mutation for this workflow. Its generic deploy action cannot be scoped to a dedicated TV project from the available interface and had previously returned `Tool deploy_to_vercel not found`. No unsafe deploy to the root Prayerapp project was attempted. Therefore no TV project ID, deployment ID, preview URL, or READY state is claimed.

## Real root-origin live check

Direct authenticated Vercel fetches against the required root production origin returned the following results, rechecked after implementation HEAD `704d004b6b3650ae6a191f867b169ac2b0d442dd`:

| Endpoint | Result |
| --- | --- |
| `https://donaumoschee.vercel.app/api/public/masjid-display` | **404 Not Found**, matched `/_not-found` |
| `https://donaumoschee.vercel.app/api/public/masjid-display-test-control` | **404 Not Found**, matched `/_not-found` |

The current root production deployment remains from `main` (latest observed production SHA `dbe635a92e0e72ea8373831ae35502fe136a0f24`), and no `feat/masjid-display` preview deployment is present on the root project. Plan 5/6 endpoints remain in Draft PR #108. Plan 6 does **not** authorize silently publishing the entire unmerged root branch to the public production project.

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

Current Plan 6 repository HEAD:
`704d004b6b3650ae6a191f867b169ac2b0d442dd`

Fresh exact-head evidence:

- Root CI `35558147818`: **SUCCESS** — root lint/tests/typecheck, Feed contract, TV tests/lint/typecheck/build, Supabase bootstrap/migration/reconciliation/admin-audit certification, and root build completed successfully.
- Masjid Display Verification `35558147821`: **SUCCESS**, including TV package verification and live two-app integration.
- Plan 3 Display Feed Verification `35558147809`: **SUCCESS**.
- Security Scanners `35558147841`: **SUCCESS** — CodeQL, OSV, Gitleaks, SBOM, authenticated local DAST, exact-head runtime DAST, and deployed-production DAST completed successfully.
- Android TWA `35558147806`: **FAILURE** at the known Android SDK setup stage because the action requests obsolete `sdkmanager tools`; Android project tests/build are skipped and this is not represented as green.

### Security finding closed during Plan 6 implementation

GitHub Advanced Security reported a CodeQL `Potential file system race condition` in the Plan 6 Java source-tree test helper, where directory enumeration was followed by a separate `statSync` call.

TDD evidence:

- RED Root CI `35557966896`: the new regression failed because the helper did not use `withFileTypes` and still contained `statSync`.
- Fix: directory type information now comes directly from `readdirSync(..., { withFileTypes: true })`; the separate stat check is removed.
- GREEN Root CI `35558147818`: **SUCCESS**.
- GREEN Security Scanners `35558147841`: **SUCCESS**, including CodeQL.
- PR inline review threads after the fix: **0 unresolved**.

The native Android timezone commits that followed the earlier documentation snapshot remain covered by the same exact-head root/TV/security run set above.

Earlier timezone-authority RED→GREEN evidence remains historical implementation evidence:

- RED Root CI `35552740003`: seven intended failures exposed Berlin-default behavior in non-Berlin prayer runtime/cutoff paths.
- GREEN Root CI `35553536449`: root tests/typecheck/build and repository certification passed after persisted timezone propagation.

Per operator instruction, **no further GitHub Codex review is requested during implementation**. Codex review is reserved for the final step only, after all non-review Plan 6 implementation/live-verification work is complete. If final review returns legitimate findings, they must be fixed and reverified before Plan 6 can be marked complete.

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

**PLAN 6 BLOCKED — live root Feed/Test Control endpoints and dedicated READY TV deployment are not yet available. Final Codex review is intentionally deferred until those implementation/live gates are complete.**

Do not convert this to `PLAN 6 COMPLETE — LIVE PREVIEW + SETTINGS CONTROL VERIFIED` until the required live Vercel/root/browser/Test Mode evidence is actually recorded.
