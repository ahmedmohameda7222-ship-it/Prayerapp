create or replace function public.register_push_subscription(
  p_endpoint text,
  p_p256dh text,
  p_auth text,
  p_browser_id uuid,
  p_user_id uuid,
  p_locale text,
  p_user_agent text,
  p_platform text,
  p_max_account_subscriptions integer
)
returns text
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_existing_id uuid;
  v_existing_browser_id uuid;
  v_existing_user_id uuid;
  v_existing_enabled boolean;
  v_existing boolean := false;
  v_enabled_count integer := 0;
  v_now timestamptz := clock_timestamp();
begin
  if p_endpoint is null or length(p_endpoint) = 0
    or p_p256dh is null or p_auth is null or p_browser_id is null
    or p_locale is null then
    raise exception 'invalid push subscription registration'
      using errcode = '22023';
  end if;

  if p_max_account_subscriptions < 1 or p_max_account_subscriptions > 100 then
    raise exception 'invalid push account subscription limit'
      using errcode = '22023';
  end if;

  -- Serialize ownership checks for the same endpoint before inspecting or writing it.
  perform pg_advisory_xact_lock(
    hashtextextended('push-endpoint:' || p_endpoint, 0)
  );

  -- Serialize every count-and-write sequence for one authenticated account.
  -- Requests for different accounts can still proceed independently.
  if p_user_id is not null then
    perform pg_advisory_xact_lock(
      hashtextextended('push-user:' || p_user_id::text, 0)
    );
  end if;

  select id, browser_id, user_id, enabled
    into v_existing_id, v_existing_browser_id, v_existing_user_id, v_existing_enabled
  from public.push_subscriptions
  where endpoint = p_endpoint
  for update;

  v_existing := found;

  if v_existing and v_existing_browser_id <> p_browser_id then
    return 'ownership_mismatch';
  end if;

  if p_user_id is not null
    and not (
      v_existing
      and v_existing_enabled = true
      and v_existing_user_id is not distinct from p_user_id
    ) then
    select count(*)
      into v_enabled_count
    from public.push_subscriptions
    where enabled = true
      and user_id = p_user_id;

    if v_enabled_count >= p_max_account_subscriptions then
      return 'account_limit_reached';
    end if;
  end if;

  insert into public.push_subscriptions (
    endpoint,
    p256dh,
    auth,
    browser_id,
    user_id,
    enabled,
    locale,
    user_agent,
    platform,
    updated_at,
    last_seen_at
  ) values (
    p_endpoint,
    p_p256dh,
    p_auth,
    p_browser_id,
    p_user_id,
    true,
    p_locale,
    p_user_agent,
    p_platform,
    v_now,
    v_now
  )
  on conflict (endpoint) do update set
    p256dh = excluded.p256dh,
    auth = excluded.auth,
    browser_id = excluded.browser_id,
    user_id = excluded.user_id,
    enabled = true,
    locale = excluded.locale,
    user_agent = excluded.user_agent,
    platform = excluded.platform,
    updated_at = excluded.updated_at,
    last_seen_at = excluded.last_seen_at;

  return 'saved';
end;
$$;

revoke all on function public.register_push_subscription(
  text, text, text, uuid, uuid, text, text, text, integer
) from public, anon, authenticated;

grant execute on function public.register_push_subscription(
  text, text, text, uuid, uuid, text, text, text, integer
) to service_role;
