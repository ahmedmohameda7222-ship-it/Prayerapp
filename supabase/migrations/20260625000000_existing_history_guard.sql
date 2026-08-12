-- Safety guard for the reconstructed clean-bootstrap baseline.
--
-- A fresh database has no public.prayer_times table, so clean migration replay proceeds.
-- An already-initialized database must NOT execute the reconstructed baseline after later
-- migrations have already run. Its migration history must be reconciled explicitly with
-- `supabase migration repair` after verifying the existing schema/project first.

do $$
begin
  if to_regclass('public.prayer_times') is not null then
    raise exception using
      message = 'Existing Prayerapp schema detected. Do not execute the reconstructed initial baseline on this database.',
      hint = 'Verify the exact project and existing migration/schema state, then mark versions 20260625000000 and 20260626000000 applied with supabase migration repair before dry-running forward migrations.';
  end if;
end
$$;
