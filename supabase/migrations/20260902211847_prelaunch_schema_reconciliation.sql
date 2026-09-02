-- Pre-launch security reconciliation for Production schema drift after 20260822201832.
-- Scope is intentionally limited to the native-delivery-v2 schema that is absent in Production.
-- Later repository migrations whose semantic state already exists are not replayed here.
-- This migration is additive and fail-closed: unknown partial constraints are never dropped.

do $$
declare
  v_type text;
  v_nullable text;
  v_default text;
  v_receipts regclass := to_regclass('public.native_prayer_delivery_receipts');
begin
  if to_regclass('public.native_prayer_installations') is null then
    raise exception 'native_prayer_installations must exist before prelaunch reconciliation';
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'native_prayer_installations'
      and column_name = 'receipt_v2'
  ) then
    select data_type, is_nullable, column_default
      into v_type, v_nullable, v_default
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'native_prayer_installations'
      and column_name = 'receipt_v2';

    if v_type <> 'boolean' or v_nullable <> 'NO' or v_default <> 'false' then
      raise exception
        'incompatible native_prayer_installations.receipt_v2: type=%, nullable=%, default=%',
        v_type, v_nullable, v_default;
    end if;
  end if;

  -- The repository authority defines receipt_v2 without any CHECK constraint.
  -- Do not silently preserve an unknown stricter or contradictory partial schema.
  if exists (
    select 1
    from pg_constraint c
    where c.conrelid = 'public.native_prayer_installations'::regclass
      and c.contype = 'c'
      and lower(pg_get_expr(c.conbin, c.conrelid)) like '%receipt_v2%'
  ) then
    raise exception 'incompatible pre-existing receipt_v2 constraint';
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'native_prayer_installations'
      and column_name = 'account_generation'
  ) then
    select data_type, is_nullable, column_default
      into v_type, v_nullable, v_default
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'native_prayer_installations'
      and column_name = 'account_generation';

    if v_type <> 'integer' or v_nullable <> 'NO' or v_default <> '0' then
      raise exception
        'incompatible native_prayer_installations.account_generation: type=%, nullable=%, default=%',
        v_type, v_nullable, v_default;
    end if;
  end if;

  -- account_generation is allowed to have only the authority-equivalent >= 0 CHECK.
  -- Any other CHECK mentioning the field must fail before any reconciliation DDL runs.
  if exists (
    select 1
    from pg_constraint c
    where c.conrelid = 'public.native_prayer_installations'::regclass
      and c.contype = 'c'
      and lower(pg_get_expr(c.conbin, c.conrelid)) like '%account_generation%'
      and regexp_replace(lower(pg_get_expr(c.conbin, c.conrelid)), '[[:space:]]+', '', 'g')
        not in ('(account_generation>=0)', 'account_generation>=0')
  ) then
    raise exception 'incompatible pre-existing account_generation constraint';
  end if;

  -- If the receipt table already exists, require the complete expected contract before
  -- making any privilege/RLS/index adjustment. This prevents silently normalizing an
  -- unknown partial object into something that merely looks compatible afterward.
  if v_receipts is not null then
    if (
      select count(*)
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'native_prayer_delivery_receipts'
    ) <> 8 then
      raise exception 'pre-existing native_prayer_delivery_receipts has unexpected columns';
    end if;

    if exists (
      select required.column_name
      from (
        values
          ('installation_id', 'uuid', 'NO'),
          ('user_id', 'uuid', 'NO'),
          ('event_id', 'text', 'NO'),
          ('kind', 'text', 'NO'),
          ('account_generation', 'integer', 'NO'),
          ('delivered_at', 'timestamp with time zone', 'NO'),
          ('expires_at', 'timestamp with time zone', 'NO'),
          ('created_at', 'timestamp with time zone', 'NO')
      ) as required(column_name, data_type, is_nullable)
      left join information_schema.columns c
        on c.table_schema = 'public'
       and c.table_name = 'native_prayer_delivery_receipts'
       and c.column_name = required.column_name
       and c.data_type = required.data_type
       and c.is_nullable = required.is_nullable
      where c.column_name is null
    ) then
      raise exception 'pre-existing native_prayer_delivery_receipts column contract is incompatible';
    end if;

    if not exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'native_prayer_delivery_receipts'
        and column_name = 'expires_at'
        and column_default = '(now() + ''2 days''::interval)'
    ) or not exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'native_prayer_delivery_receipts'
        and column_name = 'created_at'
        and column_default = 'now()'
    ) then
      raise exception 'pre-existing native_prayer_delivery_receipts defaults are incompatible';
    end if;

    if not exists (
      select 1
      from pg_constraint c
      where c.conrelid = v_receipts
        and c.contype = 'p'
        and pg_get_constraintdef(c.oid, true) =
          'PRIMARY KEY (installation_id, account_generation, event_id)'
    ) then
      raise exception 'pre-existing native_prayer_delivery_receipts primary key is incompatible';
    end if;

    if not exists (
      select 1
      from pg_constraint c
      where c.conrelid = v_receipts
        and c.contype = 'f'
        and pg_get_constraintdef(c.oid, true) ilike
          'FOREIGN KEY (installation_id) REFERENCES native_prayer_installations(installation_id) ON DELETE CASCADE'
    ) or not exists (
      select 1
      from pg_constraint c
      where c.conrelid = v_receipts
        and c.contype = 'f'
        and pg_get_constraintdef(c.oid, true) ilike
          'FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE'
    ) then
      raise exception 'pre-existing native_prayer_delivery_receipts foreign keys are incompatible';
    end if;

    if (
      select count(*)
      from pg_constraint c
      where c.conrelid = v_receipts
        and c.contype = 'c'
    ) <> 4
      or not exists (
        select 1 from pg_constraint c
        where c.conrelid = v_receipts
          and c.contype = 'c'
          and pg_get_constraintdef(c.oid, true) ~ 'event_id.*p2:.*0-9a-f.*64'
      )
      or not exists (
        select 1 from pg_constraint c
        where c.conrelid = v_receipts
          and c.contype = 'c'
          and pg_get_constraintdef(c.oid, true) ~ 'kind.*reminder.*adhan'
      )
      or not exists (
        select 1 from pg_constraint c
        where c.conrelid = v_receipts
          and c.contype = 'c'
          and pg_get_constraintdef(c.oid, true) ~ 'account_generation.*>= 0'
      )
      or not exists (
        select 1 from pg_constraint c
        where c.conrelid = v_receipts
          and c.contype = 'c'
          and pg_get_constraintdef(c.oid, true) ~ 'expires_at > delivered_at'
      ) then
      raise exception 'pre-existing native_prayer_delivery_receipts CHECK constraints are incompatible';
    end if;

    if not exists (
      select 1 from pg_indexes
      where schemaname = 'public'
        and tablename = 'native_prayer_delivery_receipts'
        and indexname = 'native_prayer_delivery_receipts_event_idx'
        and indexdef like '%(event_id, expires_at, installation_id)%'
    ) or not exists (
      select 1 from pg_indexes
      where schemaname = 'public'
        and tablename = 'native_prayer_delivery_receipts'
        and indexname = 'native_prayer_delivery_receipts_expiry_idx'
        and indexdef like '%(expires_at)%'
    ) then
      raise exception 'pre-existing native_prayer_delivery_receipts indexes are incompatible';
    end if;

    if not exists (
      select 1
      from pg_class r
      join pg_namespace n on n.oid = r.relnamespace
      where n.nspname = 'public'
        and r.relname = 'native_prayer_delivery_receipts'
        and r.relrowsecurity
    ) then
      raise exception 'pre-existing native_prayer_delivery_receipts must already have RLS enabled';
    end if;

    if has_table_privilege('anon', v_receipts, 'SELECT')
      or has_table_privilege('anon', v_receipts, 'INSERT')
      or has_table_privilege('anon', v_receipts, 'UPDATE')
      or has_table_privilege('anon', v_receipts, 'DELETE')
      or has_table_privilege('authenticated', v_receipts, 'SELECT')
      or has_table_privilege('authenticated', v_receipts, 'INSERT')
      or has_table_privilege('authenticated', v_receipts, 'UPDATE')
      or has_table_privilege('authenticated', v_receipts, 'DELETE')
      or not has_table_privilege('service_role', v_receipts, 'SELECT')
      or not has_table_privilege('service_role', v_receipts, 'INSERT')
      or not has_table_privilege('service_role', v_receipts, 'UPDATE')
      or not has_table_privilege('service_role', v_receipts, 'DELETE') then
      raise exception 'pre-existing native_prayer_delivery_receipts privileges are incompatible';
    end if;
  end if;
end
$$;

alter table public.native_prayer_installations
  add column if not exists receipt_v2 boolean not null default false;

alter table public.native_prayer_installations
  add column if not exists account_generation integer not null default 0;

do $$
begin
  if not exists (
    select 1
    from pg_constraint c
    where c.conrelid = 'public.native_prayer_installations'::regclass
      and c.contype = 'c'
      and regexp_replace(lower(pg_get_expr(c.conbin, c.conrelid)), '[[:space:]]+', '', 'g')
        in ('(account_generation>=0)', 'account_generation>=0')
  ) then
    alter table public.native_prayer_installations
      add constraint native_prayer_installations_account_generation_nonnegative_check
      check (account_generation >= 0);
  end if;
end
$$;

create table if not exists public.native_prayer_delivery_receipts (
  installation_id uuid not null
    references public.native_prayer_installations(installation_id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  event_id text not null check (event_id ~ '^p2:[0-9a-f]{64}$'),
  kind text not null check (kind in ('reminder', 'adhan')),
  account_generation integer not null check (account_generation >= 0),
  delivered_at timestamptz not null,
  expires_at timestamptz not null default (now() + interval '2 days'),
  created_at timestamptz not null default now(),
  primary key (installation_id, account_generation, event_id),
  check (expires_at > delivered_at)
);

create index if not exists native_prayer_delivery_receipts_event_idx
  on public.native_prayer_delivery_receipts(event_id, expires_at, installation_id);

create index if not exists native_prayer_delivery_receipts_expiry_idx
  on public.native_prayer_delivery_receipts(expires_at);

alter table public.native_prayer_delivery_receipts enable row level security;

revoke all on public.native_prayer_delivery_receipts from public, anon, authenticated;
grant all on public.native_prayer_delivery_receipts to service_role;

comment on table public.native_prayer_delivery_receipts is
  'Short-retention server-only proof of successful native prayer delivery. No client role has direct access.';

do $$
declare
  v_receipts regclass := to_regclass('public.native_prayer_delivery_receipts');
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'native_prayer_installations'
      and column_name = 'receipt_v2'
      and data_type = 'boolean'
      and is_nullable = 'NO'
      and column_default = 'false'
  ) then
    raise exception 'post-reconciliation receipt_v2 contract is not satisfied';
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'native_prayer_installations'
      and column_name = 'account_generation'
      and data_type = 'integer'
      and is_nullable = 'NO'
      and column_default = '0'
  ) or not exists (
    select 1
    from pg_constraint c
    where c.conrelid = 'public.native_prayer_installations'::regclass
      and c.contype = 'c'
      and regexp_replace(lower(pg_get_expr(c.conbin, c.conrelid)), '[[:space:]]+', '', 'g')
        in ('(account_generation>=0)', 'account_generation>=0')
  ) then
    raise exception 'post-reconciliation account_generation contract is not satisfied';
  end if;

  if v_receipts is null then
    raise exception 'post-reconciliation native_prayer_delivery_receipts is missing';
  end if;

  if exists (
    select required.column_name
    from (
      values
        ('installation_id', 'uuid', 'NO'),
        ('user_id', 'uuid', 'NO'),
        ('event_id', 'text', 'NO'),
        ('kind', 'text', 'NO'),
        ('account_generation', 'integer', 'NO'),
        ('delivered_at', 'timestamp with time zone', 'NO'),
        ('expires_at', 'timestamp with time zone', 'NO'),
        ('created_at', 'timestamp with time zone', 'NO')
    ) as required(column_name, data_type, is_nullable)
    left join information_schema.columns c
      on c.table_schema = 'public'
     and c.table_name = 'native_prayer_delivery_receipts'
     and c.column_name = required.column_name
     and c.data_type = required.data_type
     and c.is_nullable = required.is_nullable
    where c.column_name is null
  ) then
    raise exception 'post-reconciliation native_prayer_delivery_receipts columns are incomplete';
  end if;

  if not exists (
    select 1 from pg_constraint c
    where c.conrelid = v_receipts
      and c.contype = 'p'
      and pg_get_constraintdef(c.oid, true) =
        'PRIMARY KEY (installation_id, account_generation, event_id)'
  ) or not exists (
    select 1 from pg_constraint c
    where c.conrelid = v_receipts
      and c.contype = 'f'
      and pg_get_constraintdef(c.oid, true) ilike
        'FOREIGN KEY (installation_id) REFERENCES native_prayer_installations(installation_id) ON DELETE CASCADE'
  ) or not exists (
    select 1 from pg_constraint c
    where c.conrelid = v_receipts
      and c.contype = 'f'
      and pg_get_constraintdef(c.oid, true) ilike
        'FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE'
  ) then
    raise exception 'post-reconciliation native_prayer_delivery_receipts key contract is incompatible';
  end if;

  if (
    select count(*)
    from pg_constraint c
    where c.conrelid = v_receipts
      and c.contype = 'c'
  ) <> 4 then
    raise exception 'post-reconciliation native_prayer_delivery_receipts CHECK count is incompatible';
  end if;

  if not exists (
    select 1
    from pg_class r
    join pg_namespace n on n.oid = r.relnamespace
    where n.nspname = 'public'
      and r.relname = 'native_prayer_delivery_receipts'
      and r.relrowsecurity
  ) then
    raise exception 'post-reconciliation native_prayer_delivery_receipts RLS is not enabled';
  end if;

  if has_table_privilege('anon', v_receipts, 'SELECT')
    or has_table_privilege('anon', v_receipts, 'INSERT')
    or has_table_privilege('anon', v_receipts, 'UPDATE')
    or has_table_privilege('anon', v_receipts, 'DELETE')
    or has_table_privilege('authenticated', v_receipts, 'SELECT')
    or has_table_privilege('authenticated', v_receipts, 'INSERT')
    or has_table_privilege('authenticated', v_receipts, 'UPDATE')
    or has_table_privilege('authenticated', v_receipts, 'DELETE')
    or not has_table_privilege('service_role', v_receipts, 'SELECT')
    or not has_table_privilege('service_role', v_receipts, 'INSERT')
    or not has_table_privilege('service_role', v_receipts, 'UPDATE')
    or not has_table_privilege('service_role', v_receipts, 'DELETE') then
    raise exception 'post-reconciliation native_prayer_delivery_receipts privileges are incompatible';
  end if;
end
$$;
