-- Durable, server-only abuse controls for public API boundaries.
-- Raw client IPs/tokens are never persisted; callers provide a SHA-256 identity hash.

create table if not exists public.security_rate_limits (
  scope text not null check (scope ~ '^[a-z0-9][a-z0-9_-]{0,63}$'),
  identity_hash text not null check (identity_hash ~ '^[0-9a-f]{64}$'),
  window_started_at timestamptz not null,
  request_count integer not null check (request_count > 0),
  updated_at timestamptz not null default now(),
  primary key (scope, identity_hash)
);

create index if not exists security_rate_limits_updated_at_idx
  on public.security_rate_limits(updated_at);

alter table public.security_rate_limits enable row level security;

revoke all on table public.security_rate_limits from public, anon, authenticated;
revoke all on table public.security_rate_limits from service_role;

create or replace function public.consume_security_rate_limit(
  p_scope text,
  p_identity_hash text,
  p_limit integer,
  p_window_seconds integer
)
returns table (
  allowed boolean,
  remaining integer,
  retry_after_seconds integer
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_window_started_at timestamptz;
  v_request_count integer;
begin
  if p_scope is null
    or p_scope !~ '^[a-z0-9][a-z0-9_-]{0,63}$'
    or p_identity_hash is null
    or p_identity_hash !~ '^[0-9a-f]{64}$'
    or p_limit < 1
    or p_limit > 10000
    or p_window_seconds < 1
    or p_window_seconds > 3600 then
    raise exception 'invalid rate limit parameters' using errcode = '22023';
  end if;

  insert into public.security_rate_limits as rl (
    scope,
    identity_hash,
    window_started_at,
    request_count,
    updated_at
  )
  values (
    p_scope,
    p_identity_hash,
    v_now,
    1,
    v_now
  )
  on conflict (scope, identity_hash) do update
  set
    window_started_at = case
      when rl.window_started_at + make_interval(secs => p_window_seconds) <= v_now then v_now
      else rl.window_started_at
    end,
    request_count = case
      when rl.window_started_at + make_interval(secs => p_window_seconds) <= v_now then 1
      else rl.request_count + 1
    end,
    updated_at = v_now
  returning rl.window_started_at, rl.request_count
  into v_window_started_at, v_request_count;

  return query
  select
    v_request_count <= p_limit,
    greatest(p_limit - v_request_count, 0),
    case
      when v_request_count <= p_limit then 0
      else greatest(
        ceil(extract(epoch from (
          v_window_started_at + make_interval(secs => p_window_seconds) - v_now
        )))::integer,
        1
      )
    end;
end;
$$;

revoke all on function public.consume_security_rate_limit(text, text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.consume_security_rate_limit(text, text, integer, integer)
  to service_role;

-- Bound retention independently of request traffic so attackers cannot turn cleanup
-- into an expensive per-request operation. Existing migrations already require pg_cron.
do $$
declare
  existing_job_id bigint;
begin
  select jobid
  into existing_job_id
  from cron.job
  where jobname = 'security-rate-limits-cleanup-hourly'
  limit 1;

  if existing_job_id is not null then
    perform cron.unschedule(existing_job_id);
  end if;
end
$$;

select cron.schedule(
  'security-rate-limits-cleanup-hourly',
  '17 * * * *',
  $cron$
    delete from public.security_rate_limits
    where updated_at < now() - interval '6 hours';
  $cron$
);
