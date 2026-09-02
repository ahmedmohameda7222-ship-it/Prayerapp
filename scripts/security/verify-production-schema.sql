-- Prayerapp Production Supabase security schema contract.
-- Read-only verifier: this file performs catalog inspection only and raises on drift.
-- Intended invocation:
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f scripts/security/verify-production-schema.sql

DO $$
DECLARE
  v_receipt_rel regclass := to_regclass('public.native_prayer_delivery_receipts');
  v_rate_fn regprocedure := to_regprocedure(
    'public.consume_security_rate_limit(text,text,integer,integer)'
  );
  v_push_fn regprocedure := to_regprocedure(
    'public.register_push_subscription(text,text,text,uuid,uuid,text,text,text,integer)'
  );
BEGIN
  -- Native-delivery-v2 schema. This block is intentionally RED on the pre-reconciliation
  -- Production state captured on 2026-09-02.
  IF v_receipt_rel IS NULL THEN
    RAISE EXCEPTION 'RED: native_prayer_delivery_receipts is missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'native_prayer_installations'
      AND column_name = 'receipt_v2'
      AND data_type = 'boolean'
      AND is_nullable = 'NO'
      AND column_default = 'false'
  ) THEN
    RAISE EXCEPTION 'RED: native_prayer_installations.receipt_v2 contract is missing or incompatible';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'native_prayer_installations'
      AND column_name = 'account_generation'
      AND data_type = 'integer'
      AND is_nullable = 'NO'
      AND column_default = '0'
  ) THEN
    RAISE EXCEPTION 'RED: native_prayer_installations.account_generation contract is missing or incompatible';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class r ON r.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = r.relnamespace
    WHERE n.nspname = 'public'
      AND r.relname = 'native_prayer_installations'
      AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid, true) ~* 'account_generation[^)]*>= 0'
  ) THEN
    RAISE EXCEPTION 'native_prayer_installations.account_generation nonnegative CHECK is missing';
  END IF;

  IF EXISTS (
    SELECT required.column_name
    FROM (
      VALUES
        ('installation_id', 'uuid', 'NO'),
        ('user_id', 'uuid', 'NO'),
        ('event_id', 'text', 'NO'),
        ('kind', 'text', 'NO'),
        ('account_generation', 'integer', 'NO'),
        ('delivered_at', 'timestamp with time zone', 'NO'),
        ('expires_at', 'timestamp with time zone', 'NO'),
        ('created_at', 'timestamp with time zone', 'NO')
    ) AS required(column_name, data_type, is_nullable)
    LEFT JOIN information_schema.columns c
      ON c.table_schema = 'public'
     AND c.table_name = 'native_prayer_delivery_receipts'
     AND c.column_name = required.column_name
     AND c.data_type = required.data_type
     AND c.is_nullable = required.is_nullable
    WHERE c.column_name IS NULL
  ) THEN
    RAISE EXCEPTION 'native_prayer_delivery_receipts column contract is incomplete';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'native_prayer_delivery_receipts'
      AND column_name = 'expires_at'
      AND column_default = '(now() + ''2 days''::interval)'
  ) THEN
    RAISE EXCEPTION 'native_prayer_delivery_receipts.expires_at default is incompatible';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'native_prayer_delivery_receipts'
      AND column_name = 'created_at'
      AND column_default = 'now()'
  ) THEN
    RAISE EXCEPTION 'native_prayer_delivery_receipts.created_at default is incompatible';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    WHERE c.conrelid = v_receipt_rel
      AND c.contype = 'p'
      AND pg_get_constraintdef(c.oid, true) = 'PRIMARY KEY (installation_id, account_generation, event_id)'
  ) THEN
    RAISE EXCEPTION 'native_prayer_delivery_receipts primary key is incompatible';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    WHERE c.conrelid = v_receipt_rel
      AND c.contype = 'f'
      AND pg_get_constraintdef(c.oid, true) ILIKE
        'FOREIGN KEY (installation_id) REFERENCES native_prayer_installations(installation_id) ON DELETE CASCADE'
  ) THEN
    RAISE EXCEPTION 'native_prayer_delivery_receipts installation FK is incompatible';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    WHERE c.conrelid = v_receipt_rel
      AND c.contype = 'f'
      AND pg_get_constraintdef(c.oid, true) ILIKE
        'FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE'
  ) THEN
    RAISE EXCEPTION 'native_prayer_delivery_receipts user FK is incompatible';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    WHERE c.conrelid = v_receipt_rel
      AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid, true) LIKE '%event_id%p2:%[0-9a-f]%64%'
  ) THEN
    RAISE EXCEPTION 'native_prayer_delivery_receipts event_id CHECK is missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    WHERE c.conrelid = v_receipt_rel
      AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid, true) LIKE '%kind%reminder%adhan%'
  ) THEN
    RAISE EXCEPTION 'native_prayer_delivery_receipts kind CHECK is missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    WHERE c.conrelid = v_receipt_rel
      AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid, true) ~* 'account_generation[^)]*>= 0'
  ) THEN
    RAISE EXCEPTION 'native_prayer_delivery_receipts account_generation CHECK is missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    WHERE c.conrelid = v_receipt_rel
      AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid, true) ~* 'expires_at > delivered_at'
  ) THEN
    RAISE EXCEPTION 'native_prayer_delivery_receipts expiry CHECK is missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'native_prayer_delivery_receipts'
      AND indexname = 'native_prayer_delivery_receipts_event_idx'
      AND indexdef LIKE '%(event_id, expires_at, installation_id)%'
  ) THEN
    RAISE EXCEPTION 'native_prayer_delivery_receipts_event_idx is missing or incompatible';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'native_prayer_delivery_receipts'
      AND indexname = 'native_prayer_delivery_receipts_expiry_idx'
      AND indexdef LIKE '%(expires_at)%'
  ) THEN
    RAISE EXCEPTION 'native_prayer_delivery_receipts_expiry_idx is missing or incompatible';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_class r
    JOIN pg_namespace n ON n.oid = r.relnamespace
    WHERE n.nspname = 'public'
      AND r.relname = 'native_prayer_delivery_receipts'
      AND r.relrowsecurity
  ) THEN
    RAISE EXCEPTION 'native_prayer_delivery_receipts RLS is not enabled';
  END IF;

  IF has_table_privilege('anon', v_receipt_rel, 'SELECT')
    OR has_table_privilege('anon', v_receipt_rel, 'INSERT')
    OR has_table_privilege('anon', v_receipt_rel, 'UPDATE')
    OR has_table_privilege('anon', v_receipt_rel, 'DELETE')
    OR has_table_privilege('authenticated', v_receipt_rel, 'SELECT')
    OR has_table_privilege('authenticated', v_receipt_rel, 'INSERT')
    OR has_table_privilege('authenticated', v_receipt_rel, 'UPDATE')
    OR has_table_privilege('authenticated', v_receipt_rel, 'DELETE') THEN
    RAISE EXCEPTION 'native_prayer_delivery_receipts is directly accessible to client roles';
  END IF;

  IF NOT has_table_privilege('service_role', v_receipt_rel, 'SELECT')
    OR NOT has_table_privilege('service_role', v_receipt_rel, 'INSERT')
    OR NOT has_table_privilege('service_role', v_receipt_rel, 'UPDATE')
    OR NOT has_table_privilege('service_role', v_receipt_rel, 'DELETE') THEN
    RAISE EXCEPTION 'service_role lacks required native_prayer_delivery_receipts privileges';
  END IF;

  -- Friday V2 semantic-equivalence assertions.
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'jumuah_times'
      AND column_name = 'khutbah_time'
      AND is_nullable = 'YES'
  ) THEN
    RAISE EXCEPTION 'jumuah_times.khutbah_time must be nullable';
  END IF;

  IF to_regclass('public.friday_khutbahs') IS NULL THEN
    RAISE EXCEPTION 'friday_khutbahs is missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'friday_khutbahs'
      AND policyname = 'Public read published Friday khutbahs'
      AND cmd = 'SELECT'
      AND roles = ARRAY['anon','authenticated']::name[]
      AND qual = '(published = true)'
  ) THEN
    RAISE EXCEPTION 'friday_khutbahs published-read policy is incompatible';
  END IF;

  IF NOT has_table_privilege('anon', 'public.friday_khutbahs', 'SELECT')
    OR has_table_privilege('anon', 'public.friday_khutbahs', 'INSERT')
    OR has_table_privilege('anon', 'public.friday_khutbahs', 'UPDATE')
    OR has_table_privilege('anon', 'public.friday_khutbahs', 'DELETE')
    OR NOT has_table_privilege('authenticated', 'public.friday_khutbahs', 'SELECT')
    OR has_table_privilege('authenticated', 'public.friday_khutbahs', 'INSERT')
    OR has_table_privilege('authenticated', 'public.friday_khutbahs', 'UPDATE')
    OR has_table_privilege('authenticated', 'public.friday_khutbahs', 'DELETE') THEN
    RAISE EXCEPTION 'friday_khutbahs client grants are incompatible';
  END IF;

  -- Durable rate limiter semantic-equivalence assertions.
  IF to_regclass('public.security_rate_limits') IS NULL THEN
    RAISE EXCEPTION 'security_rate_limits is missing';
  END IF;

  IF v_rate_fn IS NULL THEN
    RAISE EXCEPTION 'consume_security_rate_limit is missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    WHERE p.oid = v_rate_fn
      AND p.prosecdef
      AND p.proconfig @> ARRAY['search_path=public, pg_temp']::text[]
      AND pg_get_userbyid(p.proowner) = 'postgres'
  ) THEN
    RAISE EXCEPTION 'consume_security_rate_limit security-definer/search_path/owner contract is incompatible';
  END IF;

  IF has_function_privilege('anon', v_rate_fn, 'EXECUTE')
    OR has_function_privilege('authenticated', v_rate_fn, 'EXECUTE')
    OR NOT has_function_privilege('service_role', v_rate_fn, 'EXECUTE') THEN
    RAISE EXCEPTION 'consume_security_rate_limit EXECUTE grants are incompatible';
  END IF;

  IF has_table_privilege('anon', 'public.security_rate_limits', 'SELECT')
    OR has_table_privilege('authenticated', 'public.security_rate_limits', 'SELECT')
    OR has_table_privilege('service_role', 'public.security_rate_limits', 'SELECT') THEN
    RAISE EXCEPTION 'security_rate_limits must not expose direct application-role table access';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM cron.job
    WHERE jobname = 'security-rate-limits-cleanup-hourly'
      AND active
      AND schedule = '17 * * * *'
      AND command ~* 'delete[[:space:]]+from[[:space:]]+public\.security_rate_limits'
      AND command ~* 'updated_at[[:space:]]*<[[:space:]]*now\(\)[[:space:]]*-[[:space:]]*interval[[:space:]]+''6 hours'''
  ) THEN
    RAISE EXCEPTION 'security-rate-limits-cleanup-hourly cron contract is incompatible';
  END IF;

  -- Atomic push-registration semantic-equivalence assertions.
  IF v_push_fn IS NULL THEN
    RAISE EXCEPTION 'register_push_subscription is missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    WHERE p.oid = v_push_fn
      AND p.prosecdef
      AND p.proconfig @> ARRAY['search_path=pg_catalog, public']::text[]
      AND pg_get_userbyid(p.proowner) = 'postgres'
  ) THEN
    RAISE EXCEPTION 'register_push_subscription security-definer/search_path/owner contract is incompatible';
  END IF;

  IF has_function_privilege('anon', v_push_fn, 'EXECUTE')
    OR has_function_privilege('authenticated', v_push_fn, 'EXECUTE')
    OR NOT has_function_privilege('service_role', v_push_fn, 'EXECUTE') THEN
    RAISE EXCEPTION 'register_push_subscription EXECUTE grants are incompatible';
  END IF;
END
$$;

SELECT 'PASS: Production Supabase security schema contract is satisfied' AS result;
