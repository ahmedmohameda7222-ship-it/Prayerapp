-- Pre-launch security reconciliation for Production schema drift after 20260822201832.
-- Scope is intentionally limited to the native-delivery-v2 schema that is absent in Production.
-- Later repository migrations whose semantic state already exists are not replayed here.

DO $$
DECLARE
  v_type text;
  v_nullable text;
  v_default text;
  v_receipts regclass := to_regclass('public.native_prayer_delivery_receipts');
BEGIN
  IF to_regclass('public.native_prayer_installations') IS NULL THEN
    RAISE EXCEPTION 'native_prayer_installations must exist before prelaunch reconciliation';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'native_prayer_installations'
      AND column_name = 'receipt_v2'
  ) THEN
    SELECT data_type, is_nullable, column_default
      INTO v_type, v_nullable, v_default
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'native_prayer_installations'
      AND column_name = 'receipt_v2';

    IF v_type <> 'boolean' OR v_nullable <> 'NO' OR v_default <> 'false' THEN
      RAISE EXCEPTION
        'incompatible native_prayer_installations.receipt_v2: type=%, nullable=%, default=%',
        v_type, v_nullable, v_default;
    END IF;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'native_prayer_installations'
      AND column_name = 'account_generation'
  ) THEN
    SELECT data_type, is_nullable, column_default
      INTO v_type, v_nullable, v_default
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'native_prayer_installations'
      AND column_name = 'account_generation';

    IF v_type <> 'integer' OR v_nullable <> 'NO' OR v_default <> '0' THEN
      RAISE EXCEPTION
        'incompatible native_prayer_installations.account_generation: type=%, nullable=%, default=%',
        v_type, v_nullable, v_default;
    END IF;
  END IF;

  -- If the receipt table already exists, require the complete expected contract before
  -- making any privilege/RLS/index adjustment. This prevents silently normalizing an
  -- unknown partial object into something that merely looks compatible afterward.
  IF v_receipts IS NOT NULL THEN
    IF (
      SELECT count(*)
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'native_prayer_delivery_receipts'
    ) <> 8 THEN
      RAISE EXCEPTION 'pre-existing native_prayer_delivery_receipts has unexpected columns';
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
      RAISE EXCEPTION 'pre-existing native_prayer_delivery_receipts column contract is incompatible';
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'native_prayer_delivery_receipts'
        AND column_name = 'expires_at'
        AND column_default = '(now() + ''2 days''::interval)'
    ) OR NOT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'native_prayer_delivery_receipts'
        AND column_name = 'created_at'
        AND column_default = 'now()'
    ) THEN
      RAISE EXCEPTION 'pre-existing native_prayer_delivery_receipts defaults are incompatible';
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint c
      WHERE c.conrelid = v_receipts
        AND c.contype = 'p'
        AND pg_get_constraintdef(c.oid, true) =
          'PRIMARY KEY (installation_id, account_generation, event_id)'
    ) THEN
      RAISE EXCEPTION 'pre-existing native_prayer_delivery_receipts primary key is incompatible';
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint c
      WHERE c.conrelid = v_receipts
        AND c.contype = 'f'
        AND pg_get_constraintdef(c.oid, true) ILIKE
          'FOREIGN KEY (installation_id) REFERENCES native_prayer_installations(installation_id) ON DELETE CASCADE'
    ) OR NOT EXISTS (
      SELECT 1
      FROM pg_constraint c
      WHERE c.conrelid = v_receipts
        AND c.contype = 'f'
        AND pg_get_constraintdef(c.oid, true) ILIKE
          'FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE'
    ) THEN
      RAISE EXCEPTION 'pre-existing native_prayer_delivery_receipts foreign keys are incompatible';
    END IF;

    IF (
      SELECT count(*)
      FROM pg_constraint c
      WHERE c.conrelid = v_receipts
        AND c.contype = 'c'
    ) <> 4
      OR NOT EXISTS (
        SELECT 1 FROM pg_constraint c
        WHERE c.conrelid = v_receipts
          AND c.contype = 'c'
          AND pg_get_constraintdef(c.oid, true) ~ 'event_id.*p2:.*0-9a-f.*64'
      )
      OR NOT EXISTS (
        SELECT 1 FROM pg_constraint c
        WHERE c.conrelid = v_receipts
          AND c.contype = 'c'
          AND pg_get_constraintdef(c.oid, true) ~ 'kind.*reminder.*adhan'
      )
      OR NOT EXISTS (
        SELECT 1 FROM pg_constraint c
        WHERE c.conrelid = v_receipts
          AND c.contype = 'c'
          AND pg_get_constraintdef(c.oid, true) ~ 'account_generation.*>= 0'
      )
      OR NOT EXISTS (
        SELECT 1 FROM pg_constraint c
        WHERE c.conrelid = v_receipts
          AND c.contype = 'c'
          AND pg_get_constraintdef(c.oid, true) ~ 'expires_at > delivered_at'
      ) THEN
      RAISE EXCEPTION 'pre-existing native_prayer_delivery_receipts CHECK constraints are incompatible';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_indexes
      WHERE schemaname = 'public'
        AND tablename = 'native_prayer_delivery_receipts'
        AND indexname = 'native_prayer_delivery_receipts_event_idx'
        AND indexdef LIKE '%(event_id, expires_at, installation_id)%'
    ) OR NOT EXISTS (
      SELECT 1 FROM pg_indexes
      WHERE schemaname = 'public'
        AND tablename = 'native_prayer_delivery_receipts'
        AND indexname = 'native_prayer_delivery_receipts_expiry_idx'
        AND indexdef LIKE '%(expires_at)%'
    ) THEN
      RAISE EXCEPTION 'pre-existing native_prayer_delivery_receipts indexes are incompatible';
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_class r
      JOIN pg_namespace n ON n.oid = r.relnamespace
      WHERE n.nspname = 'public'
        AND r.relname = 'native_prayer_delivery_receipts'
        AND r.relrowsecurity
    ) THEN
      RAISE EXCEPTION 'pre-existing native_prayer_delivery_receipts must already have RLS enabled';
    END IF;

    IF has_table_privilege('anon', v_receipts, 'SELECT')
      OR has_table_privilege('anon', v_receipts, 'INSERT')
      OR has_table_privilege('anon', v_receipts, 'UPDATE')
      OR has_table_privilege('anon', v_receipts, 'DELETE')
      OR has_table_privilege('authenticated', v_receipts, 'SELECT')
      OR has_table_privilege('authenticated', v_receipts, 'INSERT')
      OR has_table_privilege('authenticated', v_receipts, 'UPDATE')
      OR has_table_privilege('authenticated', v_receipts, 'DELETE')
      OR NOT has_table_privilege('service_role', v_receipts, 'SELECT')
      OR NOT has_table_privilege('service_role', v_receipts, 'INSERT')
      OR NOT has_table_privilege('service_role', v_receipts, 'UPDATE')
      OR NOT has_table_privilege('service_role', v_receipts, 'DELETE') THEN
      RAISE EXCEPTION 'pre-existing native_prayer_delivery_receipts privileges are incompatible';
    END IF;
  END IF;
END
$$;

ALTER TABLE public.native_prayer_installations
  ADD COLUMN IF NOT EXISTS receipt_v2 boolean NOT NULL DEFAULT false;

ALTER TABLE public.native_prayer_installations
  ADD COLUMN IF NOT EXISTS account_generation integer NOT NULL DEFAULT 0;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class r ON r.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = r.relnamespace
    WHERE n.nspname = 'public'
      AND r.relname = 'native_prayer_installations'
      AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid, true) ~ 'account_generation.*>= 0'
  ) THEN
    ALTER TABLE public.native_prayer_installations
      ADD CONSTRAINT native_prayer_installations_account_generation_nonnegative_check
      CHECK (account_generation >= 0);
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS public.native_prayer_delivery_receipts (
  installation_id uuid NOT NULL
    REFERENCES public.native_prayer_installations(installation_id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id text NOT NULL CHECK (event_id ~ '^p2:[0-9a-f]{64}$'),
  kind text NOT NULL CHECK (kind IN ('reminder', 'adhan')),
  account_generation integer NOT NULL CHECK (account_generation >= 0),
  delivered_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '2 days'),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (installation_id, account_generation, event_id),
  CHECK (expires_at > delivered_at)
);

CREATE INDEX IF NOT EXISTS native_prayer_delivery_receipts_event_idx
  ON public.native_prayer_delivery_receipts(event_id, expires_at, installation_id);

CREATE INDEX IF NOT EXISTS native_prayer_delivery_receipts_expiry_idx
  ON public.native_prayer_delivery_receipts(expires_at);

ALTER TABLE public.native_prayer_delivery_receipts ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.native_prayer_delivery_receipts FROM public, anon, authenticated;
GRANT ALL ON public.native_prayer_delivery_receipts TO service_role;

COMMENT ON TABLE public.native_prayer_delivery_receipts IS
  'Short-retention server-only proof of successful native prayer delivery. No client role has direct access.';

DO $$
DECLARE
  v_receipts regclass := to_regclass('public.native_prayer_delivery_receipts');
BEGIN
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
    RAISE EXCEPTION 'post-reconciliation receipt_v2 contract is not satisfied';
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
  ) OR NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class r ON r.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = r.relnamespace
    WHERE n.nspname = 'public'
      AND r.relname = 'native_prayer_installations'
      AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid, true) ~ 'account_generation.*>= 0'
  ) THEN
    RAISE EXCEPTION 'post-reconciliation account_generation contract is not satisfied';
  END IF;

  IF v_receipts IS NULL THEN
    RAISE EXCEPTION 'post-reconciliation native_prayer_delivery_receipts is missing';
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
    RAISE EXCEPTION 'post-reconciliation native_prayer_delivery_receipts columns are incomplete';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    WHERE c.conrelid = v_receipts
      AND c.contype = 'p'
      AND pg_get_constraintdef(c.oid, true) =
        'PRIMARY KEY (installation_id, account_generation, event_id)'
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    WHERE c.conrelid = v_receipts
      AND c.contype = 'f'
      AND pg_get_constraintdef(c.oid, true) ILIKE
        'FOREIGN KEY (installation_id) REFERENCES native_prayer_installations(installation_id) ON DELETE CASCADE'
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    WHERE c.conrelid = v_receipts
      AND c.contype = 'f'
      AND pg_get_constraintdef(c.oid, true) ILIKE
        'FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE'
  ) THEN
    RAISE EXCEPTION 'post-reconciliation native_prayer_delivery_receipts key contract is incompatible';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_class r
    JOIN pg_namespace n ON n.oid = r.relnamespace
    WHERE n.nspname = 'public'
      AND r.relname = 'native_prayer_delivery_receipts'
      AND r.relrowsecurity
  ) THEN
    RAISE EXCEPTION 'post-reconciliation native_prayer_delivery_receipts RLS is not enabled';
  END IF;

  IF has_table_privilege('anon', v_receipts, 'SELECT')
    OR has_table_privilege('anon', v_receipts, 'INSERT')
    OR has_table_privilege('anon', v_receipts, 'UPDATE')
    OR has_table_privilege('anon', v_receipts, 'DELETE')
    OR has_table_privilege('authenticated', v_receipts, 'SELECT')
    OR has_table_privilege('authenticated', v_receipts, 'INSERT')
    OR has_table_privilege('authenticated', v_receipts, 'UPDATE')
    OR has_table_privilege('authenticated', v_receipts, 'DELETE')
    OR NOT has_table_privilege('service_role', v_receipts, 'SELECT')
    OR NOT has_table_privilege('service_role', v_receipts, 'INSERT')
    OR NOT has_table_privilege('service_role', v_receipts, 'UPDATE')
    OR NOT has_table_privilege('service_role', v_receipts, 'DELETE') THEN
    RAISE EXCEPTION 'post-reconciliation native_prayer_delivery_receipts privileges are incompatible';
  END IF;
END
$$;
