# Remote TV Test Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Provide a secure, short-lived remote TV rehearsal panel for the mounted TV, without altering prayer schedules.

**Architecture:** A root-owned admin-authenticated command table is read via a public sanitized status API and the independent TV's same-origin proxy. The TV calculates a test logical instant from real validated Feed data and the command's start timestamp, then uses the existing state machine and content components unchanged.

**Tech Stack:** Next.js, React, TypeScript, Supabase Postgres + RLS, Vitest.

**Spec:** `docs/superpowers/specs/2026-11-15-admin-tv-test.md`

## Global Constraints
- No changes to Prayer Engine, canonical prayer schedule, user data or production Feed contract.
- Auto-stop maximum 180 seconds; Stop restores normal presentation on the next TV poll.
- Admin-only writes with existing server auth/audit; public status has only narrow typed values.
- Never fake an unpublished event/campaign/khutbah; do not claim unimplemented blackout/sermon state is deployed.
- No secrets in TV app or browser, no admin JWT forwarded to TV.

## Tasks
1. **Contracts and DB security.** New pure `lib/masjid-display/tv-test-control.ts` with exhaustive scenario/prayer input parser and expiration parser, tests before implementation. SQL migration `masjid_display_tv_test` with service-only grant and RLS. A central server-only reader and sanitized public GET.
2. **Admin start/stop/status page.** `app/admin/tv-test/{actions.ts,page.tsx}`, link in `AdminSidebar`. Start/Stop validated and audited; UX has selected prayer and buttons for each available scenario, active status and time remaining, help for physical demonstration.
3. **TV same-origin remote status and clock injection.** Add allowlisted path to `masjid-display/lib/upstream.ts`, proxy route `/api/tv-test`, polling hook and pure presenter deriving simulated now from Feed and command. Start/switch test within three seconds, TTL/Stop restore normal state. Distinct test badge, no effect on LKG.
4. **Verification.** Tests for validation, expiry, unauthorized attempts, source-based state derivation, Friday service and content availability, Stop and no data mutation. Typecheck/lint/build, TV two-app integration and CI, deploy after squash; apply SQL migration in coordinated sequence and verify production API and TV READY.

## Review Focus
- No stale mode after Stop/expiry even when TV temporarily offline.
- Test cannot be started by anonymous callers or unapproved Supabase users.
- No nonexistent fake prayer/Friday date from outside the Feed.
- Dynamic content preview won't hallucinate when there is no published item.
- Testing any scenario won't change the official Feed/next-prayer state seen outside the TV screen.
