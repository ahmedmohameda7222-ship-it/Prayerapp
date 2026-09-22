# Masjid Display — Plan 6 Live Preview Verification

Status: PRE-MERGE REPOSITORY CERTIFICATION GREEN — POST-MERGE MAIN LIVE VERIFICATION PENDING

Plan 6 implementation starting point: `01dd070474a17a5f27eb472a58c5122cb092f315`

Approved design:
`docs/superpowers/specs/2026-09-21-masjid-display-plan-6-live-preview-design.md`

Approved implementation plan:
`docs/superpowers/plans/2026-09-21-masjid-display-plan-6-live-preview.md`

## Operator sequencing override — 2026-09-22

The approved Plan 6 design/plan originally ordered the dedicated TV preview and live browser/Admin Test Mode verification before the final Codex review and before merge.

The operator has explicitly changed **execution sequencing only**:

- do not create/deploy a candidate-branch Vercel TV project;
- finish all repository-side implementation, automated CI/security certification, and the final exact-head Codex review on `feat/masjid-display`;
- keep PR #108 Draft/open/unmerged during that pre-merge certification;
- after the operator authorizes and performs the merge to `main`, use the deployed root `main` application as the real upstream;
- then create/configure `donaumoschee-tv` with server-only `PRAYERAPP_ORIGIN=https://donaumoschee.vercel.app`;
- execute the real Feed/Test Control/browser/Admin Test Mode verification against the deployed `main` system;
- if that live verification finds a defect, fix it from `main` through a normal hotfix branch/PR rather than silently rewriting production.

This sequencing override does **not** relax the Plan 6 live-verification completion criteria. Plan 6 must not be called complete until the post-merge live evidence exists.


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

This was rechecked after implementation HEAD `3af36168524d2092745ca1546bcfeea76db91adc`: both connected Vercel accounts resolve to the same `Ahmed's projects` team and list the same seven projects, including root `donaumoschee` but no dedicated TV project.

The installed Vercel plugin has write permission, but exposes no project-creation or environment-variable mutation for this workflow. Its generic deploy action cannot be scoped to a dedicated TV project from the available interface and had previously returned `Tool deploy_to_vercel not found`. No unsafe deploy to the root Prayerapp project was attempted. Therefore no TV project ID, deployment ID, preview URL, or READY state is claimed.

## Real root-origin live check

Direct authenticated Vercel fetches against the required root production origin returned the following results, rechecked after implementation HEAD `3af36168524d2092745ca1546bcfeea76db91adc`:

| Endpoint | Result |
| --- | --- |
| `https://donaumoschee.vercel.app/api/public/masjid-display` | **404 Not Found**, matched `/_not-found` |
| `https://donaumoschee.vercel.app/api/public/masjid-display-test-control` | **404 Not Found**, matched `/_not-found` |

The current root production deployment remains from `main` (latest observed production SHA `dbe635a92e0e72ea8373831ae35502fe136a0f24`), and no `feat/masjid-display` preview deployment is present on the root project. Plan 5/6 endpoints remain in Draft PR #108. Plan 6 does **not** authorize silently publishing the entire unmerged root branch to the public production project.

Under the 2026-09-22 operator sequencing override, the following checks are intentionally deferred until after the approved branch is merged to `main` and the dedicated TV project is created:

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

Current pre-merge Plan 6 implementation HEAD:
`1be40eb0d47b58166ad71e5e727b65e550c41551`

Fresh exact-head pre-merge evidence:

- Root CI `35682351271`: **SUCCESS** — root lint/tests/typecheck, Feed contract, TV tests/lint/typecheck/build, clean Supabase bootstrap, migration/reconciliation/admin-audit certification, and root build.
- Masjid Display Verification `35682351501`: **SUCCESS**, including TV package verification and two-app integration.
- Plan 3 Display Feed Verification `35682351363`: **SUCCESS**.
- Security Scanners `35682351321`: **SUCCESS**, including CodeQL, OSV, Gitleaks, SBOM, authenticated local DAST, exact-head runtime DAST, and deployed-production DAST.
- Android TWA `35682351286`: **SUCCESS** — verify/build plus instrumentation on API 23 and API 37. The protected signing job was intentionally skipped because this was a pull-request verification run.

PR #108 had **0 unresolved inline review threads** before the final pre-merge Codex request.

### Deployed-production DAST timeout resilience

Fresh verification on documentation HEAD `598ebbffdbe449843b74732878bc97fbcbeb1ce4` exposed a repeatable deployed-production DAST false negative: the open-redirect probe timed out after a single 10-second request even though the same production URL returned HTTP 200 through Vercel inspection.

Evidence and TDD cycle:

- Security run `35681727445`: deployed-production DAST failed twice on the same `TimeoutError` at the open-redirect probe.
- Direct Vercel fetch of `/?next=https%3A%2F%2Fattacker.invalid%2Fescape`: **200 OK**, with no external redirect.
- RED Root CI `35682162164` on `69f61b11785daa7e5ea1050ac19de805b1326e19`: exactly one intended regression failure, with 883 tests passing, proving the scanner lacked bounded timeout retry behavior.
- Fix: `safe-dast.mjs` keeps the existing 10-second per-attempt timeout and all security assertions, but retries exactly once only when the thrown error is a `TimeoutError`. Arbitrary failures are not retried.
- GREEN Root CI `35682351271`: **SUCCESS**.
- GREEN Security Scanners `35682351321`: **SUCCESS**, including deployed-production DAST.

This change does not weaken the security boundary or accept a failing HTTP result; it only prevents one transient transport timeout from becoming a false security regression.

### Android SDK setup blocker closed during Plan 6 implementation

The previously recorded Android failure was an infrastructure defect in the pinned `android-actions/setup-android` versions: their default package list still requested Google's removed `tools` package.

RED / diagnosis:
- Android TWA `35563120667` on RED HEAD `2b3a7db5faf95b2b3af0b18cf08fe90ba61381ba`: **FAILURE** at `Set up Android SDK`, with `sdkmanager tools` → `Failed to find package 'tools'`.
- Focused source assertion also failed because both setup-android steps relied on the obsolete default.

Fix:
- every setup-android step now explicitly sets `packages: "platform-tools"`, avoiding the removed package while preserving the pinned action commits.

The first post-fix Android run `35563210983` progressed past SDK setup and exposed a stale Plan 6 unit test that still referenced removed `NativeConfig.ZONE`. That test was corrected to assert the server-provided `Asia/Tokyo` zone through `config.zone`, rather than a Berlin constant.

GREEN:
- Android TWA `35563381888`: **SUCCESS**, including instrumentation on API 23 and API 37.
- Root CI `35563381900`: **SUCCESS**, including the workflow regression contract.

### Security finding closed during Plan 6 implementation

GitHub Advanced Security reported a CodeQL `Potential file system race condition` in the Plan 6 Java source-tree test helper, where directory enumeration was followed by a separate `statSync` call.

TDD evidence:

- RED Root CI `35557966896`: the new regression failed because the helper did not use `withFileTypes` and still contained `statSync`.
- Fix: directory type information now comes directly from `readdirSync(..., { withFileTypes: true })`; the separate stat check is removed.
- GREEN Root CI `35558147818`: **SUCCESS**.
- GREEN Security Scanners `35558147841`: **SUCCESS**, including CodeQL.
- PR inline review threads after the fix: **0 unresolved**.

Earlier timezone-authority RED→GREEN evidence remains historical implementation evidence:

- RED Root CI `35552740003`: seven intended failures exposed Berlin-default behavior in non-Berlin prayer runtime/cutoff paths.
- GREEN Root CI `35553536449`: root tests/typecheck/build and repository certification passed after persisted timezone propagation.

Per the 2026-09-22 operator sequencing override, the final GitHub Codex review is the **last pre-merge gate** after all repository-side implementation and exact-head automated verification are green. The post-merge Vercel/browser/Admin Test Mode checks remain required for eventual Plan 6 completion but no longer precede the pre-merge Codex review. Any legitimate Critical/Important/security/correctness finding from that review must be fixed with regression coverage and exact-head verification before merge authorization.

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

**PRE-MERGE PLAN 6 REPOSITORY CERTIFICATION: GREEN AUTOMATED GATES; FINAL CODEX REVIEW PENDING.**

The real Vercel/root/browser/Admin Test Mode verification is intentionally scheduled for post-merge `main` under the operator sequencing override. Do not convert this to `PLAN 6 COMPLETE — LIVE PREVIEW + SETTINGS CONTROL VERIFIED` until that post-merge evidence is actually recorded.
