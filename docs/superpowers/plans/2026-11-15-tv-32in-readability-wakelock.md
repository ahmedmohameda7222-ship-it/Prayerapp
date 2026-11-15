# TV 32-inch readability and Fire Stick wake request Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans and test-driven-development. Verify before completion.

**Goal:** Improve 32-inch TV readability from distance; rotate post-prayer Azkar by human reading time; request best-effort Fire Stick Wake Lock.

**Architecture:** Pure timetable helper calculates sequential dhikr slide hold time and total state window. Single-item renderer follows absolute canonical start. A small client hook manages Screen Wake Lock while visible, with release handling and 4-minute retry; a last-in-file landscape CSS override adjusts typography without changing black screen.

**Tech Stack:** Next.js, React, TypeScript, Vitest, Vercel CI. **Spec:** docs/superpowers/specs/2026-11-15-tv-32in-readability-wakelock-design.md

### Task 1: Rotating After Prayer
- [ ] RED: Tests for short/long and ×33 reading time, absolute slide boundary, no content, same list order, exact end, Friday service and prayer preemption.
- [ ] GREEN: Add lib/after-prayer-rotation.ts; derive state duration from selectedPostPrayerAzkar; replace AfterPrayerBoard with a single large slide and dynamic remaining/status; adapt tests.
- [ ] Verify display tests and root contract.

### Task 2: Wake Lock
- [ ] RED: Test supported/unsupported browser, visible state, released lock, retry at 240000 ms, cleanup.
- [ ] GREEN: Add use-tv-wake-lock hook, activate in TV app/page without calling hooks conditionally. No bogus DOM activity.
- [ ] Verify TV tests, TypeScript, lint and build.

### Task 3: 32-inch landscape CSS
- [ ] RED: Update component/render and source-backed layout tests for one large after-prayer slide and no clipping and landscape sizing.
- [ ] GREEN: Replace stale postprayer grid CSS, add adaptive large text/clock/prayer rail and responsive limits.
- [ ] Verify full TV + root CI, production/Android/security after merge. No physical-TV test command.

### Review focus
- Friday and upcoming Adhan priority; transitions near midnight; empty playlist; independent clock after offline; 30s Iqama still followed by black; Screen Wake Lock denied by Silk; no attempt to fabricate user interaction.
