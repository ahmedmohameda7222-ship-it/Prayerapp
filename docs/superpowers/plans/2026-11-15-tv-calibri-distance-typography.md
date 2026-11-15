# TV Calibri-first 6-metre Type Scale Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans and test-driven-development. Verify each acceptance gate before merging.

**Goal:** Make every visible TV text element readable from a distance on 32-inch 720p/1080p, preferring Calibri for Arabic and German without illegally embedding it.

**Architecture:** Add self-hosted Next.js open fonts as fallback variables. Import a final TV-only stylesheet after existing styles to unify language-specific typography and enlarge text while retaining prayer and rotation state.

**Tech Stack:** React 19, Next.js 16 next/font/google, CSS, Vitest, GitHub CI/Vercel.

**Spec:** docs/superpowers/specs/2026-11-15-tv-calibri-distance-typography.md

### Task 1 — Font stack, local fallbacks
- [ ] RED: test requires Calibri-first Arabic/Latin stacks and Next font imports.
- [ ] GREEN: package Carlito and Noto Sans Arabic through next/font/google; define CSS family variables and overrides.
- [ ] VERIFY: TV typecheck/build; note Calibri proprietary font is not redistributed.

### Task 2 — Legible TV hierarchy
- [ ] RED: verify selectors for headers, 6 cards, Iqama, QR, main slides, source, rotating dhikr, Friday, event, campaign, error/test copy use readable minimum sizes and preserve 6-card landscape row.
- [ ] GREEN: implement tv-legibility.css with scoped responsive sizes at 720p and 1080p; avoid overflow/ellipsis/line-clamp; keep black congregation DOM unaffected.
- [ ] VERIFY: TV tests + CSS contract, smoke-check bounds.

### Task 3 — Release
- [ ] CHECK: inspect diff for no prayer engine/config/DB changes, review new fonts/licenses.
- [ ] VERIFY: Masjid Display Verification, CI, Android, Security all green on exact SHA; squash-merge.
- [ ] VERIFY: app and TV Vercel production deployments READY and TV alias updated. User performs 32-inch/6-metre device acceptance.
