# Prayerapp Pre-Launch Security Baseline

Date: 2026-09-02
Branch: `security/prelaunch-remediation-2026-09-02`
Repository: `ahmedmohameda7222-ship-it/Prayerapp`

## Binding Authorities

The attached authorities were read and copied into this branch without changing their meaning.

| Authority | In-repo copy | SHA-256 |
| --- | --- | --- |
| Remediation plan | `docs/superpowers/plans/2026-09-02-prelaunch-security-remediation.md` | `1C99F9C635DEE2BF3D8FC9004A3DBF2CED02FD6BB04631AF8F4EDEFD66DE1F52` |
| Execution checklist | `docs/security/prelaunch/2026-09-02/approved-execution-checklist.md` | `0D20AF901D559B51B4F26B5B24F6E3920F828580801F1A6D518D31D9A23AE2B4` |
| Open-control matrix | `docs/security/prelaunch/2026-09-02/approved-open-control-matrix.json` | `AB8A2A167A07085C036111F6246FA79E07C5D6FA0313B236F3D7AB04EBBBEF81` |

## Repository State

`origin/main` was fetched immediately before branch creation and resolved to `b18430b360313148fc76baaeda9d96844ed508a5`, matching the approved baseline. The diff from `b18430b360313148fc76baaeda9d96844ed508a5..origin/main` was empty. The starting worktree was clean.

The implementation worktree was created from `origin/main` at:

`C:\Users\Ahmee\Documents\Codex\2026-09-02\prayerapp-pre-launch-security-remediation-implementation\work\Prayerapp-security-prelaunch`

Open PRs at baseline inspection:

| PR | Branch | State | Title |
| --- | --- | --- | --- |
| #34 | `feat/per-prayer-adhan-selection` | open | Add per-prayer Adhan selection |
| #14 | `feat/friday-native-pwa-shell` | draft | Refine Friday root experience and adaptive PWA shell |
| #13 | `feat/friday-desktop-polish` | draft | Polish Friday desktop composition |

Security-related branches existed, including `origin/security/full-application-hardening`, `origin/fix/p1-security-next-16-3`, `origin/logic-hardening-full-audit`, `origin/logic-hardening-migration-sync`, and Android recovery/security branches. None matched the required `security/prelaunch-remediation-2026-09-02` branch or had an open remediation PR.

## Production Web State

Production origin: `https://donaumoschee.vercel.app`

Latest GitHub deployment observed for `Production`:

| Deployment ID | SHA | Status | Target URL |
| --- | --- | --- | --- |
| `6218221149` | `b18430b360313148fc76baaeda9d96844ed508a5` | `success` | `https://donaumoschee-nvk2tilyw-ahmed-s-projectssasa.vercel.app` |

Low-impact `HEAD` request to the production origin returned `200 OK` and security headers including HSTS, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`, and `X-Frame-Options`. The live CSP still contains `script-src 'self' 'unsafe-inline'` and `style-src 'self' 'unsafe-inline'`, matching the Wave 2 open CSP controls. Source authority: `next.config.ts:3-21`.

## Supabase State

Production Supabase project: `dbqbzvkleqzbgufllgca`

Read-only project metadata:

| Field | Value |
| --- | --- |
| Status | `ACTIVE_HEALTHY` |
| Region | `eu-west-1` |
| Database host | `db.dbqbzvkleqzbgufllgca.supabase.co` |
| Postgres engine | `17` |
| Database version | `17.6.1.155` |

Read-only migration history currently ends at `20260822201832_database_advisor_hardening`. Repository migrations after that version are:

- `20260823104600_native_delivery_receipts.sql`
- `20260826160500_friday_v2_khutbahs.sql`
- `20260831080500_security_rate_limits.sql`
- `20260901223000_atomic_push_account_registration.sql`

Initial read-only schema probe found `native_prayer_installations` present with RLS enabled and service-role table privileges, but without `receipt_v2` and `account_generation`; `native_prayer_delivery_receipts` was not present in the inspected public table list. The `register_push_subscription` RPC is present, owned by `postgres`, `SECURITY DEFINER`, and configured with `search_path=pg_catalog, public`. These facts establish the Wave 1 migration-equivalence work and do not authorize migration-history repair.

## Android Release State

Current public release: `android-v1.0.3`

| Field | Value |
| --- | --- |
| Tag target | `a8a1adc929f9fc9eda094693f5cfa6202735e4ca` |
| Published | `2026-08-26T06:47:28Z` |
| APK asset digest | `sha256:196cf9963addb55c168e199b823409546ce1550decb61c20d37c767b3ebc8059` |
| AAB asset digest | `sha256:5e8839df9fca7fcc3c36e93f5651257100f8a9579582f8ce2f909b2fd16c26a9` |

Current source Android metadata is `de.donaumoschee.app`, host `donaumoschee.vercel.app`, min SDK `23`, target SDK `37`, compile SDK `37`, versionCode `6`, versionName `1.0.3`. Source authority: `android-twa/twa-manifest.json`.

## GitHub Governance State

GitHub environments observed: `Production`, `Preview`, and `android-production`. The `android-production` environment has a required reviewer rule and custom branch policy, but `can_admins_bypass` is true.

Ruleset `Protect main` is active on `refs/heads/main`. It blocks deletion/non-fast-forward pushes, requires pull requests with thread resolution and squash merge, and requires the `verify`, Android verify, API 23 instrumentation, and API 37 instrumentation status checks. Its approving-review requirement is currently `0`, which remains a Wave 3 governance item requiring explicit remote-config approval before change.

## Dependency And Tool State

`npm ci` completed locally. The install-time audit reported one high-severity advisory when dev dependencies are included. A separate `npm audit --omit=dev --json` returned zero production vulnerabilities.

Baseline `npm test` initially failed in four source-contract tests due CRLF-vs-LF assumptions in the Windows checkout, not product behavior. The tests were adjusted to normalize line endings in their local source readers, then the focused rerun passed 31 tests and the full suite passed 119 files / 537 tests.

Supabase changelog was checked on 2026-09-02. Relevant current items for later waves include Data API exposure defaults, full migration/schema handling, Logs API migration, extension version pinning behavior, and Node runtime support changes.

## Production Mutations

NONE.
