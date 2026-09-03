-- Durable, append-only application-level admin audit trail.
-- Existing audit rows are never rewritten into fabricated actor/outcome data.

do $$
declare
  v_rows bigint;
  v_created_nullable text;
begin
  if to_regclass('public.audit_logs') is null then
    raise exception 'audit_logs must exist before admin audit hardening';
  end if;

  select count(*) into v_rows from public.audit_logs;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'audit_logs' and column_name = 'actor_user_id'
  ) and v_rows <> 0 then
    raise exception 'cannot add actor_user_id to non-empty audit_logs without truthful historical actor evidence';
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'audit_logs' and column_name = 'outcome'
  ) and v_rows <> 0 then
    raise exception 'cannot add outcome to non-empty audit_logs without truthful historical outcome evidence';
  end if;

  select is_nullable into v_created_nullable
  from information_schema.columns
  where table_schema = 'public' and table_name = 'audit_logs' and column_name = 'created_at';

  if v_created_nullable is null then
    raise exception 'audit_logs.created_at is missing';
  end if;
  if v_created_nullable = 'YES' and exists (select 1 from public.audit_logs where created_at is null) then
    raise exception 'audit_logs.created_at contains null historical rows';
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'audit_logs' and column_name = 'actor_user_id'
      and (data_type <> 'uuid' or is_nullable <> 'NO')
  ) then
    raise exception 'incompatible pre-existing audit_logs.actor_user_id';
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'audit_logs' and column_name = 'outcome'
      and (data_type <> 'text' or is_nullable <> 'NO')
  ) then
    raise exception 'incompatible pre-existing audit_logs.outcome';
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'audit_logs' and column_name = 'metadata'
      and (data_type <> 'jsonb' or is_nullable <> 'NO' or column_default <> '''{}''::jsonb')
  ) then
    raise exception 'incompatible pre-existing audit_logs.metadata';
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'audit_logs' and column_name = 'request_id'
      and data_type <> 'text'
  ) then
    raise exception 'incompatible pre-existing audit_logs.request_id';
  end if;
end
$$;

alter table public.audit_logs
  add column if not exists actor_user_id uuid not null,
  add column if not exists outcome text not null,
  add column if not exists metadata jsonb not null default '{}'::jsonb,
  add column if not exists request_id text;

alter table public.audit_logs alter column created_at set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint c
    where c.conrelid = 'public.audit_logs'::regclass
      and c.conname = 'audit_logs_actor_bounds_check'
  ) then
    alter table public.audit_logs
      add constraint audit_logs_actor_bounds_check
      check (length(actor) between 3 and 320);
  end if;

  if not exists (
    select 1 from pg_constraint c
    where c.conrelid = 'public.audit_logs'::regclass
      and c.conname = 'audit_logs_action_bounds_check'
  ) then
    alter table public.audit_logs
      add constraint audit_logs_action_bounds_check
      check (length(action) between 1 and 96 and action ~ '^[a-z0-9][a-z0-9._:-]{0,95}$');
  end if;

  if not exists (
    select 1 from pg_constraint c
    where c.conrelid = 'public.audit_logs'::regclass
      and c.conname = 'audit_logs_entity_type_bounds_check'
  ) then
    alter table public.audit_logs
      add constraint audit_logs_entity_type_bounds_check
      check (entity_type is null or (length(entity_type) between 1 and 64 and entity_type ~ '^[a-z0-9][a-z0-9._:-]{0,63}$'));
  end if;

  if not exists (
    select 1 from pg_constraint c
    where c.conrelid = 'public.audit_logs'::regclass
      and c.conname = 'audit_logs_entity_id_bounds_check'
  ) then
    alter table public.audit_logs
      add constraint audit_logs_entity_id_bounds_check
      check (entity_id is null or length(entity_id) between 1 and 160);
  end if;

  if not exists (
    select 1 from pg_constraint c
    where c.conrelid = 'public.audit_logs'::regclass
      and c.conname = 'audit_logs_outcome_check'
  ) then
    alter table public.audit_logs
      add constraint audit_logs_outcome_check
      check (outcome in ('attempt', 'success', 'failure'));
  end if;

  if not exists (
    select 1 from pg_constraint c
    where c.conrelid = 'public.audit_logs'::regclass
      and c.conname = 'audit_logs_metadata_bounds_check'
  ) then
    alter table public.audit_logs
      add constraint audit_logs_metadata_bounds_check
      check (jsonb_typeof(metadata) = 'object' and octet_length(metadata::text) <= 4096);
  end if;

  if not exists (
    select 1 from pg_constraint c
    where c.conrelid = 'public.audit_logs'::regclass
      and c.conname = 'audit_logs_request_id_bounds_check'
  ) then
    alter table public.audit_logs
      add constraint audit_logs_request_id_bounds_check
      check (request_id is null or (length(request_id) between 1 and 128 and request_id ~ '^[A-Za-z0-9._:/-]+$'));
  end if;
end
$$;

alter table public.audit_logs enable row level security;
revoke all on public.audit_logs from public, anon, authenticated, service_role;
grant select on public.audit_logs to service_role;

create or replace function public.append_admin_audit_event(
  p_actor_user_id uuid,
  p_actor text,
  p_action text,
  p_entity_type text,
  p_entity_id text,
  p_outcome text,
  p_metadata jsonb default '{}'::jsonb,
  p_request_id text default null
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_id uuid;
  v_actor text := lower(btrim(coalesce(p_actor, '')));
  v_action text := lower(btrim(coalesce(p_action, '')));
  v_entity_type text := lower(btrim(coalesce(p_entity_type, '')));
  v_entity_id text := nullif(btrim(coalesce(p_entity_id, '')), '');
  v_request_id text := nullif(btrim(coalesce(p_request_id, '')), '');
  v_metadata jsonb := coalesce(p_metadata, '{}'::jsonb);
begin
  if p_actor_user_id is null then
    raise exception 'invalid_actor_user_id';
  end if;
  if length(v_actor) < 3 or length(v_actor) > 320 then
    raise exception 'invalid_actor';
  end if;
  if v_action !~ '^[a-z0-9][a-z0-9._:-]{0,95}$' then
    raise exception 'invalid_action';
  end if;
  if v_entity_type !~ '^[a-z0-9][a-z0-9._:-]{0,63}$' then
    raise exception 'invalid_entity_type';
  end if;
  if v_entity_id is not null and length(v_entity_id) > 160 then
    raise exception 'invalid_entity_id';
  end if;
  if p_outcome not in ('attempt', 'success', 'failure') then
    raise exception 'invalid_outcome';
  end if;
  if jsonb_typeof(v_metadata) <> 'object' then
    raise exception 'invalid_metadata';
  end if;
  if octet_length(v_metadata::text) > 4096 then
    raise exception 'metadata_too_large';
  end if;
  if v_request_id is not null and (
    length(v_request_id) > 128 or v_request_id !~ '^[A-Za-z0-9._:/-]+$'
  ) then
    raise exception 'invalid_request_id';
  end if;

  insert into public.audit_logs (
    actor_user_id,
    actor,
    action,
    entity_type,
    entity_id,
    outcome,
    metadata,
    request_id
  ) values (
    p_actor_user_id,
    v_actor,
    v_action,
    v_entity_type,
    v_entity_id,
    p_outcome,
    v_metadata,
    v_request_id
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.append_admin_audit_event(uuid,text,text,text,text,text,jsonb,text) from public, anon, authenticated;
revoke all on function public.append_admin_audit_event(uuid,text,text,text,text,text,jsonb,text) from service_role;
grant execute on function public.append_admin_audit_event(uuid,text,text,text,text,text,jsonb,text) to service_role;

do $$
declare
  v_fn regprocedure := to_regprocedure('public.append_admin_audit_event(uuid,text,text,text,text,text,jsonb,text)');
begin
  if v_fn is null then
    raise exception 'append_admin_audit_event missing after hardening';
  end if;
  if not exists (
    select 1 from pg_proc p
    where p.oid = v_fn
      and p.prosecdef
      and p.proconfig = array['search_path=pg_catalog, public']::text[]
      and pg_get_userbyid(p.proowner) = 'postgres'
  ) then
    raise exception 'append_admin_audit_event security contract incompatible';
  end if;
  if has_table_privilege('anon', 'public.audit_logs', 'SELECT')
    or has_table_privilege('authenticated', 'public.audit_logs', 'SELECT')
    or has_table_privilege('service_role', 'public.audit_logs', 'INSERT')
    or has_table_privilege('service_role', 'public.audit_logs', 'UPDATE')
    or has_table_privilege('service_role', 'public.audit_logs', 'DELETE')
    or has_table_privilege('service_role', 'public.audit_logs', 'TRUNCATE')
    or not has_table_privilege('service_role', 'public.audit_logs', 'SELECT') then
    raise exception 'audit_logs privilege contract incompatible';
  end if;
  if has_function_privilege('anon', v_fn, 'EXECUTE')
    or has_function_privilege('authenticated', v_fn, 'EXECUTE')
    or not has_function_privilege('service_role', v_fn, 'EXECUTE') then
    raise exception 'append_admin_audit_event execute grants incompatible';
  end if;
end
$$;
