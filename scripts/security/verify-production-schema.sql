-- Prayerapp Production Supabase security schema contract.
-- Read-only verifier: catalog inspection only; raises on semantic drift.
-- Intended invocation:
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f scripts/security/verify-production-schema.sql

do $$
declare
  v_receipt_rel regclass := to_regclass('public.native_prayer_delivery_receipts');
  v_friday_rel regclass := to_regclass('public.friday_khutbahs');
  v_rate_rel regclass := to_regclass('public.security_rate_limits');
  v_rate_fn regprocedure := to_regprocedure(
    'public.consume_security_rate_limit(text,text,integer,integer)'
  );
  v_push_fn regprocedure := to_regprocedure(
    'public.register_push_subscription(text,text,text,uuid,uuid,text,text,text,integer)'
  );
  v_rate_src text;
  v_push_src text;
  v_cron_command text;
  v_expected_cron text;
begin
  -- Native-delivery-v2 contract. This remains intentionally RED until reconciliation
  -- is applied to the pre-remediation Production state.
  if v_receipt_rel is null then
    raise exception 'RED: native_prayer_delivery_receipts is missing';
  end if;

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
    raise exception 'native_prayer_installations.receipt_v2 contract is missing or incompatible';
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
  ) then
    raise exception 'native_prayer_installations.account_generation contract is missing or incompatible';
  end if;

  if not exists (
    select 1
    from pg_constraint c
    where c.conrelid = 'public.native_prayer_installations'::regclass
      and c.contype = 'c'
      and regexp_replace(lower(pg_get_expr(c.conbin, c.conrelid)), '[[:space:]]+', '', 'g')
        in ('(account_generation>=0)', 'account_generation>=0')
  ) then
    raise exception 'native_prayer_installations.account_generation nonnegative CHECK is missing';
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
  ) or (
    select count(*) from information_schema.columns
    where table_schema = 'public' and table_name = 'native_prayer_delivery_receipts'
  ) <> 8 then
    raise exception 'native_prayer_delivery_receipts column contract is incomplete';
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'native_prayer_delivery_receipts'
      and column_name = 'expires_at'
      and column_default = '(now() + ''2 days''::interval)'
  ) or not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'native_prayer_delivery_receipts'
      and column_name = 'created_at'
      and column_default = 'now()'
  ) then
    raise exception 'native_prayer_delivery_receipts defaults are incompatible';
  end if;

  if not exists (
    select 1 from pg_constraint c
    where c.conrelid = v_receipt_rel
      and c.contype = 'p'
      and pg_get_constraintdef(c.oid, true) =
        'PRIMARY KEY (installation_id, account_generation, event_id)'
  ) then
    raise exception 'native_prayer_delivery_receipts primary key is incompatible';
  end if;

  if not exists (
    select 1 from pg_constraint c
    where c.conrelid = v_receipt_rel
      and c.contype = 'f'
      and pg_get_constraintdef(c.oid, true) ilike
        'FOREIGN KEY (installation_id) REFERENCES native_prayer_installations(installation_id) ON DELETE CASCADE'
  ) then
    raise exception 'native_prayer_delivery_receipts installation FK is incompatible';
  end if;

  if not exists (
    select 1 from pg_constraint c
    where c.conrelid = v_receipt_rel
      and c.contype = 'f'
      and pg_get_constraintdef(c.oid, true) ilike
        'FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE'
  ) then
    raise exception 'native_prayer_delivery_receipts user FK is incompatible';
  end if;

  if (
    select count(*) from pg_constraint c
    where c.conrelid = v_receipt_rel and c.contype = 'c'
  ) <> 4
    or not exists (
      select 1 from pg_constraint c
      where c.conrelid = v_receipt_rel and c.contype = 'c'
        and pg_get_constraintdef(c.oid, true) ~ 'event_id.*p2:.*0-9a-f.*64'
    )
    or not exists (
      select 1 from pg_constraint c
      where c.conrelid = v_receipt_rel and c.contype = 'c'
        and pg_get_constraintdef(c.oid, true) ~ 'kind.*reminder.*adhan'
    )
    or not exists (
      select 1 from pg_constraint c
      where c.conrelid = v_receipt_rel and c.contype = 'c'
        and pg_get_constraintdef(c.oid, true) ~ 'account_generation.*>= 0'
    )
    or not exists (
      select 1 from pg_constraint c
      where c.conrelid = v_receipt_rel and c.contype = 'c'
        and pg_get_constraintdef(c.oid, true) ~ 'expires_at > delivered_at'
    ) then
    raise exception 'native_prayer_delivery_receipts CHECK contract is incompatible';
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
    raise exception 'native_prayer_delivery_receipts index contract is incompatible';
  end if;

  if not exists (
    select 1 from pg_class r join pg_namespace n on n.oid = r.relnamespace
    where n.nspname = 'public'
      and r.relname = 'native_prayer_delivery_receipts'
      and r.relrowsecurity
  ) then
    raise exception 'native_prayer_delivery_receipts RLS is not enabled';
  end if;

  if has_table_privilege('anon', v_receipt_rel, 'SELECT')
    or has_table_privilege('anon', v_receipt_rel, 'INSERT')
    or has_table_privilege('anon', v_receipt_rel, 'UPDATE')
    or has_table_privilege('anon', v_receipt_rel, 'DELETE')
    or has_table_privilege('authenticated', v_receipt_rel, 'SELECT')
    or has_table_privilege('authenticated', v_receipt_rel, 'INSERT')
    or has_table_privilege('authenticated', v_receipt_rel, 'UPDATE')
    or has_table_privilege('authenticated', v_receipt_rel, 'DELETE') then
    raise exception 'native_prayer_delivery_receipts is directly accessible to client roles';
  end if;

  if not has_table_privilege('service_role', v_receipt_rel, 'SELECT')
    or not has_table_privilege('service_role', v_receipt_rel, 'INSERT')
    or not has_table_privilege('service_role', v_receipt_rel, 'UPDATE')
    or not has_table_privilege('service_role', v_receipt_rel, 'DELETE')
    or not has_table_privilege('service_role', v_receipt_rel, 'TRUNCATE')
    or not has_table_privilege('service_role', v_receipt_rel, 'REFERENCES')
    or not has_table_privilege('service_role', v_receipt_rel, 'TRIGGER') then
    raise exception 'service_role lacks required native_prayer_delivery_receipts privileges';
  end if;

  -- Friday V2 semantic equivalence.
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'jumuah_times'
      and column_name = 'khutbah_time'
      and is_nullable = 'YES'
  ) then
    raise exception 'jumuah_times.khutbah_time must be nullable';
  end if;

  if v_friday_rel is null then
    raise exception 'friday_khutbahs is missing';
  end if;

  if (
    select count(*) from information_schema.columns
    where table_schema = 'public' and table_name = 'friday_khutbahs'
  ) <> 13 or exists (
    select required.column_name
    from (
      values
        ('id','uuid','NO','gen_random_uuid()'),
        ('date','date','NO',null),
        ('title_ar','text','YES',null),
        ('content_ar','text','YES',null),
        ('title_en','text','YES',null),
        ('content_en','text','YES',null),
        ('title_de','text','YES',null),
        ('content_de','text','YES',null),
        ('title_tr','text','YES',null),
        ('content_tr','text','YES',null),
        ('published','boolean','NO','false'),
        ('created_at','timestamp with time zone','NO','now()'),
        ('updated_at','timestamp with time zone','NO','now()')
    ) as required(column_name, data_type, is_nullable, column_default)
    left join information_schema.columns c
      on c.table_schema = 'public'
     and c.table_name = 'friday_khutbahs'
     and c.column_name = required.column_name
     and c.data_type = required.data_type
     and c.is_nullable = required.is_nullable
     and c.column_default is not distinct from required.column_default
    where c.column_name is null
  ) then
    raise exception 'friday_khutbahs column contract is incomplete';
  end if;

  if not exists (
    select 1 from pg_constraint c
    where c.conrelid = v_friday_rel and c.contype = 'p'
      and pg_get_constraintdef(c.oid, true) = 'PRIMARY KEY (id)'
  ) then
    raise exception 'friday_khutbahs primary key is incompatible';
  end if;

  if not exists (
    select 1 from pg_constraint c
    where c.conrelid = v_friday_rel and c.contype = 'u'
      and pg_get_constraintdef(c.oid, true) = 'UNIQUE (date)'
  ) then
    raise exception 'friday_khutbahs UNIQUE(date) is missing or incompatible';
  end if;

  if not exists (
    select 1 from pg_constraint c
    where c.conrelid = v_friday_rel and c.contype = 'c'
      and regexp_replace(lower(pg_get_expr(c.conbin, c.conrelid)), '[[:space:]]+', '', 'g')
        in (
          '(extract(isodowfromdate)=5::numeric)',
          '(extract(isodowfromdate)=(5)::numeric)',
          '(extract(isodowfromdate)=5)'
        )
  ) then
    raise exception 'friday_khutbahs Friday-date CHECK is missing or incompatible';
  end if;

  if not exists (
    select 1 from pg_class r
    where r.oid = v_friday_rel and r.relrowsecurity
  ) then
    raise exception 'friday_khutbahs RLS is not enabled';
  end if;

  if (
    select count(*) from pg_policies
    where schemaname = 'public' and tablename = 'friday_khutbahs'
  ) <> 1 or not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'friday_khutbahs'
      and policyname = 'Public read published Friday khutbahs'
      and permissive = 'PERMISSIVE'
      and cmd = 'SELECT'
      and roles @> array['anon','authenticated']::name[]
      and array_length(roles, 1) = 2
      and regexp_replace(lower(qual), '[[:space:]]+', '', 'g') = '(published=true)'
      and with_check is null
  ) then
    raise exception 'friday_khutbahs published-read policy is incompatible';
  end if;

  if not has_table_privilege('anon', v_friday_rel, 'SELECT')
    or has_table_privilege('anon', v_friday_rel, 'INSERT')
    or has_table_privilege('anon', v_friday_rel, 'UPDATE')
    or has_table_privilege('anon', v_friday_rel, 'DELETE')
    or has_table_privilege('anon', v_friday_rel, 'TRUNCATE')
    or has_table_privilege('anon', v_friday_rel, 'REFERENCES')
    or has_table_privilege('anon', v_friday_rel, 'TRIGGER')
    or not has_table_privilege('authenticated', v_friday_rel, 'SELECT')
    or has_table_privilege('authenticated', v_friday_rel, 'INSERT')
    or has_table_privilege('authenticated', v_friday_rel, 'UPDATE')
    or has_table_privilege('authenticated', v_friday_rel, 'DELETE')
    or has_table_privilege('authenticated', v_friday_rel, 'TRUNCATE')
    or has_table_privilege('authenticated', v_friday_rel, 'REFERENCES')
    or has_table_privilege('authenticated', v_friday_rel, 'TRIGGER') then
    raise exception 'friday_khutbahs client grants are incompatible';
  end if;

  if not has_table_privilege('service_role', v_friday_rel, 'SELECT')
    or not has_table_privilege('service_role', v_friday_rel, 'INSERT')
    or not has_table_privilege('service_role', v_friday_rel, 'UPDATE')
    or not has_table_privilege('service_role', v_friday_rel, 'DELETE')
    or not has_table_privilege('service_role', v_friday_rel, 'TRUNCATE')
    or not has_table_privilege('service_role', v_friday_rel, 'REFERENCES')
    or not has_table_privilege('service_role', v_friday_rel, 'TRIGGER') then
    raise exception 'friday_khutbahs service_role grants are incompatible';
  end if;

  -- Durable rate-limit semantic equivalence.
  if v_rate_rel is null then
    raise exception 'security_rate_limits is missing';
  end if;

  if (
    select count(*) from information_schema.columns
    where table_schema = 'public' and table_name = 'security_rate_limits'
  ) <> 5 or exists (
    select required.column_name
    from (
      values
        ('scope','text','NO',null),
        ('identity_hash','text','NO',null),
        ('window_started_at','timestamp with time zone','NO',null),
        ('request_count','integer','NO',null),
        ('updated_at','timestamp with time zone','NO','now()')
    ) as required(column_name, data_type, is_nullable, column_default)
    left join information_schema.columns c
      on c.table_schema = 'public'
     and c.table_name = 'security_rate_limits'
     and c.column_name = required.column_name
     and c.data_type = required.data_type
     and c.is_nullable = required.is_nullable
     and c.column_default is not distinct from required.column_default
    where c.column_name is null
  ) then
    raise exception 'security_rate_limits column contract is incomplete';
  end if;

  if not exists (
    select 1 from pg_constraint c
    where c.conrelid = v_rate_rel and c.contype = 'p'
      and pg_get_constraintdef(c.oid, true) = 'PRIMARY KEY (scope, identity_hash)'
  ) then
    raise exception 'security_rate_limits primary key is incompatible';
  end if;

  if (
    select count(*) from pg_constraint c
    where c.conrelid = v_rate_rel and c.contype = 'c'
  ) <> 3 then
    raise exception 'security_rate_limits CHECK count is incompatible';
  end if;

  if not exists (
    select 1 from pg_constraint c
    where c.conrelid = v_rate_rel and c.contype = 'c'
      and pg_get_constraintdef(c.oid, true) ~ 'scope.*a-z0-9.*0,63'
  ) then
    raise exception 'security_rate_limits scope CHECK is missing or incompatible';
  end if;

  if not exists (
    select 1 from pg_constraint c
    where c.conrelid = v_rate_rel and c.contype = 'c'
      and pg_get_constraintdef(c.oid, true) ~ 'identity_hash.*0-9a-f.*64'
  ) then
    raise exception 'security_rate_limits identity_hash CHECK is missing or incompatible';
  end if;

  if not exists (
    select 1 from pg_constraint c
    where c.conrelid = v_rate_rel and c.contype = 'c'
      and regexp_replace(lower(pg_get_expr(c.conbin, c.conrelid)), '[[:space:]]+', '', 'g')
        in ('(request_count>0)', 'request_count>0')
  ) then
    raise exception 'security_rate_limits request_count CHECK is missing or incompatible';
  end if;

  if not exists (
    select 1 from pg_indexes
    where schemaname = 'public'
      and tablename = 'security_rate_limits'
      and indexname = 'security_rate_limits_updated_at_idx'
      and indexdef like '%(updated_at)%'
  ) then
    raise exception 'security_rate_limits_updated_at_idx is missing or incompatible';
  end if;

  if not exists (
    select 1 from pg_class r where r.oid = v_rate_rel and r.relrowsecurity
  ) then
    raise exception 'security_rate_limits RLS is not enabled';
  end if;

  if has_table_privilege('anon', v_rate_rel, 'SELECT')
    or has_table_privilege('anon', v_rate_rel, 'INSERT')
    or has_table_privilege('anon', v_rate_rel, 'UPDATE')
    or has_table_privilege('anon', v_rate_rel, 'DELETE')
    or has_table_privilege('anon', v_rate_rel, 'TRUNCATE')
    or has_table_privilege('anon', v_rate_rel, 'REFERENCES')
    or has_table_privilege('anon', v_rate_rel, 'TRIGGER')
    or has_table_privilege('authenticated', v_rate_rel, 'SELECT')
    or has_table_privilege('authenticated', v_rate_rel, 'INSERT')
    or has_table_privilege('authenticated', v_rate_rel, 'UPDATE')
    or has_table_privilege('authenticated', v_rate_rel, 'DELETE')
    or has_table_privilege('authenticated', v_rate_rel, 'TRUNCATE')
    or has_table_privilege('authenticated', v_rate_rel, 'REFERENCES')
    or has_table_privilege('authenticated', v_rate_rel, 'TRIGGER')
    or has_table_privilege('service_role', v_rate_rel, 'SELECT')
    or has_table_privilege('service_role', v_rate_rel, 'INSERT')
    or has_table_privilege('service_role', v_rate_rel, 'UPDATE')
    or has_table_privilege('service_role', v_rate_rel, 'DELETE')
    or has_table_privilege('service_role', v_rate_rel, 'TRUNCATE')
    or has_table_privilege('service_role', v_rate_rel, 'REFERENCES')
    or has_table_privilege('service_role', v_rate_rel, 'TRIGGER') then
    raise exception 'security_rate_limits must not expose direct application-role table access';
  end if;

  if v_rate_fn is null then
    raise exception 'consume_security_rate_limit is missing';
  end if;

  if not exists (
    select 1 from pg_proc p join pg_language l on l.oid = p.prolang
    where p.oid = v_rate_fn
      and pg_get_function_identity_arguments(p.oid) =
        'p_scope text, p_identity_hash text, p_limit integer, p_window_seconds integer'
      and pg_get_function_result(p.oid) =
        'TABLE(allowed boolean, remaining integer, retry_after_seconds integer)'
      and l.lanname = 'plpgsql'
  ) then
    raise exception 'consume_security_rate_limit return contract is incompatible';
  end if;

  if not exists (
    select 1 from pg_proc p
    where p.oid = v_rate_fn
      and p.prosecdef
      and p.proconfig = array['search_path=public, pg_temp']::text[]
      and pg_get_userbyid(p.proowner) = 'postgres'
  ) then
    raise exception 'consume_security_rate_limit security-definer/search_path/owner contract is incompatible';
  end if;

  if has_function_privilege('anon', v_rate_fn, 'EXECUTE')
    or has_function_privilege('authenticated', v_rate_fn, 'EXECUTE')
    or not has_function_privilege('service_role', v_rate_fn, 'EXECUTE') then
    raise exception 'consume_security_rate_limit EXECUTE grants are incompatible';
  end if;

  select regexp_replace(lower(p.prosrc), '[[:space:]]+', ' ', 'g')
    into v_rate_src
  from pg_proc p where p.oid = v_rate_fn;

  if position('invalid rate limit parameters' in v_rate_src) = 0
    or position('p_limit > 10000' in v_rate_src) = 0
    or position('p_window_seconds > 3600' in v_rate_src) = 0
    or position('clock_timestamp()' in v_rate_src) = 0
    or position('public.security_rate_limits' in v_rate_src) = 0
    or position('on conflict (scope, identity_hash) do update' in v_rate_src) = 0
    or position('request_count = case' in v_rate_src) = 0
    or position('make_interval(secs => p_window_seconds)' in v_rate_src) = 0
    or position('v_request_count <= p_limit' in v_rate_src) = 0
    or position('retry_after_seconds' in pg_get_function_result(v_rate_fn)) = 0 then
    raise exception 'consume_security_rate_limit implementation semantics are incompatible';
  end if;

  if (
    select count(*) from cron.job
    where jobname = 'security-rate-limits-cleanup-hourly'
  ) <> 1 then
    raise exception 'security-rate-limits-cleanup-hourly cron contract is incompatible';
  end if;

  select regexp_replace(lower(btrim(command, E' \n\r\t')), '[[:space:]]+', ' ', 'g')
    into v_cron_command
  from cron.job
  where jobname = 'security-rate-limits-cleanup-hourly'
    and active
    and schedule = '17 * * * *';

  v_expected_cron := 'delete ' ||
    'from public.security_rate_limits where updated_at < now() - interval ''6 hours'';';

  if v_cron_command is null or v_cron_command <> v_expected_cron then
    raise exception 'security-rate-limits-cleanup-hourly cron contract is incompatible';
  end if;

  -- Atomic push-registration semantic equivalence.
  if v_push_fn is null then
    raise exception 'register_push_subscription is missing';
  end if;

  if not exists (
    select 1 from pg_proc p join pg_language l on l.oid = p.prolang
    where p.oid = v_push_fn
      and pg_get_function_identity_arguments(p.oid) =
        'p_endpoint text, p_p256dh text, p_auth text, p_browser_id uuid, p_user_id uuid, p_locale text, p_user_agent text, p_platform text, p_max_account_subscriptions integer'
      and pg_get_function_result(p.oid) = 'text'
      and l.lanname = 'plpgsql'
  ) then
    raise exception 'register_push_subscription return contract is incompatible';
  end if;

  if not exists (
    select 1 from pg_proc p
    where p.oid = v_push_fn
      and p.prosecdef
      and p.proconfig = array['search_path=pg_catalog, public']::text[]
      and pg_get_userbyid(p.proowner) = 'postgres'
  ) then
    raise exception 'register_push_subscription security-definer/search_path/owner contract is incompatible';
  end if;

  if has_function_privilege('anon', v_push_fn, 'EXECUTE')
    or has_function_privilege('authenticated', v_push_fn, 'EXECUTE')
    or not has_function_privilege('service_role', v_push_fn, 'EXECUTE') then
    raise exception 'register_push_subscription EXECUTE grants are incompatible';
  end if;

  select regexp_replace(lower(p.prosrc), '[[:space:]]+', ' ', 'g')
    into v_push_src
  from pg_proc p where p.oid = v_push_fn;

  if position('push-endpoint:' in v_push_src) = 0
    or position('push-user:' in v_push_src) = 0
    or position('pg_advisory_xact_lock' in v_push_src) = 0
    or position('where endpoint = p_endpoint' in v_push_src) = 0
    or position('for update' in v_push_src) = 0
    or position('ownership_mismatch' in v_push_src) = 0
    or position('v_existing_browser_id <> p_browser_id' in v_push_src) = 0
    or position('v_enabled_count >= p_max_account_subscriptions' in v_push_src) = 0
    or position('account_limit_reached' in v_push_src) = 0
    or position('on conflict (endpoint) do update set' in v_push_src) = 0
    or position('enabled = true' in v_push_src) = 0
    or position('return ''saved''' in v_push_src) = 0 then
    raise exception 'register_push_subscription implementation semantics are incompatible';
  end if;
end
$$;

-- Durable admin-audit semantic equivalence.
do $$
declare
  v_audit_rel regclass := to_regclass('public.audit_logs');
  v_audit_fn regprocedure := to_regprocedure(
    'public.append_admin_audit_event(uuid,text,text,text,text,text,jsonb,text)'
  );
  v_audit_src text;
begin
  if v_audit_rel is null then
    raise exception 'audit_logs is missing';
  end if;

  if (
    select count(*) from information_schema.columns
    where table_schema = 'public' and table_name = 'audit_logs'
  ) <> 10 or exists (
    select required.column_name
    from (
      values
        ('id','uuid','NO','gen_random_uuid()'),
        ('actor','text','NO',null),
        ('action','text','NO',null),
        ('entity_type','text','YES',null),
        ('entity_id','text','YES',null),
        ('created_at','timestamp with time zone','NO','now()'),
        ('actor_user_id','uuid','NO',null),
        ('outcome','text','NO',null),
        ('metadata','jsonb','NO','''{}''::jsonb'),
        ('request_id','text','YES',null)
    ) as required(column_name, data_type, is_nullable, column_default)
    left join information_schema.columns c
      on c.table_schema = 'public'
     and c.table_name = 'audit_logs'
     and c.column_name = required.column_name
     and c.data_type = required.data_type
     and c.is_nullable = required.is_nullable
     and c.column_default is not distinct from required.column_default
    where c.column_name is null
  ) then
    raise exception 'audit_logs column contract is incomplete';
  end if;

  if not exists (
    select 1 from pg_constraint c
    where c.conrelid = v_audit_rel
      and c.contype = 'p'
      and pg_get_constraintdef(c.oid, true) = 'PRIMARY KEY (id)'
  ) then
    raise exception 'audit_logs primary key is incompatible';
  end if;

  if (
    select count(*) from pg_constraint c
    where c.conrelid = v_audit_rel and c.contype = 'c'
  ) <> 7
    or not exists (
      select 1 from pg_constraint c
      where c.conrelid = v_audit_rel and c.contype = 'c'
        and c.conname = 'audit_logs_actor_bounds_check'
        and pg_get_constraintdef(c.oid, true) ~ 'length\(actor\).*3.*320'
    )
    or not exists (
      select 1 from pg_constraint c
      where c.conrelid = v_audit_rel and c.contype = 'c'
        and c.conname = 'audit_logs_action_bounds_check'
        and pg_get_constraintdef(c.oid, true) ~ 'length\(action\).*1.*96'
        and pg_get_constraintdef(c.oid, true) ~ 'a-z0-9'
    )
    or not exists (
      select 1 from pg_constraint c
      where c.conrelid = v_audit_rel and c.contype = 'c'
        and c.conname = 'audit_logs_entity_type_bounds_check'
        and pg_get_constraintdef(c.oid, true) ~ 'entity_type IS NULL'
        and pg_get_constraintdef(c.oid, true) ~ '64'
    )
    or not exists (
      select 1 from pg_constraint c
      where c.conrelid = v_audit_rel and c.contype = 'c'
        and c.conname = 'audit_logs_entity_id_bounds_check'
        and pg_get_constraintdef(c.oid, true) ~ 'entity_id IS NULL'
        and pg_get_constraintdef(c.oid, true) ~ '160'
    )
    or not exists (
      select 1 from pg_constraint c
      where c.conrelid = v_audit_rel and c.contype = 'c'
        and c.conname = 'audit_logs_outcome_check'
        and pg_get_constraintdef(c.oid, true) ~ 'attempt'
        and pg_get_constraintdef(c.oid, true) ~ 'success'
        and pg_get_constraintdef(c.oid, true) ~ 'failure'
    )
    or not exists (
      select 1 from pg_constraint c
      where c.conrelid = v_audit_rel and c.contype = 'c'
        and c.conname = 'audit_logs_metadata_bounds_check'
        and pg_get_constraintdef(c.oid, true) ~ 'jsonb_typeof\(metadata\)'
        and pg_get_constraintdef(c.oid, true) ~ '4096'
    )
    or not exists (
      select 1 from pg_constraint c
      where c.conrelid = v_audit_rel and c.contype = 'c'
        and c.conname = 'audit_logs_request_id_bounds_check'
        and pg_get_constraintdef(c.oid, true) ~ 'request_id IS NULL'
        and pg_get_constraintdef(c.oid, true) ~ '128'
    ) then
    raise exception 'audit_logs CHECK contract is incompatible';
  end if;

  if not exists (
    select 1 from pg_class r where r.oid = v_audit_rel and r.relrowsecurity
  ) then
    raise exception 'audit_logs RLS is not enabled';
  end if;

  if has_table_privilege('anon', v_audit_rel, 'SELECT')
    or has_table_privilege('anon', v_audit_rel, 'INSERT')
    or has_table_privilege('anon', v_audit_rel, 'UPDATE')
    or has_table_privilege('anon', v_audit_rel, 'DELETE')
    or has_table_privilege('authenticated', v_audit_rel, 'SELECT')
    or has_table_privilege('authenticated', v_audit_rel, 'INSERT')
    or has_table_privilege('authenticated', v_audit_rel, 'UPDATE')
    or has_table_privilege('authenticated', v_audit_rel, 'DELETE')
    or not has_table_privilege('service_role', v_audit_rel, 'SELECT')
    or has_table_privilege('service_role', v_audit_rel, 'INSERT')
    or has_table_privilege('service_role', v_audit_rel, 'UPDATE')
    or has_table_privilege('service_role', v_audit_rel, 'DELETE')
    or has_table_privilege('service_role', v_audit_rel, 'TRUNCATE')
    or has_table_privilege('service_role', v_audit_rel, 'REFERENCES')
    or has_table_privilege('service_role', v_audit_rel, 'TRIGGER') then
    raise exception 'audit_logs privilege contract is incompatible';
  end if;

  if v_audit_fn is null then
    raise exception 'append_admin_audit_event is missing';
  end if;

  if not exists (
    select 1 from pg_proc p join pg_language l on l.oid = p.prolang
    where p.oid = v_audit_fn
      and pg_get_function_identity_arguments(p.oid) =
        'p_actor_user_id uuid, p_actor text, p_action text, p_entity_type text, p_entity_id text, p_outcome text, p_metadata jsonb, p_request_id text'
      and pg_get_function_result(p.oid) = 'uuid'
      and l.lanname = 'plpgsql'
  ) then
    raise exception 'append_admin_audit_event signature/return contract is incompatible';
  end if;

  if not exists (
    select 1 from pg_proc p
    where p.oid = v_audit_fn
      and p.prosecdef
      and p.proconfig = array['search_path=pg_catalog, public']::text[]
      and pg_get_userbyid(p.proowner) = 'postgres'
  ) then
    raise exception 'append_admin_audit_event security-definer/search_path/owner contract is incompatible';
  end if;

  if has_function_privilege('anon', v_audit_fn, 'EXECUTE')
    or has_function_privilege('authenticated', v_audit_fn, 'EXECUTE')
    or not has_function_privilege('service_role', v_audit_fn, 'EXECUTE') then
    raise exception 'append_admin_audit_event EXECUTE grants are incompatible';
  end if;

  select regexp_replace(lower(p.prosrc), '[[:space:]]+', ' ', 'g')
    into v_audit_src
  from pg_proc p where p.oid = v_audit_fn;

  if position('lower(btrim(coalesce(p_actor' in v_audit_src) = 0
    or position('lower(btrim(coalesce(p_action' in v_audit_src) = 0
    or position('invalid_actor_user_id' in v_audit_src) = 0
    or position('invalid_actor' in v_audit_src) = 0
    or position('invalid_action' in v_audit_src) = 0
    or position('invalid_entity_type' in v_audit_src) = 0
    or position('invalid_entity_id' in v_audit_src) = 0
    or position('invalid_outcome' in v_audit_src) = 0
    or position('invalid_metadata' in v_audit_src) = 0
    or position('metadata_too_large' in v_audit_src) = 0
    or position('invalid_request_id' in v_audit_src) = 0
    or position('insert ' || 'into public.audit_logs' in v_audit_src) = 0
    or position('returning id into v_id' in v_audit_src) = 0
    or position('return v_id' in v_audit_src) = 0 then
    raise exception 'append_admin_audit_event implementation semantics are incompatible';
  end if;
end
$$;

select 'PASS: Production Supabase security schema contract is satisfied' as result;
