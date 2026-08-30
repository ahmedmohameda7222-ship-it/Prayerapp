# Prayerapp — Qibla Reliability + UX Hardening Implementation Plan

Status: Approved implementation plan.

## Execution baseline

- Repository: `ahmedmohameda7222-ship-it/Prayerapp`
- Planning-time baseline: `main@6208adbb083cd6ba0434a3eddd9e1565b25a68dc`
- Execution baseline verified on 2026-08-30: `main@8141c3347df0c51b0782f15240c1b38155c0ec53`
- The newer main commit is `feat: unify public page headers on current main (#100)` and must be preserved.
- Implementation branch: `feat/qibla-reliability-ux-hardening`
- Draft PR only. Do not merge, deploy, publish, tag, or release.

## Required workflow

Use Superpowers throughout: `using-superpowers`, `using-git-worktrees`, `test-driven-development`, `subagent-driven-development` where available, `systematic-debugging` for failures, `requesting-code-review`, and `verification-before-completion`.

Read `AGENTS.md` and the relevant Next.js 16 local documentation under `node_modules/next/dist/docs/` before changing framework behavior. Run `npm ci` before implementation in an execution environment that has repository/network access.

## Goal

Make Qibla safe and production-grade: independently tested great-circle math, strict true-heading trust boundaries, WMM2025 magnetic correction, fail-closed bearing-only fallback, physical RTL-safe compass geometry, progressive permissions, deterministic lifecycle/state behavior, manual location fallback, accurate privacy behavior, accessible semantic guidance, and a primary UX that answers which way the user should turn.

## Implementation tasks

1. Protect Qibla bearing math with golden tests; add signed turn delta and 4°/7° alignment hysteresis.
2. Add `lib/qibla-heading.ts` with structured heading samples, WebKit validation/accuracy classification, magnetic→true conversion, relative rejection, and ±35° tilt validation.
3. Add exact `geomagnetism@0.2.0`; isolate it in `lib/qibla-magnetic.ts`; use WMM2025 and fail closed outside supported dates.
4. Add a deterministic pure `lib/qibla-state.ts` reducer where bearing availability is independent of live-heading availability.
5. Move browser orchestration to `lib/use-qibla-controller.ts`: progressive permissions, source priority, `requestPermission(true)`, portrait/tilt gating, timeout fallback, time-based smoothing, 10Hz semantic updates, and lifecycle cleanup.
6. Round exact coordinates to 3 decimals on the client before reverse geocoding, keep defensive server rounding, and update factual privacy copy in all locales.
7. Add server-side Geoapify forward geocoding (`app/api/geocode/route.ts`) and selectable manual location fallback without exposing credentials.
8. Build `QiblaCompass` and `QiblaExperience`; simplify `app/qibla/page.tsx`; make bearing-only first-class; primary live copy is turn left/right; aligned copy is Facing Qibla; diagnostics move to Details.
9. Make physical compass coordinates deterministic in RTL: N top, E right, S bottom, W left; use an explicit SVG Qibla marker and non-mirrored coordinate space.
10. Add accessibility/reduced-motion behavior; decorative moving compass is `aria-hidden`; categorical live announcements only.
11. Update English, Arabic, German, and Turkish localization contracts with no English fallback strings in non-English files.
12. Add integration coverage for location, compass trust, geometry, lifecycle, UX, accessibility, and RTL states.
13. Prove reverse geocoding/network failures do not block bearing/live calculations; keep WMM local.
14. Create `docs/qa/qibla-physical-device-matrix.md`; physical device QA remains a release gate and cannot be replaced by DevTools sensor emulation.
15. Run repository verification: lint, all tests, both audits, build, service-worker syntax check, diff check, and focused Qibla tests.
16. Request code review focused on math, sensor trust, magnetic/true north, permissions, races, lifecycle, privacy, RTL, accessibility, and regressions; resolve valid findings with TDD; update the same Draft PR.

## Non-goals

No unrelated redesigns; no prayer-time/Friday/notification/Android scheduling changes; no new analytics; no telemetry coordinates; no decorative Qibla motion; no landscape compass math; no design-system rewrite; no native Android compass; no production deployment changes; no merge/deploy.

## Acceptance gate

Code-complete requires all automated correctness, privacy, localization, lifecycle, accessibility, lint/test/build/security gates in the approved design authority to pass. Physical-device QA is a separate final release gate; do not claim a trusted production live Qibla compass until that matrix passes.
