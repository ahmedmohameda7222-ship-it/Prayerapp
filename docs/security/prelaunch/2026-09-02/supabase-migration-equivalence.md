# Supabase Post-Baseline Migration Equivalence Ledger

**Evidence date:** 2026-09-02
**Repository:** `ahmedmohameda7222-ship-it/Prayerapp`
**Remediation branch:** `security/prelaunch-remediation-2026-09-02`
**Approved Wave 0 head:** `fc34cb98edb6385851f4b7b06d340b6dbb2c6e7f`
**Production Supabase project:** `dbqbzvkleqzbgufllgca`
**Production migration-history boundary:** `20260822201832_database_advisor_hardening`

## Purpose

This ledger compares every repository migration after Production version `20260822201832` with the current live Production catalog before any remediation DDL or migration-history repair. It exists to prevent blind replay of migrations whose version is absent remotely while some or all of their semantic state is already present.

Classification vocabulary:

- **EXACTLY APPLIED** — the migration version is absent from remote history, but the live schema/configuration inspected for that migration is semantically equivalent to the repository migration.
- **NOT APPLIED** — the migration version is absent and its required schema/configuration state is absent.
- **PARTIALLY APPLIED** — only part of the required semantic state exists, or an incompatible variant exists.

`EXACTLY APPLIED` in this document is a semantic-state classification only. It does **not** mean the Supabase migration-history row exists, and it does **not** authorize history repair. Migration-history repair remains separately gated.

## Remote migration history

Read-only `list_migrations` evidence on 2026-09-02 confirms Production history ends at:

- `20260822201832_database_advisor_hardening`

The following repository versions are absent from remote history:

1. `20260823104600_native_delivery_receipts`
2. `20260826160500_friday_v2_khutbahs`
3. `20260831080500_security_rate_limits`
4. `20260901223000_atomic_push_account_registration`

## Equivalence results

| Repository migration | Classification | Live evidence | History-repair eligibility |
| --- | --- | --- | --- |
| `20260823104600_native_delivery_receipts` | **NOT APPLIED** | `public.native_prayer_delivery_receipts` absent; `public.native_prayer_installations.receipt_v2` absent; `public.native_prayer_installations.account_generation` absent. Current installation row count was `0` at evidence capture. | **Not eligible.** Never mark this version applied while its required state is absent. |
| `20260826160500_friday_v2_khutbahs` | **EXACTLY APPLIED** (semantic state; history absent) | `jumuah_times.khutbah_time` nullable; `friday_khutbahs` exists with the repository column/default/nullability contract; `date` UNIQUE; Friday-date CHECK; PK on `id`; RLS enabled; policy `Public read published Friday khutbahs` is SELECT for `anon, authenticated` using `published = true`; `anon`/`authenticated` have SELECT only; `service_role` has full table privileges. Current row count was `1`. | Semantically eligible for later consideration, but **no history repair is authorized in Wave 1 without the separate gate**. |
| `20260831080500_security_rate_limits` | **EXACTLY APPLIED** (semantic state; history absent) | Table exists with matching columns/defaults/nullability, PK and three CHECK constraints; `security_rate_limits_updated_at_idx` exists; RLS enabled; no direct table grants to `anon`, `authenticated`, or `service_role`; `consume_security_rate_limit(text,text,integer,integer)` exists, owner `postgres`, SECURITY DEFINER, fixed `search_path=public, pg_temp`, EXECUTE denied to `anon`/`authenticated`, granted to `service_role`; hourly cleanup cron exists, active, schedule `17 * * * *`, deleting rows older than six hours. Current table row count was `1`. | Semantically eligible for later consideration, but **no history repair is authorized in Wave 1 without the separate gate**. |
| `20260901223000_atomic_push_account_registration` | **EXACTLY APPLIED** (semantic state; history absent) | `register_push_subscription(text,text,text,uuid,uuid,text,text,text,integer)` exists with matching behavior inspected from `pg_get_functiondef`; owner `postgres`; SECURITY DEFINER; fixed `search_path=pg_catalog, public`; EXECUTE denied to `anon`/`authenticated`, granted to `service_role`. Current `push_subscriptions` row count was `11`. | Semantically eligible for later consideration, but **no history repair is authorized in Wave 1 without the separate gate**. |

## Native-delivery-v2 RED evidence

The required pre-fix Production contract was executed read-only against `dbqbzvkleqzbgufllgca` and failed at the first invariant with:

```text
RED: native_prayer_delivery_receipts is missing
```

Independent catalog inspection also confirms both required installation columns are absent.

This is the expected RED state for Task 1.2. It means the missing native-delivery-v2 state must be introduced by a new reconciliation migration rather than by blindly replaying all history-absent repository migrations.

## Reconciliation design constraints derived from current Production

The new reconciliation migration must:

1. preserve every existing `native_prayer_installations` row;
2. add `receipt_v2 boolean not null default false` without rewriting business meaning;
3. add `account_generation integer not null default 0` with a nonnegative CHECK;
4. create `native_prayer_delivery_receipts` with the exact PK/FK/CHECK/default/index contract from `20260823104600_native_delivery_receipts.sql`;
5. enable RLS and keep direct access service-role-only;
6. hard-fail if a pre-existing object with an incompatible type, nullability, default, constraint, key, privilege, or index shape is encountered;
7. be safe to run after a clean repository bootstrap where `20260823104600_native_delivery_receipts.sql` has already created the intended state;
8. make no changes to `friday_khutbahs`, `security_rate_limits`, `register_push_subscription`, Auth configuration, migration history, or unrelated Production data.

## Data-preservation baseline

Read-only counts at evidence capture:

- `native_prayer_installations`: `0`
- `friday_khutbahs`: `1`
- `security_rate_limits`: `1`
- `push_subscriptions`: `11`

The reconciliation scope touches only the native-installation table and the new delivery-receipt table. It must not modify or delete the Friday, rate-limit, or push-subscription rows above.

## History-repair decision

**No migration-history repair is performed or proposed as part of the reconciliation migration.**

The three semantic-equivalence findings are evidence inputs for a later, separately gated history-repair decision. The native-delivery migration remains explicitly **NOT APPLIED** until the approved new reconciliation migration is proven and applied.
