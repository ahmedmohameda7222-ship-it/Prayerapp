-- Plan 6 production convergence: restrict the atomic published prayer snapshot
-- RPC to the server-only service role.
--
-- Supabase default function privileges can grant EXECUTE directly to anon and
-- authenticated. REVOKE FROM public alone does not remove those explicit
-- grants. The root Prayerapp is the only database consumer of this atomic
-- snapshot; browsers and the TV app consume the root public API instead.
revoke all on function public.get_published_prayer_schedule_snapshot(
  date, date, timestamptz, integer, integer
) from public;

revoke execute on function public.get_published_prayer_schedule_snapshot(
  date, date, timestamptz, integer, integer
) from anon, authenticated;

grant execute on function public.get_published_prayer_schedule_snapshot(
  date, date, timestamptz, integer, integer
) to service_role;

do $$
declare
  v_function_oid oid;
begin
  select p.oid
    into v_function_oid
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'get_published_prayer_schedule_snapshot'
    and pg_get_function_identity_arguments(p.oid) =
      'p_from date, p_through date, p_now timestamp with time zone, p_days_before integer, p_days_after integer';

  if v_function_oid is null then
    raise exception 'Plan 6 atomic published prayer snapshot function is missing';
  end if;

  if has_function_privilege('anon', v_function_oid, 'EXECUTE')
     or has_function_privilege('authenticated', v_function_oid, 'EXECUTE')
     or not has_function_privilege('service_role', v_function_oid, 'EXECUTE') then
    raise exception 'Plan 6 atomic prayer snapshot privileges are not service-role-only';
  end if;
end
$$;
