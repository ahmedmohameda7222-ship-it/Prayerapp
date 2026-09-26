-- PLAN 6 EXPLICIT DEFERRED CUTOVER — NO DESTRUCTIVE SQL.
--
-- This migration existed only on the unmerged feature branch and had never
-- been applied to the real Prayerapp production project when the independent
-- Planner identified the merge-safety blocker. The previous draft contained
-- DROP COLUMN statements for the five legacy absolute-Iqama fields.
--
-- Plan 6 does NOT authorize that destructive cutover. Production main still
-- reads those field names until the feature branch is merged, so even a
-- temporary rename/drop window would be unsafe.
--
-- Keep this migration version as an explicit, documented no-op so repository
-- migration order remains deterministic. A later explicitly approved Plan 7
-- (or later) must introduce a NEW migration version if destructive removal is
-- authorized. Do not put DROP COLUMN statements back into this Plan 6 file.
do $$
begin
  perform 1;
end
$$;
