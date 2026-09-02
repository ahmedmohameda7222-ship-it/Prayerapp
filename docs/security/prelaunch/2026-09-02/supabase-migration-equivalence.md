# Supabase Post-Baseline Migration Equivalence Ledger

**Evidence date:** 2026-09-02
**Repository:** `ahmedmohameda7222-ship-it/Prayerapp`
**Remediation branch:** `security/prelaunch-remediation-2026-09-02`
**Approved Wave 0 head:** `fc34cb98edb6385851f4b7b06d340b6dbb2c6e7f`
**Production Supabase project:** `dbqbzvkleqzbgufllgca`
**Production migration-history boundary before reconciliation:** `20260822201832_database_advisor_hardening`

## Purpose

This ledger compares every repository migration after Production version `20260822201832` with the live Production catalog before remediation DDL or migration-history repair. It exists to prevent blind replay of migrations whose version is absent remotely while some or all of their semantic state is already present.

Classification vocabulary:

- **EXACTLY APPLIED** — the migration version is absent from remote history, but the live schema/configuration inspected for that migration is semantically equivalent to the repository migration.
- **NOT APPLIED** — the migration version is absent and its required schema/configuration state is absent.
- **PARTIALLY APPLIED** — only part of the required semantic state exists, or an incompatible variant exists.

`EXACTLY APPLIED` in this document is a semantic-state classification only. It does **not** mean the Supabase migration-history row exists, and it does **not** authorize history repair. Migration-history repair remains separately gated.

## Pre-reconciliation remote migration history

Read-only `list_migrations` evidence on 2026-09-02 confirmed Production history ended at:

- `20260822201832_database_advisor_hardening`

The following repository versions were absent from remote history:

1. `20260823104600_native_delivery_receipts`
2. `20260826160500_friday_v2_khutbahs`
3. `20260831080500_security_rate_limits`
4. `20260901223000_atomic_push_account_registration`

## Pre-reconciliation equivalence results

| Repository migration | Classification | Live evidence | History-repair eligibility |
| --- | --- | --- | --- |
| `20260823104600_native_delivery_receipts` | **NOT APPLIED** | `public.native_prayer_delivery_receipts` absent; `public.native_prayer_installations.receipt_v2` absent; `public.native_prayer_installations.account_generation` absent. Current installation row count was `0` at evidence capture. | **Not eligible at pre-reconciliation capture.** Never mark this version applied while its required state is absent. |
| `20260826160500_friday_v2_khutbahs` | **EXACTLY APPLIED** (semantic state; history absent) | `jumuah_times.khutbah_time` nullable; `friday_khutbahs` exists with the repository column/default/nullability contract; `date` UNIQUE; Friday-date CHECK; PK on `id`; RLS enabled; policy `Public read published Friday khutbahs` is SELECT for `anon, authenticated` using `published = true`; `anon`/`authenticated` have SELECT only; `service_role` has full table privileges. Current row count was `1`. | Semantically eligible for later consideration, but **no history repair is authorized in Wave 1 without the separate gate**. |
| `20260831080500_security_rate_limits` | **EXACTLY APPLIED** (semantic state; history absent) | Table exists with matching columns/defaults/nullability, PK and three CHECK constraints; `security_rate_limits_updated_at_idx` exists; RLS enabled; no direct table grants to `anon`, `authenticated`, or `service_role`; `consume_security_rate_limit(text,text,integer,integer)` exists, owner `postgres`, SECURITY DEFINER, fixed `search_path=public, pg_temp`, EXECUTE denied to `anon`/`authenticated`, granted to `service_role`; hourly cleanup cron exists, active, schedule `17 * * * *`, deleting rows older than six hours. Current table row count was `1`. | Semantically eligible for later consideration, but **no history repair is authorized in Wave 1 without the separate gate**. |
| `20260901223000_atomic_push_account_registration` | **EXACTLY APPLIED** (semantic state; history absent) | `register_push_subscription(text,text,text,uuid,uuid,text,text,text,integer)` exists with matching behavior inspected from `pg_get_functiondef`; owner `postgres`; SECURITY DEFINER; fixed `search_path=pg_catalog, public`; EXECUTE denied to `anon`/`authenticated`, granted to `service_role`. Current `push_subscriptions` row count was `11`. | Semantically eligible for later consideration, but **no history repair is authorized in Wave 1 without the separate gate**. |

## Native-delivery-v2 RED evidence

The required pre-fix Production contract was executed read-only against `dbqbzvkleqzbgufllgca` and failed at the first invariant with:

```text
RED: native_prayer_delivery_receipts is missing
```

Independent catalog inspection also confirmed both required installation columns were absent.

This was the expected RED state for Task 1.2. It established that the missing native-delivery-v2 state had to be introduced by a new reconciliation migration rather than by blindly replaying all history-absent repository migrations.

## Reconciliation design constraints derived from Production

The reconciliation migration was required to:

1. preserve every existing `native_prayer_installations` row;
2. add `receipt_v2 boolean not null default false` without rewriting business meaning;
3. add `account_generation integer not null default 0` with a nonnegative CHECK;
4. create `native_prayer_delivery_receipts` with the exact PK/FK/CHECK/default/index contract from `20260823104600_native_delivery_receipts.sql`;
5. enable RLS and keep direct access service-role-only;
6. hard-fail if a pre-existing object with an incompatible type, nullability, default, constraint, key, privilege, or index shape is encountered;
7. be safe to run after a clean repository bootstrap where `20260823104600_native_delivery_receipts.sql` has already created the intended state;
8. make no changes to `friday_khutbahs`, `security_rate_limits`, `register_push_subscription`, Auth configuration, migration history, or unrelated Production data.

## Data-preservation baseline

Read-only counts at pre-reconciliation evidence capture:

- `native_prayer_installations`: `0`
- `friday_khutbahs`: `1`
- `security_rate_limits`: `1`
- `push_subscriptions`: `11`

The reconciliation scope touched only the native-installation table and the new delivery-receipt table. It did not modify or delete the Friday, rate-limit, or push-subscription rows above.

## Local RED to GREEN verification before Production

The reviewed repository reconciliation migration is:

- `supabase/migrations/20260902170000_prelaunch_schema_reconciliation.sql`
- Git blob: `698e758f69a53918e9407a6cad829fe2dd28a7ca`

The hardened read-only verifier is:

- `scripts/security/verify-production-schema.sql`
- Git blob: `72baaece7103cf27064eeb232143c45c967dd4b6`

Exact-head pre-Production verification candidate:

- head: `f355ae3f57e920b888f1253d6da59f60885b82a0`
- CI run: `33683799074`
- CI job: `100426311707`
- result: **SUCCESS**
- Vitest: **121 test files / 547 tests passed**
- production dependency audit: **0 vulnerabilities** with `npm audit --omit=dev`
- lint: **0 errors**; 35 pre-existing warnings
- clean local Supabase bootstrap: **PASS**
- local `verify-production-schema.sql`: **PASS**
- reconciliation second execution/idempotence: **PASS**
- synthetic native-installation row preservation inside rollback transaction: **PASS**
- conflicting `receipt_v2` partial-schema CHECK rejected: **PASS**
- conflicting `account_generation` partial-schema CHECK rejected: **PASS**
- production build: **PASS**

No source-contract test was weakened to obtain this result.

## Immediate Production re-read before mutation

Immediately before applying the new migration, read-only catalog inspection confirmed the premise was still compatible:

- `native_prayer_installations` row count: `0`
- `native_prayer_delivery_receipts`: absent
- `native_prayer_installations.receipt_v2`: absent
- `native_prayer_installations.account_generation`: absent
- no partial CHECK involving either missing field
- Friday V2 remained semantically equivalent to its repository migration
- durable rate limiting and its cleanup cron/RPC remained semantically equivalent
- atomic push registration remained semantically equivalent

Accordingly, no historical migration was blindly replayed.

## Production reconciliation application

Under the user's explicit authorization for ordinary new security-remediation migrations after RED/local GREEN/bootstrap/idempotence/preservation/content review, the exact reviewed reconciliation SQL was applied to Production project `dbqbzvkleqzbgufllgca`.

Supabase management recorded:

- Production migration version: `20260902211847`
- Production migration name: `prelaunch_schema_reconciliation`
- application result: **SUCCESS**
- Postgres statement timestamp: `2026-09-02T21:18:47.084Z`

The management-generated Production version is intentionally left as recorded. The repository migration filename remains `20260902170000_prelaunch_schema_reconciliation.sql`. No migration-history repair, version rewrite, mark-applied operation, or metadata manipulation was performed.

## Exact post-reconciliation Production state

The repository verifier was executed read-only against Production immediately after application and returned:

```text
PASS: Production Supabase security schema contract is satisfied
```

The verifier simultaneously revalidated native-delivery-v2, Friday V2, durable rate limiting, cleanup cron semantics, and atomic push registration.

Read-only catalog evidence after application:

- `native_prayer_installations` row count: `0` — unchanged from immediately before application
- `native_prayer_delivery_receipts` row count: `0`
- `receipt_v2`: boolean, NOT NULL, default `false`
- `account_generation`: integer, NOT NULL, default `0`
- installation-level nonnegative CHECK: `CHECK (account_generation >= 0)`
- receipt table: exactly 8 expected columns
- receipt PK: `(installation_id, account_generation, event_id)`
- receipt FKs: installation and `auth.users`, both `ON DELETE CASCADE`
- receipt CHECKs: exactly four required checks (event ID, kind, account generation, expiry)
- receipt indexes: event/expiry/installation composite plus expiry index, in addition to the PK index
- receipt RLS: enabled
- receipt RLS policies: `0`, intentionally server-only
- `anon`: no direct SELECT/INSERT/UPDATE/DELETE privileges
- `authenticated`: no direct SELECT/INSERT/UPDATE/DELETE privileges
- `service_role`: SELECT/INSERT/UPDATE/DELETE/TRUNCATE/REFERENCES/TRIGGER privileges present

PostgreSQL truncated the long generated installation CHECK identifier to `native_prayer_installations_account_generation_nonnegative_chec`; the semantic definition is exactly `CHECK (account_generation >= 0)`. Verification relies on the constraint expression, not the cosmetic identifier.

## Live Production before/after evidence

### Supabase API

Immediately before reconciliation, recurring production traffic showed the exact drift failures:

- at `2026-09-02T21:18:00Z`, receipt cleanup DELETE against `native_prayer_delivery_receipts` returned **404**
- at `2026-09-02T21:18:01Z`, the native installation query selecting `receipt_v2` / `account_generation` returned **400**

After the migration at `21:18:47Z`:

- at `21:19` and `21:20`, the same receipt cleanup DELETE returned **204**
- at `21:19` and `21:20`, the same native installation query returned **200**

### Postgres

Before migration, Postgres repeatedly logged:

```text
column native_prayer_installations.receipt_v2 does not exist
```

The last observed pre-migration occurrence was at `2026-09-02T21:18:01.321Z`. No later occurrence was present in the post-apply log window reviewed; cron jobs at 21:19, 21:20, and 21:21 completed normally.

### Vercel production runtime

The active Production deployment remained the existing `main` deployment:

- deployment: `dpl_39vKk5vWuBkmQrDza3FQuSU2tr8j`
- deployed commit: `b18430b360313148fc76baaeda9d96844ed508a5`

The application was not redeployed for this schema-only correction.

Vercel runtime logs provide independent application-level before/after evidence on `/api/cron/prayer-reminders`:

- 21:14 through 21:18 UTC: HTTP 200 requests emitted warnings that receipt cleanup could not find `public.native_prayer_delivery_receipts` and native authority lookup could not find `native_prayer_installations.receipt_v2`
- 21:19, 21:20, and 21:21 UTC: HTTP 200 requests completed without those warnings

The live application therefore consumed the reconciled schema successfully without an application deployment.

## Native-authority/API behavior boundary

The production receipt route validates native credentials and generation, selects `credential_hash, authority_id, user_id, account_generation, receipt_v2`, and upserts into `native_prayer_delivery_receipts`. Production had zero native installation rows at the reconciliation boundary, so no valid-credential receipt write was fabricated in Production. Creating a synthetic Production user/installation solely for testing would have introduced Production test data and was not required or appropriate.

Instead, non-destructive live-path evidence demonstrates the repaired API/database boundary:

- the recurring server-side native authority lookup containing both new columns changed from Supabase **400** to **200**;
- server-side receipt cleanup changed from **404** to **204**;
- matching Vercel cron warnings disappeared immediately after reconciliation.

## Post-DDL security advisor

The post-apply Supabase security advisor reported:

- INFO: RLS enabled with no policy on `native_prayer_delivery_receipts`; this is intentional for the server-only table and is paired with no anon/authenticated grants and service-role-only direct access
- existing INFO notices of the same class on other server-only tables
- existing WARN: leaked-password protection disabled

The leaked-password protection setting is a separately gated Supabase Auth operation and was **not** changed in this reconciliation.

## Recovery / forward-fix rule

If a future issue is found after this successful additive Production commit, recovery is by a new reviewed forward-fix migration after reproducing and verifying the defect. Destructive schema rollback, blind replay, and migration-history manipulation are not the default recovery mechanisms. The detailed recovery procedure is in `supabase-reconciliation-recovery.md`.

## History-repair decision after reconciliation

**No migration-history repair was performed.**

Production now has a new management-recorded reconciliation migration that supplies the missing native-delivery-v2 semantic state, while the historical repository versions `20260823104600`, `20260826160500`, `20260831080500`, and `20260901223000` remain absent from remote migration history. Whether any historical metadata should ever be repaired remains a separately gated decision and is not required for the schema reconciliation itself.
